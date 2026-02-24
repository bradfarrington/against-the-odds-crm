import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize a supabase client with the service role key to bypass RLS
export function getSupabase() {
    // Supabase Edge Functions provide SUPABASE_URL and SUPABASE_ANON_KEY automatically
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    // We need the service role key to bypass RLS during webhook/auth operations
    const supabaseServiceRoleKey = Deno.env.get('MY_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error('Supabase configuration missing in environment')
    }

    return createClient(supabaseUrl, supabaseServiceRoleKey)
}

// Helper to get a valid Graph API token (auto-refreshes if expired)
export async function getValidGraphToken(userId: string) {
    const supabase = getSupabase()

    const { data: connection, error } = await supabase
        .from('user_oauth_connections')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (error || !connection) {
        throw new Error('User Outlook connection not found.')
    }

    // Check if expired (or expiring within 5 minutes)
    const expiresAt = new Date(connection.expires_at).getTime()
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000

    if (now + fiveMinutes > expiresAt) {
        // Token is expired or expiring soon, let's refresh it.
        const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')
        const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')

        const refreshResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId!,
                client_secret: clientSecret!,
                refresh_token: connection.refresh_token,
                grant_type: 'refresh_token',
            }),
        })

        const refreshData = await refreshResponse.json()

        if (!refreshResponse.ok) {
            console.error('Failed to refresh Microsoft token', refreshData)
            throw new Error('Failed to refresh Microsoft token')
        }

        const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString()

        await supabase
            .from('user_oauth_connections')
            .update({
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token || connection.refresh_token,
                expires_at: newExpiresAt,
                updated_at: new Date().toISOString()
            })
            .eq('id', connection.id)

        return refreshData.access_token
    }

    return connection.access_token
}
