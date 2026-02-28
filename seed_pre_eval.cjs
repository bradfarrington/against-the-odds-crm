// Seed Pre-Evaluation data for Kirklees College
// Run: SEED_EMAIL="..." SEED_PASSWORD="..." node seed_pre_eval.cjs

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

const SURVEY_ID = '1b4667c9-4001-4917-b477-5d92ec731088';

async function main() {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: process.env.SEED_EMAIL,
        password: process.env.SEED_PASSWORD,
    });
    if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }
    console.log('Authenticated as:', authData.user.email);

    // ── Question definitions with stable UUIDs ──
    const Q = {
        age: { id: '10000001-0001-0001-0001-000000000001', type: 'short_text', title: 'How old are you?' },
        sector: { id: '10000001-0001-0001-0001-000000000002', type: 'dropdown', title: 'Sector?', settings: { choices: ['Further Education - College', 'Community/Foundation', 'Secondary School', 'University', 'Other'] } },
        orgName: { id: '10000001-0001-0001-0001-000000000003', type: 'short_text', title: 'Organisation name?' },
        sport: { id: '10000001-0001-0001-0001-000000000004', type: 'short_text', title: 'What Sport?' },
        ethnicity: {
            id: '10000001-0001-0001-0001-000000000005', type: 'dropdown', title: 'Ethnic Background', settings: {
                choices: [
                    'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)',
                    'Mixed (White and Black Caribbean, White and Black African, White and Asian Any other Mixed or multiple ethnic background)',
                    'Asian (Indian, Pakistani, Bangladeshi, Chinese, Any other Asian background)',
                    'Black (African, Caribbean, Any other Black background)',
                    'Other ethnic group',
                ]
            }
        },
        ethnicityFree: { id: '10000001-0001-0001-0001-000000000006', type: 'short_text', title: 'Ethnic Background Freetext' },
        everGambled: { id: '10000001-0001-0001-0001-000000000007', type: 'multiple_choice', title: 'Have you ever gambled?', settings: { choices: ['Yes', 'No'] } },
        whyYes: { id: '10000001-0001-0001-0001-000000000008', type: 'long_text', title: 'If Yes, Why?' },
        whyNo: { id: '10000001-0001-0001-0001-000000000009', type: 'long_text', title: 'If No, Why?' },
        typesGambling: {
            id: '10000001-0001-0001-0001-000000000010', type: 'checkboxes', title: 'Types of Gambling tried', settings: {
                choices: [
                    'Sports Betting – Online or in-person', 'In-Play Sports Betting - Betting during live events',
                    'Online Casino Games – roulette, blackjack', 'Online Slot Games',
                    'National Lottery or Scratchcards', 'Fruit Machines', 'Gambling with friends',
                ]
            }
        },
        howOften: { id: '10000001-0001-0001-0001-000000000011', type: 'dropdown', title: 'How often do you gamble?', settings: { choices: ['Daily', 'Weekly', 'Monthly', 'Every few months', 'Couple of times per year', 'Never'] } },
        causedProblems: { id: '10000001-0001-0001-0001-000000000012', type: 'multiple_choice', title: 'Has Gambling caused you Problems', settings: { choices: ['Yes', 'No'] } },
        describeProb: { id: '10000001-0001-0001-0001-000000000013', type: 'long_text', title: 'If Yes, Please Describe' },
        othersProblems: { id: '10000001-0001-0001-0001-000000000014', type: 'multiple_choice', title: "Someone else's gambling caused you problems", settings: { choices: ['Yes', 'No'] } },
        describeOthers: { id: '10000001-0001-0001-0001-000000000015', type: 'long_text', title: 'If Yes, Please Describe' },
        adsSeen: {
            id: '10000001-0001-0001-0001-000000000016', type: 'checkboxes', title: 'Advertising seen in the last week', settings: {
                choices: [
                    'TV / Live Sports Coverage', 'Social media (Instagram, TikTok, Snapchat, etc.)', "I haven't seen any gambling ads this week",
                ]
            }
        },
        adsFreetext: { id: '10000001-0001-0001-0001-000000000017', type: 'short_text', title: 'Advertising seen - free text' },
        freeBet: { id: '10000001-0001-0001-0001-000000000018', type: 'multiple_choice', title: 'Ever used a free bet, bonus or boost?', settings: { choices: ['Yes', 'No'] } },
        advertAfter9: { id: '10000001-0001-0001-0001-000000000019', type: 'multiple_choice', title: 'Should gambling be advertised after 9pm', settings: { choices: ['Yes', 'No'] } },
        normalised: { id: '10000001-0001-0001-0001-000000000020', type: 'multiple_choice', title: 'Has it become normalised?', settings: { choices: ['Yes', 'No'] } },
        knowImpacted: { id: '10000001-0001-0001-0001-000000000021', type: 'multiple_choice', title: 'Do you know someone who has been impacted', settings: { choices: ['Yes', 'No'] } },
        talkToUs: { id: '10000001-0001-0001-0001-000000000022', type: 'multiple_choice', title: 'Like to speak to us about gambling?', settings: { choices: ['Yes', 'No'] } },
    };

    const allQs = Object.values(Q);

    // ── Step 1: Insert survey_questions rows (for FK constraint) ──
    console.log(`Creating ${allQs.length} questions in survey_questions...`);
    const questionRows = allQs.map((q, i) => ({
        id: q.id,
        survey_id: SURVEY_ID,
        type: q.type,
        title: q.title,
        required: false,
        settings: q.settings || {},
        sort_order: i + 1,
    }));

    const { error: qError } = await supabase
        .from('survey_questions')
        .insert(questionRows);
    if (qError) {
        console.error('Failed to create questions:', qError.message);
        process.exit(1);
    }
    console.log(`✅ Created ${allQs.length} questions`);

    // ── Step 2: Update survey pages JSON ──
    function makeElement(q) {
        return {
            id: q.id,
            type: q.type,
            label: q.title,
            hint: '',
            required: false,
            options: q.settings?.choices || [],
            config: {},
        };
    }

    const pages = [
        { name: 'Demographics', elements: [Q.age, Q.sector, Q.orgName, Q.sport, Q.ethnicity, Q.ethnicityFree].map(makeElement) },
        { name: 'Experience', elements: [Q.everGambled, Q.whyYes, Q.whyNo, Q.typesGambling, Q.howOften].map(makeElement) },
        { name: 'Impact', elements: [Q.causedProblems, Q.describeProb, Q.othersProblems, Q.describeOthers].map(makeElement) },
        { name: 'Opinions & Exposure', elements: [Q.adsSeen, Q.adsFreetext, Q.freeBet, Q.advertAfter9, Q.normalised, Q.knowImpacted].map(makeElement) },
        { name: 'Contact', elements: [Q.talkToUs].map(makeElement) },
    ];

    const { error: surveyErr } = await supabase
        .from('surveys')
        .update({ pages, status: 'active' })
        .eq('id', SURVEY_ID);
    if (surveyErr) {
        console.error('Failed to update survey:', surveyErr.message);
        process.exit(1);
    }
    console.log('✅ Survey updated with pages and set to active');

    // ── Step 3: Seed 10 student responses ──
    const csvRows = [
        { [Q.sector.id]: 'Further Education - College', [Q.orgName.id]: 'Kirklees College', [Q.ethnicity.id]: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', [Q.everGambled.id]: 'Yes', [Q.typesGambling.id]: 'Gambling with friends', [Q.howOften.id]: 'Monthly', [Q.causedProblems.id]: 'No', [Q.othersProblems.id]: 'No', [Q.adsSeen.id]: "Social media (Instagram, TikTok, Snapchat, etc.), I haven't seen any gambling ads this week", [Q.freeBet.id]: 'No', [Q.advertAfter9.id]: 'Yes', [Q.normalised.id]: 'No', [Q.knowImpacted.id]: 'No' },
        { [Q.sector.id]: 'Further Education - College', [Q.orgName.id]: 'Kirklees College', [Q.ethnicity.id]: 'Mixed (White and Black Caribbean, White and Black African, White and Asian Any other Mixed or multiple ethnic background)', [Q.everGambled.id]: 'No', [Q.whyNo.id]: "Because I don't wanna spend money on it", [Q.causedProblems.id]: 'No', [Q.othersProblems.id]: 'No', [Q.freeBet.id]: 'No', [Q.normalised.id]: 'Yes' },
        { [Q.sector.id]: 'Further Education - College', [Q.orgName.id]: 'Kirklees College', [Q.ethnicity.id]: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', [Q.everGambled.id]: 'No', [Q.whyNo.id]: 'Just never interested me', [Q.howOften.id]: 'Never', [Q.causedProblems.id]: 'No', [Q.othersProblems.id]: 'No', [Q.adsSeen.id]: 'TV / Live Sports Coverage, Social media (Instagram, TikTok, Snapchat, etc.)', [Q.freeBet.id]: 'No', [Q.advertAfter9.id]: 'No', [Q.normalised.id]: 'Yes', [Q.knowImpacted.id]: 'No' },
        { [Q.sector.id]: 'Community/Foundation', [Q.orgName.id]: 'Kirklees College', [Q.ethnicity.id]: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', [Q.everGambled.id]: 'Yes', [Q.whyYes.id]: 'football and horse racing', [Q.typesGambling.id]: 'In-Play Sports Betting - Betting during live events', [Q.howOften.id]: 'Weekly', [Q.causedProblems.id]: 'No', [Q.othersProblems.id]: 'No', [Q.adsSeen.id]: 'TV / Live Sports Coverage', [Q.freeBet.id]: 'Yes', [Q.advertAfter9.id]: 'Yes', [Q.normalised.id]: 'Yes', [Q.knowImpacted.id]: 'Yes' },
        { [Q.sector.id]: 'Further Education - College', [Q.orgName.id]: 'Kirklees College', [Q.ethnicity.id]: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', [Q.everGambled.id]: 'Yes', [Q.whyYes.id]: 'Money', [Q.typesGambling.id]: 'Sports Betting – Online or in-person, Online Slot Games, Fruit Machines', [Q.causedProblems.id]: 'No', [Q.othersProblems.id]: 'No', [Q.freeBet.id]: 'Yes', [Q.advertAfter9.id]: 'Yes', [Q.normalised.id]: 'Yes', [Q.knowImpacted.id]: 'No' },
        { [Q.sector.id]: 'Further Education - College', [Q.orgName.id]: 'Kirklees College', [Q.ethnicity.id]: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', [Q.everGambled.id]: 'Yes', [Q.whyYes.id]: 'Promotions', [Q.typesGambling.id]: 'Online Slot Games', [Q.howOften.id]: 'Every few months', [Q.causedProblems.id]: 'No', [Q.othersProblems.id]: 'No', [Q.adsSeen.id]: 'Social media (Instagram, TikTok, Snapchat, etc.)', [Q.freeBet.id]: 'Yes', [Q.advertAfter9.id]: 'No', [Q.normalised.id]: 'Yes', [Q.knowImpacted.id]: 'No' },
        { [Q.sector.id]: 'Further Education - College', [Q.orgName.id]: 'Kirklees College', [Q.ethnicity.id]: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', [Q.everGambled.id]: 'Yes', [Q.whyYes.id]: 'Loved the bandit at pub', [Q.typesGambling.id]: 'Sports Betting – Online or in-person', [Q.howOften.id]: 'Weekly', [Q.causedProblems.id]: 'No', [Q.othersProblems.id]: 'No', [Q.adsSeen.id]: 'TV / Live Sports Coverage', [Q.freeBet.id]: 'Yes', [Q.advertAfter9.id]: 'Yes', [Q.normalised.id]: 'Yes', [Q.knowImpacted.id]: 'No' },
        { [Q.sector.id]: 'Further Education - College', [Q.orgName.id]: 'Kirklees College', [Q.ethnicity.id]: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', [Q.everGambled.id]: 'Yes', [Q.whyYes.id]: 'football', [Q.typesGambling.id]: 'Sports Betting – Online or in-person', [Q.howOften.id]: 'Couple of times per year', [Q.causedProblems.id]: 'No', [Q.othersProblems.id]: 'No', [Q.adsSeen.id]: 'TV / Live Sports Coverage', [Q.freeBet.id]: 'No', [Q.advertAfter9.id]: 'No', [Q.normalised.id]: 'Yes', [Q.knowImpacted.id]: 'No' },
        { [Q.sector.id]: 'Further Education - College', [Q.orgName.id]: 'Kirklees College', [Q.ethnicity.id]: 'Mixed (White and Black Caribbean, White and Black African, White and Asian Any other Mixed or multiple ethnic background)', [Q.everGambled.id]: 'Yes', [Q.whyYes.id]: 'Wining money', [Q.typesGambling.id]: 'Gambling with friends', [Q.howOften.id]: 'Couple of times per year', [Q.causedProblems.id]: 'No', [Q.othersProblems.id]: 'No', [Q.adsSeen.id]: 'Social media (Instagram, TikTok, Snapchat, etc.)', [Q.freeBet.id]: 'No', [Q.advertAfter9.id]: 'Yes', [Q.normalised.id]: 'Yes', [Q.knowImpacted.id]: 'No' },
        { [Q.sector.id]: 'Further Education - College', [Q.orgName.id]: 'Kirklees College', [Q.ethnicity.id]: 'White (English, Welsh, Scottish, Northern Irish or British, Irish, Gypsy or Irish Traveller, Roma)', [Q.everGambled.id]: 'Yes', [Q.whyYes.id]: 'just the chance to win money and the risk', [Q.typesGambling.id]: 'Online Casino Games – roulette, blackjack, National Lottery or Scratchcards, Online Slot Games, Fruit Machines', [Q.howOften.id]: 'Monthly', [Q.causedProblems.id]: 'No', [Q.othersProblems.id]: 'No', [Q.adsSeen.id]: 'TV / Live Sports Coverage', [Q.freeBet.id]: 'No', [Q.advertAfter9.id]: 'No', [Q.normalised.id]: 'Yes', [Q.knowImpacted.id]: 'No' },
    ];

    let successCount = 0;
    for (let i = 0; i < csvRows.length; i++) {
        const rowData = csvRows[i];

        const { data: respRow, error: respErr } = await supabase
            .from('survey_responses')
            .insert({
                survey_id: SURVEY_ID,
                respondent_type: 'external',
                metadata: { source: 'pre_evaluation_csv', workshop: 'Gambling in the 21st Century', organisation: 'Kirklees College' },
            })
            .select()
            .single();

        if (respErr) { console.error(`Response ${i + 1} failed:`, respErr.message); continue; }

        const answerRows = Object.entries(rowData)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([questionId, value]) => ({
                response_id: respRow.id,
                question_id: questionId,
                value: String(value),
            }));

        const { error: ansErr } = await supabase
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
    process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
