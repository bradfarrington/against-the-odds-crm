import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize a supabase client with the service role key to bypass RLS
export function getSupabase() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('MY_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

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
        .maybeSingle()

    if (error || !connection) {
        console.error(`[outlook-shared] Connection not found for user ${userId}:`, error)
        throw new Error('User Outlook connection not found.')
    }

    // Check if expired (or expiring within 5 minutes)
    const expiresAt = new Date(connection.expires_at).getTime()
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000

    if (now + fiveMinutes > expiresAt) {
        console.log(`[outlook-shared] Token expired for user ${userId}, refreshing...`)
        const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')
        const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')

        if (!clientId || !clientSecret) {
            throw new Error('Microsoft App credentials missing in environment')
        }

        const refreshResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: connection.refresh_token,
                grant_type: 'refresh_token',
            }),
        })

        const refreshData = await refreshResponse.json()

        if (!refreshResponse.ok) {
            console.error('[outlook-shared] Failed to refresh Microsoft token', refreshData)
            throw new Error(`Failed to refresh Microsoft token: ${refreshData.error_description || refreshData.error || 'Unknown error'}`)
        }

        const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString()

        const { error: updateErr } = await supabase
            .from('user_oauth_connections')
            .update({
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token || connection.refresh_token,
                expires_at: newExpiresAt,
                updated_at: new Date().toISOString()
            })
            .eq('id', connection.id)

        if (updateErr) {
            console.error('[outlook-shared] Failed to update refreshed token in DB:', updateErr)
        }

        return refreshData.access_token
    }

    return connection.access_token
}

// Helper to find a contact or seeker by email
export async function matchContactOrSeeker(supabase: any, emails: string[]) {
    if (!emails || emails.length === 0) return { contactId: null, seekerId: null }

    for (const email of emails) {
        if (!email) continue
        const cleanEmail = email.trim().toLowerCase()

        // Check recovery_seekers
        const { data: seeker } = await supabase
            .from('recovery_seekers')
            .select('id')
            .ilike('email', cleanEmail)
            .maybeSingle()

        if (seeker) return { contactId: null, seekerId: seeker.id }

        // Check contacts
        const { data: contact } = await supabase
            .from('contacts')
            .select('id')
            .ilike('email', cleanEmail)
            .maybeSingle()

        if (contact) return { contactId: contact.id, seekerId: null }
    }

    return { contactId: null, seekerId: null }
}
