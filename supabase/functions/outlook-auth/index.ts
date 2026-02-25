import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getSupabase, corsHeaders } from '../_shared/outlook.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // we pass staff.id in state

    // Microsoft App Credentials from environment variables
    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')

    // We should determine the correct redirect URI based on the request URL
    const redirectUri = Deno.env.get('MICROSOFT_REDIRECT_URI') || `${url.origin}${url.pathname}`

    // If there's no code, and it's a GET, return an error (or user canceled)
    if (!code) {
      if (url.searchParams.get('error')) {
        const errorMsg = url.searchParams.get('error_description') || url.searchParams.get('error')
        return new Response(`Authentication failed: ${errorMsg}`, { status: 400 })
      }
      return new Response("No authorization code provided.", { status: 400 })
    }

    if (!state) {
      return new Response("No state (user_id) provided.", { status: 400 })
    }

    const userId = state; // We used 'state' to pass the user ID from the frontend

    // 1. Exchange the auth code for access / refresh tokens
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('[outlook-auth] Token exchange failed:', tokenData)
      return new Response(JSON.stringify({ error: 'Failed to exchange token', details: tokenData }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Fetch the user's Microsoft profile to get their email
    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })
    const profileData = await profileResponse.json()

    if (!profileResponse.ok) {
      console.error('[outlook-auth] Failed to fetch profile:', profileData)
      return new Response(JSON.stringify({ error: 'Failed to fetch Microsoft profile' }), { status: 400, headers: corsHeaders })
    }

    const microsoftEmail = profileData.mail || profileData.userPrincipalName

    // 3. Initialize Supabase client
    const supabaseClient = getSupabase()

    // 4. Save tokens securely in user_oauth_connections table
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    const { error: dbError } = await supabaseClient
      .from('user_oauth_connections')
      .upsert({
        user_id: userId,
        microsoft_email: microsoftEmail,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }) // Assuming one connection per user

    if (dbError) {
      console.error('[outlook-auth] Database error:', dbError)
      return new Response(JSON.stringify({ error: 'Failed to save connection' }), { status: 500, headers: corsHeaders })
    }

    // 5. Create Graph Webhook Subscriptions for Inbox, Sent Items, and Calendar
    const webhookUrl = Deno.env.get('OUTLOOK_WEBHOOK_URL') // Full URL to your webhook edge function

    if (webhookUrl) {
      const expirationDateTime = new Date(Date.now() + 4230 * 60000).toISOString() // ~2.9 days max for mail

      const subscriptions = [
        {
          changeType: 'created',
          notificationUrl: webhookUrl,
          resource: "me/mailFolders('inbox')/messages",
          expirationDateTime,
          clientState: userId // Pass user ID so webhook knows who this is for
        },
        {
          changeType: 'created',
          notificationUrl: webhookUrl,
          resource: "me/mailFolders('sentitems')/messages",
          expirationDateTime,
          clientState: userId
        },
        {
          changeType: 'created,updated,deleted',
          notificationUrl: webhookUrl,
          resource: "me/events",
          expirationDateTime,
          clientState: userId
        }
      ]

      let webhookStatus = 'success'
      let webhookErrorDetails = ''

      for (const sub of subscriptions) {
        const res = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sub)
        })
        if (!res.ok) {
          webhookStatus = 'failed'
          webhookErrorDetails += await res.text() + ' | '
        }
      }

      if (webhookStatus === 'failed') {
        console.error('[outlook-auth] Webhook subscription failed:', webhookErrorDetails)
      }
    }

    // 6. Redirect back to CRM settings on success
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'
    return Response.redirect(`${frontendUrl}/settings?outlook_connected=success`, 302)

  } catch (err: any) {
    console.error('[outlook-auth] Unhandled error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

