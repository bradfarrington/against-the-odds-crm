import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getValidGraphToken } from '../_shared/outlook.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const payload = await req.json()
        const { action, userId, linkedId, linkedType, toRecipients, subject, bodyHtml, messageId, ccRecipients, bccRecipients, eventId, startDateTime, endDateTime, locationStr, isAllDay } = payload

        if (!userId) return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400, headers: corsHeaders })

        const accessToken = await getValidGraphToken(userId)
        let graphRes;

        const addExtension = async (msgId: string, lId: string, lType: string) => {
            try {
                await fetch(`https://graph.microsoft.com/v1.0/me/messages/${msgId}/extensions`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        "@odata.type": "microsoft.graph.openTypeExtension",
                        "extensionName": "org.againsttheodds.crm",
                        "linkedId": lId,
                        "linkedType": lType
                    })
                })
            } catch (e: any) {
                console.error("Extension Error:", e.message)
            }
        }

        const messagePayload = {
            subject,
            body: { contentType: 'HTML', content: bodyHtml },
            toRecipients: toRecipients.map((email: string) => ({ emailAddress: { address: email } })),
            ccRecipients: ccRecipients?.map((email: string) => ({ emailAddress: { address: email } })) || [],
            bccRecipients: bccRecipients?.map((email: string) => ({ emailAddress: { address: email } })) || []
        }

        if (action === 'sendMail') {
            if (linkedId) {
                // Create Draft
                const draftRes = await fetch('https://graph.microsoft.com/v1.0/me/messages', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(messagePayload)
                })
                if (!draftRes.ok) throw new Error(`Draft creation failed: ${await draftRes.text()}`)
                const draft = await draftRes.json()

                // Add Extension
                await addExtension(draft.id, linkedId, linkedType)

                // Send
                graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${draft.id}/send`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })
            } else {
                graphRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: messagePayload })
                })
            }
        } else if (['reply', 'replyAll', 'forward'].includes(action)) {
            // Reply/Forward Logic
            const endpoint = `https://graph.microsoft.com/v1.0/me/messages/${messageId}/${action === 'forward' ? 'createForward' : action === 'replyAll' ? 'createReplyAll' : 'createReply'}`
            const createRes = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
            })
            if (!createRes.ok) throw new Error(`Failed to create ${action}: ${await createRes.text()}`)
            const draft = await createRes.json()

            // Update draft body/recipients if needed (e.g. for forward)
            if (action === 'forward' || bodyHtml) {
                await fetch(`https://graph.microsoft.com/v1.0/me/messages/${draft.id}`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        toRecipients: messagePayload.toRecipients,
                        body: messagePayload.body
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
                subject,
                body: { contentType: 'HTML', content: bodyHtml || '' },
                start: { dateTime: startDateTime, timeZone: 'UTC' },
                end: { dateTime: endDateTime, timeZone: 'UTC' },
                location: { displayName: locationStr || '' },
                isAllDay: isAllDay || false,
                attendees: toRecipients?.map((email: string) => ({ emailAddress: { address: email }, type: 'required' })) || []
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
        }

        if (graphRes && !graphRes.ok) {
            const errText = await graphRes.text()
            return new Response(JSON.stringify({ error: errText }), { status: graphRes.status, headers: corsHeaders })
        }

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
    }
})
