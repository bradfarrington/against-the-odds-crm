import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, password, firstName, lastName, role, department, phone, status, bio, dashboard_role } = await req.json()

        // 1. Validate the user making the request allows it (Dashboard Role: 'admin')
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: corsHeaders })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const serviceRoleKey = Deno.env.get('MY_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Missing Supabase environment variables')
        }

        // Initialize a standard client with the caller's JWT to verify they are an admin
        const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
            global: { headers: { Authorization: authHeader } }
        })

        const { data: { user }, error: authError } = await userClient.auth.getUser()
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders })
        }

        // Check if the calling user is an Admin in the staff table
        const { data: callerStaff } = await userClient.from('staff').select('dashboard_role').eq('id', user.id).single()

        if (!callerStaff || callerStaff.dashboard_role !== 'admin') {
            return new Response(JSON.stringify({ error: 'You are not authorized to create staff members.' }), { status: 403, headers: corsHeaders })
        }

        // 2. We are authorized! Initialize the Admin client to bypass RLS and create the user
        const adminClient = createClient(supabaseUrl, serviceRoleKey)

        // Create the user in Supabase Auth
        const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true // Auto-confirm the email so they can log in instantly
        })

        if (createError) {
            return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders })
        }

        if (!newAuthUser || !newAuthUser.user) {
            throw new Error('User creation failed silently')
        }

        const newUserId = newAuthUser.user.id

        // 3. Immediately insert their public profile into the `staff` table perfectly synced
        const { data: newStaffRecord, error: insertError } = await adminClient.from('staff').insert({
            id: newUserId,     // <--- EXACT MATCH!
            email: email,
            first_name: firstName,
            last_name: lastName,
            role: role || '',
            department: department || 'Operations',
            phone: phone || '',
            status: status || 'Active',
            bio: bio || '',
            dashboard_role: dashboard_role || 'user' // Default new staff to regular user
        }).select().single()

        if (insertError) {
            // Rollback auth user creation if staff profile fails
            await adminClient.auth.admin.deleteUser(newUserId)
            return new Response(JSON.stringify({ error: 'Failed to create staff profile. User creation rolled back.', details: insertError.message }), { status: 500, headers: corsHeaders })
        }

        return new Response(JSON.stringify({ success: true, staff: newStaffRecord }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (err) {
        console.error('Edge Function Error:', err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
