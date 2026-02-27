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
            isAllDay, transactionId, calendarId, attachments
        } = payload

        const supabase = getSupabase()

        if (!userId) {
            return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400, headers: corsHeaders })
        }

        // Handle syncCalendars action
        if (action === 'syncCalendars') {
            const accessToken = await getValidGraphToken(userId)

            // Fetch the authenticated user's email to identify owned vs shared calendars
            const meRes = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            let userEmail = ''
            if (meRes.ok) {
                const meData = await meRes.json()
                userEmail = (meData.mail || meData.userPrincipalName || '').toLowerCase()
            }

            const calResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendars?$select=id,name,color,isDefaultCalendar,owner', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            if (!calResponse.ok) {
                const errText = await calResponse.text()
                throw new Error(`Failed to fetch calendars: ${errText}`)
            }
            const calData = await calResponse.json()
            const microsoftColorMap: Record<string, string> = {
                auto: '#0078D4',
                lightBlue: '#0078D4',
                lightGreen: '#498205',
                lightOrange: '#DA3B01',
                lightGray: '#69797E',
                lightYellow: '#986F0B',
                lightTeal: '#038387',
                lightPink: '#E3008C',
                lightBrown: '#8E562E',
                lightRed: '#D13438',
                maxColor: '#8764B8',
                lightCyan: '#0099BC',
                lightPurple: '#8764B8'
            }
            // Filter out shared/delegated calendars — only keep calendars owned by this user
            const ownedCals = (calData.value || []).filter((cal: any) => {
                const ownerEmail = (cal.owner?.address || '').toLowerCase()
                // Keep if no owner info (shouldn't happen), or owner matches user
                return !ownerEmail || !userEmail || ownerEmail === userEmail
            })
            const calendarsToUpsert = ownedCals.map((cal: any) => ({
                user_id: userId,
                graph_calendar_id: cal.id,
                name: cal.name,
                color: microsoftColorMap[cal.color] || '#0078d4',
                is_default: cal.isDefaultCalendar === true,
                updated_at: new Date().toISOString()
            }))
            if (calendarsToUpsert.length > 0) {
                const { error: calErr } = await supabase.from('user_calendars').upsert(calendarsToUpsert, { onConflict: 'user_id,graph_calendar_id' })
                if (calErr) throw new Error(`Failed to save calendars: ${calErr.message}`)
            }
            // Clean up any previously-synced shared calendars that are no longer in the owned list
            const ownedCalIds = ownedCals.map((cal: any) => cal.id)
            if (ownedCalIds.length > 0) {
                await supabase.from('user_calendars')
                    .delete()
                    .eq('user_id', userId)
                    .not('graph_calendar_id', 'in', `(${ownedCalIds.join(',')})`)
            }
            return new Response(JSON.stringify({ success: true, count: calendarsToUpsert.length }), { status: 200, headers: corsHeaders })
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
            if (linkedId || (attachments && attachments.length > 0)) {
                // Create Draft first so we can add extensions / attachments
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

                // Add Extension to draft (only if linked to a CRM record)
                if (linkedId) {
                    await addExtension(draft.id, linkedId, linkedType)
                }

                // Upload attachments if provided (e.g. invoice PDF)
                if (attachments && attachments.length > 0) {
                    for (const att of attachments) {
                        const attRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${draft.id}/attachments`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                '@odata.type': '#microsoft.graph.fileAttachment',
                                name: att.name || 'attachment',
                                contentType: att.contentType || 'application/octet-stream',
                                contentBytes: att.contentBytes,
                            })
                        })
                        if (!attRes.ok) {
                            console.error('[outlook-api] Attachment upload failed:', await attRes.text())
                        }
                    }
                }

                // Send the draft
                graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${draft.id}/send`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })
            } else {
                // Direct send (no attachments, no linked record)
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
                const createUrl = calendarId
                    ? `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`
                    : 'https://graph.microsoft.com/v1.0/me/events'
                graphRes = await fetch(createUrl, {
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

            // Fetch the authenticated user's email to identify owned vs shared calendars
            let userEmail = ''
            try {
                const meRes = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })
                if (meRes.ok) {
                    const meData = await meRes.json()
                    userEmail = (meData.mail || meData.userPrincipalName || '').toLowerCase()
                }
            } catch (e: any) {
                console.warn(`[outlook-api] Could not fetch user email: ${e.message}`)
            }

            // Sync user's calendar list (keep it fresh on every event sync)
            let ownedCalendarIds: string[] = []
            try {
                const calRes = await fetch('https://graph.microsoft.com/v1.0/me/calendars?$select=id,name,color,isDefaultCalendar,owner', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })
                if (calRes.ok) {
                    const calData = await calRes.json()
                    const microsoftColorMap: Record<string, string> = {
                        auto: '#0078D4',
                        lightBlue: '#0078D4',
                        lightGreen: '#498205',
                        lightOrange: '#DA3B01',
                        lightGray: '#69797E',
                        lightYellow: '#986F0B',
                        lightTeal: '#038387',
                        lightPink: '#E3008C',
                        lightBrown: '#8E562E',
                        lightRed: '#D13438',
                        maxColor: '#8764B8',
                        lightCyan: '#0099BC',
                        lightPurple: '#8764B8'
                    }
                    // Filter out shared/delegated calendars
                    const ownedCals = (calData.value || []).filter((cal: any) => {
                        const ownerEmail = (cal.owner?.address || '').toLowerCase()
                        return !ownerEmail || !userEmail || ownerEmail === userEmail
                    })
                    ownedCalendarIds = ownedCals.map((cal: any) => cal.id)
                    const calsToUpsert = ownedCals.map((cal: any) => ({
                        user_id: userId,
                        graph_calendar_id: cal.id,
                        name: cal.name,
                        color: microsoftColorMap[cal.color] || '#0078d4',
                        is_default: cal.isDefaultCalendar === true,
                        updated_at: new Date().toISOString()
                    }))
                    if (calsToUpsert.length > 0) {
                        await supabase.from('user_calendars').upsert(calsToUpsert, { onConflict: 'user_id,graph_calendar_id' })
                    }
                    // Clean up any previously-synced shared calendars
                    if (ownedCalendarIds.length > 0) {
                        await supabase.from('user_calendars')
                            .delete()
                            .eq('user_id', userId)
                            .not('graph_calendar_id', 'in', `(${ownedCalendarIds.join(',')})`)
                    }
                }
            } catch (calSyncErr: any) {
                console.warn(`[outlook-api] Calendar list sync skipped: ${calSyncErr.message}`)
            }

            // Fetch events per-calendar to ensure correct graph_calendar_id tagging
            // (calendarView merges all calendars and can lose calendar context)
            let allOutlookEvents: any[] = []
            const calendarsToFetch = ownedCalendarIds.length > 0 ? ownedCalendarIds : ['default']

            for (const calId of calendarsToFetch) {
                const basePath = calId === 'default'
                    ? `https://graph.microsoft.com/v1.0/me/calendarView`
                    : `https://graph.microsoft.com/v1.0/me/calendars/${calId}/calendarView`
                let nextLink: string | null = `${basePath}?startDateTime=${startStr}&endDateTime=${endStr}&$select=subject,body,bodyPreview,start,end,location,attendees,isAllDay,id,transactionId,onlineMeetingUrl,organizer,responseStatus,onlineMeeting&$top=100`

                while (nextLink) {
                    const res = await fetch(nextLink, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    })
                    if (!res.ok) {
                        const errText = await res.text()
                        console.error(`[outlook-api] Error fetching events for calendar ${calId}: ${errText}`)
                        break // Skip this calendar but continue with others
                    }
                    const data = await res.json()
                    // Tag each event with its calendar ID
                    const events = (data.value || []).map((ev: any) => ({ ...ev, _calendarId: calId === 'default' ? null : calId }))
                    allOutlookEvents.push(...events)
                    nextLink = data['@odata.nextLink'] || null
                }
            }

            console.log(`[outlook-api] Received ${allOutlookEvents.length} events from ${calendarsToFetch.length} calendar(s) for user ${userId}`)

            const eventsToUpsert = []
            for (const event of allOutlookEvents) {
                // Skip if it was created by the CRM (has localevent: prefix in transactionId)
                if (event.transactionId?.startsWith('localevent:')) continue;

                let matchedContactId = null
                let matchedSeekerId = null
                const emailsToMatch = event.attendees?.map((a: any) => a.emailAddress?.address) || []

                if (emailsToMatch.length > 0) {
                    const match = await matchContactOrSeeker(supabase, emailsToMatch)
                    matchedContactId = match.contactId
                    matchedSeekerId = match.seekerId
                }

                const isAllDay = event.isAllDay || false
                let startTime = event.start?.dateTime
                let endTime = event.end?.dateTime
                if (isAllDay && startTime) {
                    // Store as YYYY-MM-DD for all-day events (no time component needed)
                    startTime = startTime.split('T')[0]
                    if (endTime) {
                        // Graph end is exclusive (day after last day), subtract 1 for inclusive end
                        const exclusiveEnd = new Date(endTime)
                        exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() - 1)
                        endTime = exclusiveEnd.toISOString().split('T')[0]
                    } else {
                        endTime = startTime
                    }
                }

                // Robust Join Link Detection
                let meetingUrl = event.onlineMeetingUrl || event.onlineMeeting?.joinUrl || null

                // Fallback: search body for Teams/Zoom/Join links if not explicitly in metadata
                if (!meetingUrl && event.body?.content) {
                    const bodyText = event.body.content
                    // Look for common meeting patterns (Teams, Zoom, Google Meet)
                    const patterns = [
                        /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^"\s<>]+/i,
                        /https:\/\/[a-z0-9]+\.zoom\.us\/j\/[^"\s<>]+/i,
                        /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i
                    ]
                    for (const pattern of patterns) {
                        const match = bodyText.match(pattern)
                        if (match) {
                            meetingUrl = match[0]
                            break
                        }
                    }
                }

                eventsToUpsert.push({
                    title: event.subject || '(No Title)',
                    description: event.bodyPreview || '',
                    start_time: startTime,
                    end_time: endTime,
                    location: event.location?.displayName || '',
                    user_id: userId,
                    contact_id: matchedContactId,
                    recovery_seeker_id: matchedSeekerId,
                    graph_event_id: event.id,
                    graph_calendar_id: event._calendarId ?? event.calendar?.id ?? null,
                    is_all_day: isAllDay,
                    online_meeting_url: meetingUrl,
                    attendees: event.attendees || [],
                    organizer: event.organizer || null,
                    response_status: event.responseStatus || null
                })
            }

            // Batch upsert into Supabase for performance
            const chunkSize = 50
            for (let i = 0; i < eventsToUpsert.length; i += chunkSize) {
                const chunk = eventsToUpsert.slice(i, i + chunkSize)
                const { error: upsertErr } = await supabase.from('appointments').upsert(chunk, { onConflict: 'graph_event_id' })
                if (upsertErr) console.error(`[outlook-api] Error batch upserting events chunk:`, upsertErr)
            }

            // Remove appointments that were deleted in Outlook.
            // Fetch all Outlook-synced appointments for this user within the sync date range,
            // then delete any whose graph_event_id is no longer in the Outlook response.
            const outlookIds = new Set(allOutlookEvents.map((e: any) => e.id))
            const { data: existingAppts } = await supabase
                .from('appointments')
                .select('id, graph_event_id')
                .eq('user_id', userId)
                .not('graph_event_id', 'is', null)
                .gte('start_time', startStr)
                .lte('start_time', endStr)

            const toDelete = (existingAppts || [])
                .filter((a: any) => !outlookIds.has(a.graph_event_id))
                .map((a: any) => a.id)

            if (toDelete.length > 0) {
                const { error: deleteErr } = await supabase
                    .from('appointments')
                    .delete()
                    .in('id', toDelete)
                if (deleteErr) console.error(`[outlook-api] Error deleting removed events:`, deleteErr)
                else console.log(`[outlook-api] Deleted ${toDelete.length} appointments removed from Outlook for user ${userId}`)
            }

            return new Response(JSON.stringify({ success: true, count: allOutlookEvents.length, deleted: toDelete.length }), { status: 200, headers: corsHeaders })
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

