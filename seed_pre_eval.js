// Seed Pre-Evaluation data for Kirklees College "Gambling in the 21st Century" workshop
// Run this in the browser console while logged in

(async function seedPreEvalData() {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');

    // Use the same Supabase instance from the app
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://zocwbhhkkhkqgbnwkypp.supabase.co';
    const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

    // Grab the session from the existing supabase client
    const existingClient = window.__supabase;
    if (!existingClient) {
        console.error('Supabase client not found on window. Make sure you expose it.');
        return;
    }

    const SURVEY_ID = '1b4667c9-4001-4917-b477-5d92ec731088';
    const WORKSHOP_ID = 'd6ec2715-8ec1-430e-9dac-9fd968fd7f67';
    // Facilitator ID will be null since it's stored locally

    // ─── Step 1: Create survey questions ───
    const questions = [
        { label: 'How old are you?', type: 'short_text', sort_order: 1, group: 'demographics' },
        { label: 'Sector?', type: 'dropdown', sort_order: 2, group: 'demographics', settings: { choices: ['Further Education - College', 'Community/Foundation', 'Secondary School', 'University', 'Other'] } },
        { label: 'Organisation name?', type: 'short_text', sort_order: 3, group: 'demographics' },
        { label: 'What Sport?', type: 'short_text', sort_order: 4, group: 'demographics' },
        {
            label: 'Ethnic Background', type: 'dropdown', sort_order: 5, group: 'demographics', settings: {
                choices: [
                    'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)',
                    'Mixed (White and Black Caribbean, White and Black African, White and Asian Any other Mixed or multiple ethnic background)',
                    'Asian (Indian, Pakistani, Bangladeshi, Chinese, Any other Asian background)',
                    'Black (African, Caribbean, Any other Black background)',
                    'Other ethnic group',
                ]
            }
        },
        { label: 'Ethnic Background Freetext', type: 'short_text', sort_order: 6, group: 'demographics' },
        { label: 'Have you ever gambled?', type: 'yes_no', sort_order: 7, group: 'experience' },
        { label: 'If Yes, Why?', type: 'long_text', sort_order: 8, group: 'experience' },
        { label: 'If No, Why?', type: 'long_text', sort_order: 9, group: 'experience' },
        {
            label: 'Types of Gambling tried', type: 'checkboxes', sort_order: 10, group: 'experience', settings: {
                choices: [
                    'Sports Betting – Online or in-person',
                    'In-Play Sports Betting - Betting during live events',
                    'Online Casino Games – roulette, blackjack',
                    'Online Slot Games',
                    'National Lottery or Scratchcards',
                    'Fruit Machines',
                    'Gambling with friends',
                ]
            }
        },
        { label: 'How often do you gamble?', type: 'dropdown', sort_order: 11, group: 'experience', settings: { choices: ['Daily', 'Weekly', 'Monthly', 'Every few months', 'Couple of times per year', 'Never'] } },
        { label: 'Has Gambling caused you Problems', type: 'yes_no', sort_order: 12, group: 'impact' },
        { label: 'If Yes, Please Describe', type: 'long_text', sort_order: 13, group: 'impact' },
        { label: 'Someone elses gambling caused you problems', type: 'yes_no', sort_order: 14, group: 'impact' },
        { label: 'If Yes, Please Describe (others)', type: 'long_text', sort_order: 15, group: 'impact' },
        {
            label: 'Advertising seen in the last week', type: 'checkboxes', sort_order: 16, group: 'opinions', settings: {
                choices: [
                    'TV / Live Sports Coverage',
                    'Social media (Instagram, TikTok, Snapchat, etc.)',
                    'I haven\'t seen any gambling ads this week',
                ]
            }
        },
        { label: 'Advertising seen - free text', type: 'short_text', sort_order: 17, group: 'opinions' },
        { label: 'Ever used a free bet, bonus or boost?', type: 'yes_no', sort_order: 18, group: 'opinions' },
        { label: 'Should gambling be advertised after 9pm', type: 'yes_no', sort_order: 19, group: 'opinions' },
        { label: 'Has it become normalised?', type: 'yes_no', sort_order: 20, group: 'opinions' },
        { label: 'Do you know someone who has been impacted', type: 'yes_no', sort_order: 21, group: 'opinions' },
        { label: 'Like to speak to us about gambling?', type: 'yes_no', sort_order: 22, group: 'contact' },
    ];

    console.log('Creating', questions.length, 'questions...');
    const questionRows = questions.map(q => ({
        survey_id: SURVEY_ID,
        type: q.type,
        label: q.label,
        required: false,
        settings: q.settings || {},
        sort_order: q.sort_order,
        page: q.sort_order <= 6 ? 1 : q.sort_order <= 11 ? 2 : q.sort_order <= 15 ? 3 : q.sort_order <= 18 ? 4 : 5,
        group: q.group,
    }));

    const { data: createdQuestions, error: qError } = await existingClient
        .from('survey_questions')
        .insert(questionRows)
        .select();

    if (qError) {
        console.error('Failed to create questions:', qError.message);
        return;
    }
    console.log('Created', createdQuestions.length, 'questions');

    // Map by sort_order for easy lookup
    const qMap = {};
    createdQuestions.forEach(q => { qMap[q.sort_order] = q.id; });

    // ─── Step 2: Create responses from CSV data ───
    const responses = [
        // Row 2
        { 2: 'Further Education - College', 3: 'Kirklees College', 5: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', 7: true, 10: 'Gambling with friends', 11: 'Monthly', 12: false, 14: false, 16: 'Social media (Instagram, TikTok, Snapchat, etc.), I haven\'t seen any gambling ads this week', 18: false, 19: true, 20: false, 21: false },
        // Row 3
        { 2: 'Further Education - College', 3: 'Kirklees College', 5: 'Mixed (White and Black Caribbean, White and Black African, White and Asian Any other Mixed or multiple ethnic background)', 7: false, 9: 'Because I don\'t wanna spend money on it', 12: false, 14: false, 18: false, 20: true },
        // Row 4
        { 2: 'Further Education - College', 3: 'Kirklees College', 5: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', 7: false, 9: 'Just never interested me', 11: 'Never', 12: false, 14: false, 16: 'TV / Live Sports Coverage, Social media (Instagram, TikTok, Snapchat, etc.)', 18: false, 19: false, 20: true, 21: false },
        // Row 5
        { 2: 'Community/Foundation', 3: 'Kirklees College', 5: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', 7: true, 8: 'football and horse racing', 10: 'In-Play Sports Betting - Betting during live events', 11: 'Weekly', 12: false, 14: false, 16: 'TV / Live Sports Coverage', 18: true, 19: true, 20: true, 21: true },
        // Row 6
        { 2: 'Further Education - College', 3: 'Kirklees College', 5: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', 7: true, 8: 'Money', 10: 'Sports Betting – Online or in-person, Online Slot Games, Fruit Machines', 12: false, 14: false, 18: true, 19: true, 20: true, 21: false },
        // Row 7
        { 2: 'Further Education - College', 3: 'Kirklees College', 5: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', 7: true, 8: 'Prmotions', 10: 'Online Slot Games', 11: 'Every few months', 12: false, 14: false, 16: 'Social media (Instagram, TikTok, Snapchat, etc.)', 18: true, 19: false, 20: true, 21: false },
        // Row 8
        { 2: 'Further Education - College', 3: 'Kirklees College', 5: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', 7: true, 8: 'Loved the bandit at pub', 10: 'Sports Betting – Online or in-person', 11: 'Weekly', 12: false, 14: false, 16: 'TV / Live Sports Coverage', 18: true, 19: true, 20: true, 21: false },
        // Row 9
        { 2: 'Further Education - College', 3: 'Kirklees College', 5: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', 7: true, 8: 'football', 10: 'Sports Betting – Online or in-person', 11: 'Couple of times per year', 12: false, 14: false, 16: 'TV / Live Sports Coverage', 18: false, 19: false, 20: true, 21: false },
        // Row 10
        { 2: 'Further Education - College', 3: 'Kirklees College', 5: 'Mixed (White and Black Caribbean, White and Black African, White and Asian Any other Mixed or multiple ethnic background)', 7: true, 8: 'Wining money', 10: 'Gambling with friends', 11: 'Couple of times per year', 12: false, 14: false, 16: 'Social media (Instagram, TikTok, Snapchat, etc.)', 18: false, 19: true, 20: true, 21: false },
        // Row 11
        { 2: 'Further Education - College', 3: 'Kirklees College', 5: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', 7: true, 8: 'just the chance to win money and the risk', 10: 'Online Casino Games – roulette, blackjack, National Lottery or Scratchcards, Online Slot Games, Fruit Machines', 11: 'Monthly', 12: false, 14: false, 16: 'TV / Live Sports Coverage', 18: false, 19: false, 20: true, 21: false },
    ];

    let successCount = 0;
    for (let i = 0; i < responses.length; i++) {
        const rowData = responses[i];

        // Create the response row
        const { data: respRow, error: respErr } = await existingClient
            .from('survey_responses')
            .insert({
                survey_id: SURVEY_ID,
                respondent_type: 'external',
                metadata: { source: 'pre_evaluation_seed', workshopTitle: 'Gambling in the 21st Century', organisation: 'Kirklees College' },
            })
            .select()
            .single();

        if (respErr) {
            console.error(`Response ${i + 1} failed:`, respErr.message);
            continue;
        }

        // Create the answers
        const answerRows = [];
        for (const [sortOrder, value] of Object.entries(rowData)) {
            const questionId = qMap[parseInt(sortOrder)];
            if (questionId && value !== undefined && value !== null && value !== '') {
                answerRows.push({
                    response_id: respRow.id,
                    question_id: questionId,
                    value: typeof value === 'boolean' ? value : String(value),
                });
            }
        }

        const { error: ansErr } = await existingClient
            .from('survey_answers')
            .insert(answerRows);

        if (ansErr) {
            console.error(`Answers for response ${i + 1} failed:`, ansErr.message);
        } else {
            successCount++;
            console.log(`Response ${i + 1}/10 seeded (${answerRows.length} answers)`);
        }
    }

    console.log(`\n✅ Done! Seeded ${successCount}/10 responses for Pre Session Evaluation`);
})();
