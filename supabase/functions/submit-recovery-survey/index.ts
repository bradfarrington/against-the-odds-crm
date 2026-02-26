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
        const { surveyId, personalInfo, customAnswers, allAnswers, metadata } = await req.json()

        if (!surveyId) {
            return new Response(JSON.stringify({ error: 'Missing surveyId' }), { status: 400, headers: corsHeaders })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const serviceRoleKey = Deno.env.get('MY_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Missing Supabase environment variables')
        }

        // Use service role client to bypass RLS
        const adminClient = createClient(supabaseUrl, serviceRoleKey)

        // 1. Save raw survey response
        const { data: responseData, error: responseError } = await adminClient
            .from('survey_responses')
            .insert({ survey_id: surveyId, respondent_type: 'external', metadata: metadata || {} })
            .select()
            .single()

        if (responseError) {
            throw new Error(`Failed to create survey response: ${responseError.message}`)
        }

        // 2. Save individual answers
        if (allAnswers && allAnswers.length > 0) {
            const answerRows = allAnswers.map((a: { questionId: string; value: unknown }) => ({
                response_id: responseData.id,
                question_id: a.questionId,
                value: a.value,
            }))
            const { error: answersError } = await adminClient.from('survey_answers').insert(answerRows)
            if (answersError) {
                console.error('Failed to save survey answers:', answersError.message)
            }
        }

        // 3. Find or create recovery seeker by email
        const pi = personalInfo || {}
        // Convert camelCase personalInfo keys to snake_case for DB
        const snakePI: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(pi)) {
            const snake = k.replace(/([A-Z])/g, '_$1').toLowerCase()
            snakePI[snake] = v
        }

        let seeker = null

        if (pi.email) {
            const { data: existing } = await adminClient
                .from('recovery_seekers')
                .select('*')
                .eq('email', pi.email)
                .maybeSingle()

            if (existing) {
                // Update existing seeker with new personal info
                const { data: updated, error: updateError } = await adminClient
                    .from('recovery_seekers')
                    .update(snakePI)
                    .eq('id', existing.id)
                    .select()
                    .single()

                if (updateError) {
                    console.error('Failed to update seeker:', updateError.message)
                } else {
                    seeker = updated
                }
            }
        }

        if (!seeker) {
            // Create new seeker
            const { data: created, error: createError } = await adminClient
                .from('recovery_seekers')
                .insert({ ...snakePI, status: 'New Enquiry', risk_level: 'Medium' })
                .select()
                .single()

            if (createError) {
                throw new Error(`Failed to create seeker: ${createError.message}`)
            }
            seeker = created
        }

        // 4. Save custom answers to seeker_survey_answers
        if (customAnswers && Object.keys(customAnswers).length > 0) {
            const { error: upsertError } = await adminClient
                .from('seeker_survey_answers')
                .upsert(
                    {
                        seeker_id: seeker.id,
                        survey_id: surveyId,
                        answers: customAnswers,
                        submitted_at: new Date().toISOString(),
                    },
                    { onConflict: 'seeker_id,survey_id' }
                )

            if (upsertError) {
                console.error('Failed to save seeker survey answers:', upsertError.message)
            }
        }

        return new Response(JSON.stringify({ success: true }), {
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
