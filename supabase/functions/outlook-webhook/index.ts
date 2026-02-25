import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getSupabase, getValidGraphToken, matchContactOrSeeker } from '../_shared/outlook.ts'

serve(async (req: Request) => {
    const url = new URL(req.url)
    const validationToken = url.searchParams.get('validationToken')

    // Microsoft sends a validation token when creating a subscription
    if (validationToken) {
        return new Response(validationToken, { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }

    const supabase = getSupabase()

    try {
        const payload = await req.json()
        const notifications = payload.value || []

        for (const notification of notifications) {
            const userId = notification.clientState
            const resourceId = notification.resourceData?.id
            if (!userId || !resourceId) continue;

            const resource = notification.resource || ''
            const isEvent = resource.toLowerCase().includes('events')
            const isDeleted = notification.changeType === 'deleted'

            try {
                const accessToken = await getValidGraphToken(userId)

                if (isEvent) {
                    if (isDeleted) {
                        await supabase.from('appointments').delete().eq('graph_event_id', resourceId)
                        continue;
                    }

                    const graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/events/${resourceId}?$select=subject,bodyPreview,start,end,location,attendees,isAllDay,id`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    })
                    if (!graphRes.ok) {
                        console.warn(`[outlook-webhook] Failed to fetch event ${resourceId}:`, await graphRes.text())
                        continue;
                    }
                    const event = await graphRes.json()

                    const attendees = event.attendees?.map((a: any) => a.emailAddress?.address) || []
                    const { contactId: matchedContactId, seekerId: matchedSeekerId } = await matchContactOrSeeker(supabase, attendees)

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

                // If not an event, it's a message
                if (isDeleted) {
                    // We don't necessarily delete emails from CRM history when deleted in Outlook
                    // but we could if that's desired. For now, skip.
                    continue;
                }

                // Fetch message details
                const graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${resourceId}?$select=subject,body,sender,toRecipients,receivedDateTime,conversationId,hasAttachments`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })

                if (!graphRes.ok) {
                    console.warn(`[outlook-webhook] Failed to fetch message ${resourceId}:`, await graphRes.text())
                    continue;
                }

                const message = await graphRes.json()

                // Fetch extensions to see if this message was created via CRM
                const extRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${resourceId}/extensions`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })
                const extData = await extRes.json()
                const extensions = extData.value || []
                const crmExtension = extensions.find((ext: any) => ext.id === "org.againsttheodds.crm" || ext.extensionName === "org.againsttheodds.crm")

                let matchedContactId = null
                let matchedSeekerId = null
                let direction = 'inbound'

                if (crmExtension) {
                    // Explicitly linked via CRM
                    if (crmExtension.linkedType === 'seeker') {
                        matchedSeekerId = crmExtension.linkedId
                    } else {
                        matchedContactId = crmExtension.linkedId
                    }

                    // Determine direction by checking if sender is the connected user
                    const myRes = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${accessToken}` } })
                    const myInfo = await myRes.json()
                    direction = message.sender?.emailAddress?.address?.toLowerCase() === myInfo.mail?.toLowerCase() ? 'outbound' : 'inbound'
                } else {
                    // Automatic linking by email matching
                    const senderEmail = message.sender?.emailAddress?.address
                    const recipients = message.toRecipients?.map((r: any) => r.emailAddress?.address) || []
                    const allEmails = [senderEmail, ...recipients].filter(Boolean)

                    const match = await matchContactOrSeeker(supabase, allEmails)
                    matchedContactId = match.contactId
                    matchedSeekerId = match.seekerId

                    if (matchedContactId || matchedSeekerId) {
                        // Determine direction: if sender is one of the CRM records, it's inbound
                        // This logic is slightly different from above: if WE (CRM User) am NOT the sender, it's inbound.
                        const myRes = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${accessToken}` } })
                        const myInfo = await myRes.json()
                        direction = message.sender?.emailAddress?.address?.toLowerCase() === myInfo.mail?.toLowerCase() ? 'outbound' : 'inbound'
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
            } catch (innerErr: any) {
                console.error(`[outlook-webhook] Loop Error for resource ${resourceId}:`, innerErr.message)
            }
        }
        return new Response('ok', { status: 200 })
    } catch (err: any) {
        console.error("[outlook-webhook] Webhook Global Error:", err.message)
        return new Response('error', { status: 500 })
    }
})

