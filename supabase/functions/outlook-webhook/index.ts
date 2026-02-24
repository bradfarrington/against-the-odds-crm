import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getSupabase, getValidGraphToken } from '../_shared/outlook.ts'

serve(async (req: Request) => {
    const url = new URL(req.url)
    const validationToken = url.searchParams.get('validationToken')

    if (validationToken) {
        return new Response(validationToken, { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    const supabase = getSupabase()

    try {
        const payload = await req.json()
        const notifications = payload.value || []

        for (const notification of notifications) {
            const userId = notification.clientState
            const messageId = notification.resourceData?.id
            if (!userId || !messageId) continue;

            const resource = notification.resource || ''
            const isEvent = resource.toLowerCase().includes('events')
            const isDeleted = notification.changeType === 'deleted'

            try {
                const accessToken = await getValidGraphToken(userId)

                if (isEvent) {
                    if (isDeleted) {
                        await supabase.from('appointments').delete().eq('graph_event_id', messageId)
                        continue;
                    }

                    const graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/events/${messageId}?$select=subject,bodyPreview,start,end,location,attendees,isAllDay,id`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    })
                    if (!graphRes.ok) continue;
                    const event = await graphRes.json()

                    const attendees = event.attendees?.map((a: any) => a.emailAddress?.address) || []

                    let matchedContactId = null
                    let matchedSeekerId = null

                    for (const email of attendees) {
                        if (!email) continue;
                        const { data: seeker } = await supabase.from('recovery_seekers').select('id').ilike('email', email).maybeSingle()
                        if (seeker) {
                            matchedSeekerId = seeker.id
                            break
                        }
                        const { data: contact } = await supabase.from('contacts').select('id').ilike('email', email).maybeSingle()
                        if (contact) {
                            matchedContactId = contact.id
                            break
                        }
                    }

                    await supabase.from('appointments').upsert({
                        title: event.subject || '(No Title)',
                        description: event.bodyPreview || '',
                        start_time: event.start?.dateTime,
                        end_time: event.end?.dateTime,
                        location: event.location?.displayName || '',
                        user_id: userId,
                        contact_id: matchedContactId,
                        recovery_seeker_id: matchedSeekerId,
                        graph_event_id: event.id,
                        is_all_day: event.isAllDay || false,
                        status: 'Scheduled'
                    }, { onConflict: 'graph_event_id' })

                    continue;
                }

                // Skip deleted mails for now
                if (isDeleted) continue;

                // Fetch message details
                const graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}?$select=subject,body,sender,toRecipients,receivedDateTime,conversationId,hasAttachments`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })

                if (!graphRes.ok) continue;

                const message = await graphRes.json()

                // Fetch extensions
                const extRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}/extensions`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })
                const extData = await extRes.json()
                const extensions = extData.value || []
                const crmExtension = extensions.find((ext: any) => ext.id === "org.againsttheodds.crm" || ext.extensionName === "org.againsttheodds.crm")

                let matchedContactId = null
                let matchedSeekerId = null
                let direction = 'inbound'

                if (crmExtension) {
                    if (crmExtension.linkedType === 'seeker') {
                        matchedSeekerId = crmExtension.linkedId
                    } else {
                        matchedContactId = crmExtension.linkedId
                    }
                    const myRes = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${accessToken}` } })
                    const myInfo = await myRes.json()
                    direction = message.sender?.emailAddress?.address?.toLowerCase() === myInfo.mail?.toLowerCase() ? 'outbound' : 'inbound'
                } else {
                    const senderEmail = message.sender?.emailAddress?.address
                    const recipients = message.toRecipients?.map((r: any) => r.emailAddress?.address) || []
                    const allEmails = [senderEmail, ...recipients].filter(Boolean)

                    for (const email of allEmails) {
                        const { data: seeker } = await supabase.from('recovery_seekers').select('id').ilike('email', email!).maybeSingle()
                        if (seeker) {
                            matchedSeekerId = seeker.id
                            direction = email === senderEmail ? 'inbound' : 'outbound'
                            break
                        }
                        const { data: contact } = await supabase.from('contacts').select('id').ilike('email', email!).maybeSingle()
                        if (contact) {
                            matchedContactId = contact.id
                            direction = email === senderEmail ? 'inbound' : 'outbound'
                            break
                        }
                    }
                }

                if (matchedContactId || matchedSeekerId) {
                    await supabase.from('contact_emails').upsert({
                        contact_id: matchedContactId,
                        recovery_seeker_id: matchedSeekerId,
                        user_id: userId,
                        graph_message_id: message.id,
                        conversation_id: message.conversationId,
                        direction,
                        subject: message.subject || '(No Subject)',
                        body_html: message.body?.content || '',
                        sender_address: message.sender?.emailAddress?.address || '',
                        recipients: message.toRecipients?.map((r: any) => r.emailAddress?.address) || [],
                        timestamp: message.receivedDateTime,
                        has_attachments: !!message.hasAttachments
                    }, { onConflict: 'graph_message_id' })
                }
            } catch (innerErr) {
                console.error("Webhook Loop Error:", innerErr)
            }
        }
        return new Response('ok', { status: 200 })
    } catch (err) {
        console.error("Webhook Error:", err)
        return new Response('error', { status: 500 })
    }
})
