import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getSupabase, getValidGraphToken } from '../_shared/outlook.ts'

serve(async (req) => {
    // Microsoft Graph Webhook Validation (required when creating the subscription)
    const url = new URL(req.url)
    const validationToken = url.searchParams.get('validationToken')

    if (validationToken) {
        // We MUST return the plain text validationToken and a 200 OK
        return new Response(validationToken, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
        })
    }

    try {
        const payload = await req.json()
        const supabase = getSupabase()

        // Process notifications
        if (payload.value && Array.isArray(payload.value)) {
            for (const notification of payload.value) {
                const userId = notification.clientState // We passed staff id here during subscription
                const messageId = notification.resourceData?.id
                const resourceUrl = notification.resource // e.g. Users('...Id...')/Messages('...Id...')

                if (!userId || !messageId) continue;

                try {
                    // 1. Get a valid token for this user
                    const accessToken = await getValidGraphToken(userId)

                    // 2. Fetch the full message details from MS Graph
                    const graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}?$select=subject,body,sender,toRecipients,receivedDateTime,conversationId,hasAttachments`, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    })

                    if (!graphRes.ok) {
                        console.error('Failed to fetch message details for webhook', await graphRes.text())
                        continue;
                    }

                    const message = await graphRes.json()

                    // 3. See if sender or recipient is in our CRM
                    const senderEmail = message.sender?.emailAddress?.address

                    let matchedContactId = null
                    let direction = 'inbound'

                    // Check if sender is a contact
                    if (senderEmail) {
                        const { data: contactMatch } = await supabase
                            .from('contacts')
                            .select('id')
                            .ilike('email', senderEmail)
                            .maybeSingle()

                        if (contactMatch) {
                            matchedContactId = contactMatch.id
                            direction = 'inbound'
                        }
                    }

                    // Check if recipients are contacts (if outbound or we didn't match sender)
                    if (!matchedContactId && message.toRecipients) {
                        for (const recipient of message.toRecipients) {
                            const email = recipient.emailAddress?.address
                            if (!email) continue;

                            const { data: contactMatch } = await supabase
                                .from('contacts')
                                .select('id')
                                .ilike('email', email)
                                .maybeSingle()

                            if (contactMatch) {
                                matchedContactId = contactMatch.id
                                direction = 'outbound'
                                break;
                            }
                        }
                    }

                    // 4. If we found a matching contact, safely save to contact_emails
                    if (matchedContactId) {
                        const recipientsJson = message.toRecipients
                            ? message.toRecipients.map((r: any) => r.emailAddress?.address || '').filter(Boolean)
                            : []

                        await supabase
                            .from('contact_emails')
                            .upsert({
                                contact_id: matchedContactId,
                                user_id: userId,
                                graph_message_id: message.id,
                                conversation_id: message.conversationId,
                                direction: direction,
                                subject: message.subject,
                                body_html: message.body?.content || '',
                                sender_address: senderEmail || '',
                                recipients: recipientsJson,
                                timestamp: message.receivedDateTime || new Date().toISOString(),
                                has_attachments: message.hasAttachments || false
                            }, { onConflict: 'graph_message_id' }) // Prevent duplicates
                    }

                } catch (innerErr) {
                    console.error(`Error processing notification for message ${messageId}:`, innerErr)
                }
            }
        }

        return new Response(JSON.stringify({ status: 'success' }), { status: 202 })
    } catch (err) {
        console.error('Webhook payload error:', err)
        // Microsoft expects a quick 2xx response regardless, otherwise it retries unnecessarily
        return new Response(JSON.stringify({ status: 'error' }), { status: 202 })
    }
})
