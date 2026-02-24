import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getValidGraphToken } from '../_shared/outlook.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json()
        const { action, userId, ...data } = payload

        if (!userId) {
            return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400, headers: corsHeaders })
        }

        // 1. Get a valid token for this user
        let accessToken: string;
        try {
            accessToken = await getValidGraphToken(userId)
        } catch (e) {
            return new Response(JSON.stringify({ error: 'User Outlook account not connected or token invalid.' }), { status: 401, headers: corsHeaders })
        }

        // 2. Perform the requested action
        let graphRes;

        switch (action) {
            case 'sendMail': {
                const { toRecipients, subject, bodyHtml, attachments } = data

                const messagePayload: any = {
                    message: {
                        subject: subject,
                        body: {
                            contentType: 'HTML',
                            content: bodyHtml
                        },
                        toRecipients: toRecipients.map((email: string) => ({
                            emailAddress: { address: email }
                        }))
                    }
                }

                if (attachments && attachments.length > 0) {
                    messagePayload.message.attachments = attachments.map((a: any) => ({
                        "@odata.type": "#microsoft.graph.fileAttachment",
                        name: a.name,
                        contentType: a.contentType,
                        contentBytes: a.contentBytes // base64 encoded
                    }))
                }

                graphRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(messagePayload)
                })
                break;
            }

            case 'reply':
            case 'replyAll': {
                const { messageId, bodyHtml } = data
                const endpoint = action === 'replyAll' ? 'createReplyAll' : 'createReply'

                // 1. Create a draft reply
                const draftRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}/${endpoint}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
                })

                if (!draftRes.ok) {
                    return new Response(JSON.stringify({ error: 'Failed to create reply draft' }), { status: 400, headers: corsHeaders })
                }

                const draft = await draftRes.json()

                // 2. Update draft body
                await fetch(`https://graph.microsoft.com/v1.0/me/messages/${draft.id}`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        body: { contentType: 'HTML', content: bodyHtml }
                    })
                })

                // 3. Send the draft
                graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${draft.id}/send`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })
                break;
            }

            case 'getAttachments': {
                const { messageId } = data
                graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })
                break;
            }

            default:
                return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders })
        }

        if (!graphRes.ok) {
            const errorText = await graphRes.text()
            console.error('Graph API Error:', errorText)
            return new Response(JSON.stringify({ error: 'Microsoft Graph API failed', details: errorText }), { status: graphRes.status, headers: corsHeaders })
        }

        // graphRes from send / reply usually has a 202 Accepted status and no body
        let responseData = { success: true }
        if (action === 'getAttachments') {
            const json = await graphRes.json()
            responseData = json.value
        }

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (err) {
        console.error('API endpoint error:', err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
