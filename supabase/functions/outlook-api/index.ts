import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getSupabase, getValidGraphToken, matchContactOrSeeker, corsHeaders } from '../_shared/outlook.ts'

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const payload = await req.json()
        const {
            action, userId, linkedId, linkedType, toRecipients,
            subject, bodyHtml, messageId, ccRecipients, bccRecipients,
            eventId, startDateTime, endDateTime, locationStr,
            isAllDay, transactionId
        } = payload

        const supabase = getSupabase()

        if (!userId) {
            return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400, headers: corsHeaders })
        }

        const accessToken = await getValidGraphToken(userId)
        let graphRes;

        const addExtension = async (msgId: string, lId: string, lType: string) => {
            try {
                const extRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${msgId}/extensions`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        "@odata.type": "microsoft.graph.openTypeExtension",
                        "extensionName": "org.againsttheodds.crm",
                        "linkedId": lId,
                        "linkedType": lType
                    })
                })
                if (!extRes.ok) {
                    console.error("[outlook-api] Extension Error:", await extRes.text())
                }
            } catch (e: any) {
                console.error("[outlook-api] Extension Exception:", e.message)
            }
        }

        const messagePayload = {
            subject: subject || '(No Subject)',
            body: { contentType: 'HTML', content: bodyHtml || '' },
            toRecipients: (toRecipients || []).map((email: string) => ({ emailAddress: { address: email } })),
            ccRecipients: (ccRecipients || []).map((email: string) => ({ emailAddress: { address: email } })),
            bccRecipients: (bccRecipients || []).map((email: string) => ({ emailAddress: { address: email } }))
        }

        if (action === 'sendMail') {
            if (linkedId) {
                // Create Draft first so we can add an extension (identifies the record in CRM)
                const draftRes = await fetch('https://graph.microsoft.com/v1.0/me/messages', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(messagePayload)
                })
                if (!draftRes.ok) {
                    const errText = await draftRes.text()
                    throw new Error(`Draft creation failed: ${errText}`)
                }
                const draft = await draftRes.json()

                // Add Extension to draft
                await addExtension(draft.id, linkedId, linkedType)

                // Send the draft
                graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${draft.id}/send`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })
            } else {
                // Direct send
                graphRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: messagePayload })
                })
            }
        } else if (['reply', 'replyAll', 'forward'].includes(action)) {
            // Reply/Forward Logic: create draft based on existing message
            const endpoint = `https://graph.microsoft.com/v1.0/me/messages/${messageId}/${action === 'forward' ? 'createForward' : action === 'replyAll' ? 'createReplyAll' : 'createReply'}`
            const createRes = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
            })
            if (!createRes.ok) {
                const errText = await createRes.text()
                throw new Error(`Failed to create ${action}: ${errText}`)
            }
            const draft = await createRes.json()

            // Update draft body/recipients if provided (e.g. for forward or adding notes to reply)
            if (action === 'forward' || bodyHtml) {
                await fetch(`https://graph.microsoft.com/v1.0/me/messages/${draft.id}`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        toRecipients: action === 'forward' ? messagePayload.toRecipients : undefined,
                        body: bodyHtml ? messagePayload.body : undefined
                    })
                })
            }

            if (linkedId) await addExtension(draft.id, linkedId, linkedType)

            graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${draft.id}/send`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
        } else if (action === 'createEvent' || action === 'updateEvent') {
            const eventPayload: any = {
                subject: subject || '(No Title)',
                body: { contentType: 'HTML', content: bodyHtml || '' },
                start: { dateTime: startDateTime, timeZone: 'UTC' },
                end: { dateTime: endDateTime, timeZone: 'UTC' },
                location: { displayName: locationStr || '' },
                isAllDay: isAllDay || false,
                attendees: (toRecipients || []).map((email: string) => ({ emailAddress: { address: email }, type: 'required' })),
                transactionId: transactionId || undefined
            }

            if (linkedId) {
                eventPayload.extensions = [
                    {
                        "@odata.type": "microsoft.graph.openTypeExtension",
                        "extensionName": "org.againsttheodds.crm",
                        "linkedId": linkedId,
                        "linkedType": linkedType
                    }
                ]
            }

            if (action === 'createEvent') {
                graphRes = await fetch('https://graph.microsoft.com/v1.0/me/events', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(eventPayload)
                })
            } else {
                graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(eventPayload)
                })
            }
        } else if (action === 'deleteEvent') {
            graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
        } else if (action === 'getEvents') {
            const now = new Date()
            const oneMonthBack = new Date()
            oneMonthBack.setMonth(now.getMonth() - 1)
            const threeMonthsForward = new Date()
            threeMonthsForward.setMonth(now.getMonth() + 3)

            const startStr = startDateTime || oneMonthBack.toISOString()
            const endStr = endDateTime || threeMonthsForward.toISOString()

            // Fetch events from the user's primary calendar
            let nextLink = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startStr}&endDateTime=${endStr}&$select=subject,bodyPreview,start,end,location,attendees,isAllDay,id,transactionId&$top=100`
            let allOutlookEvents: any[] = []

            while (nextLink) {
                const res = await fetch(nextLink, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })
                if (!res.ok) {
                    const errText = await res.text()
                    throw new Error(`Graph API fetch events error: ${errText}`)
                }
                const data = await res.json()
                allOutlookEvents.push(...(data.value || []))
                nextLink = data['@odata.nextLink']
            }

            console.log(`[outlook-api] Received ${allOutlookEvents.length} events from Graph for user ${userId}`)

            const eventsToUpsert = []
            for (const event of allOutlookEvents) {
                // Skip if it was created by the CRM (has localevent: prefix in transactionId)
                if (event.transactionId?.startsWith('localevent:')) continue;

                let matchedContactId = null
                let matchedSeekerId = null
                const attendees = event.attendees?.map((a: any) => a.emailAddress?.address) || []

                if (attendees.length > 0) {
                    const match = await matchContactOrSeeker(supabase, attendees)
                    matchedContactId = match.contactId
                    matchedSeekerId = match.seekerId
                }

                eventsToUpsert.push({
                    title: event.subject || '(No Title)',
                    description: event.bodyPreview || '',
                    start_time: event.start?.dateTime,
                    end_time: event.end?.dateTime,
                    location: event.location?.displayName || '',
                    user_id: userId,
                    contact_id: matchedContactId,
                    recovery_seeker_id: matchedSeekerId,
                    graph_event_id: event.id,
                    is_all_day: event.isAllDay || false
                })
            }

            // Batch upsert into Supabase for performance
            const chunkSize = 50
            for (let i = 0; i < eventsToUpsert.length; i += chunkSize) {
                const chunk = eventsToUpsert.slice(i, i + chunkSize)
                const { error: upsertErr } = await supabase.from('appointments').upsert(chunk, { onConflict: 'graph_event_id' })
                if (upsertErr) console.error(`[outlook-api] Error batch upserting events chunk:`, upsertErr)
            }

            return new Response(JSON.stringify({ success: true, count: allOutlookEvents.length }), { status: 200, headers: corsHeaders })
        }

        if (graphRes && !graphRes.ok) {
            const errText = await graphRes.text()
            console.error(`[outlook-api] Graph API error (${action}):`, errText)
            return new Response(JSON.stringify({ error: errText, action }), { status: graphRes.status, headers: corsHeaders })
        }

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })

    } catch (err: any) {
        console.error(`[outlook-api] Server error:`, err.message)
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
    }
})

