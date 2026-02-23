/**
 * Seed script for Against the Odds CRM — Supabase
 *
 * Usage:
 *   1. Set your Supabase URL and SERVICE_ROLE key below (or via env vars)
 *   2. Run: node scripts/seed.js
 *
 * This inserts all seed data AND creates Supabase Auth users for each staff member.
 * Each staff member gets a temporary password: ATO-<firstName>-2026!
 */

import { createClient } from '@supabase/supabase-js';

// ── Configure these ──────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';
// ─────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

function die(msg, err) {
    console.error(`❌ ${msg}:`, err?.message || err);
    process.exit(1);
}

async function insert(table, rows) {
    const { data, error } = await supabase.from(table).insert(rows).select();
    if (error) die(`Insert into ${table} failed`, error);
    console.log(`  ✅ ${table}: ${data.length} rows`);
    return data;
}

async function createAuthUser(email, password) {
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });
    if (error) {
        if (error.message.includes('already been registered')) {
            console.log(`  ⚠️  Auth user ${email} already exists — skipped`);
            return;
        }
        die(`Create auth user ${email} failed`, error);
    }
    console.log(`  ✅ Auth user: ${email}`);
    return data;
}

async function main() {
    console.log('\n🚀 Seeding Against the Odds CRM\n');

    // 1. Staff
    console.log('📋 Staff...');
    const staffData = [
        { first_name: 'Marcus', last_name: 'Williams', role: 'Founder & Director', dashboard_role: 'admin', email: 'marcus@againsttheodds.org.uk', phone: '07700 100 001', department: 'Leadership', status: 'Active', bio: 'Founded Against the Odds in 2023. Passionate about reducing gambling harm through education and recovery support.' },
        { first_name: 'Sophie', last_name: 'Clarke', role: 'Recovery Coach Lead', dashboard_role: 'recovery', email: 'sophie@againsttheodds.org.uk', phone: '07700 100 002', department: 'Recovery', status: 'Active', bio: 'Qualified recovery coach with 5 years experience in addiction support services.' },
        { first_name: 'Jordan', last_name: 'Mitchell', role: 'Prevention Workshop Facilitator', dashboard_role: 'prevention', email: 'jordan@againsttheodds.org.uk', phone: '07700 100 003', department: 'Prevention', status: 'Active', bio: 'Delivers awareness workshops across schools, colleges and universities in Greater Manchester.' },
        { first_name: 'Aisha', last_name: 'Rahman', role: 'Operations & Admin Manager', dashboard_role: 'admin', email: 'aisha@againsttheodds.org.uk', phone: '07700 100 004', department: 'Operations', status: 'Active', bio: 'Manages day-to-day operations, scheduling, invoicing and contract management.' },
        { first_name: 'Callum', last_name: "O'Brien", role: 'Recovery Coach', dashboard_role: 'recovery', email: 'callum@againsttheodds.org.uk', phone: '07700 100 005', department: 'Recovery', status: 'Active', bio: 'Specialises in young adult recovery coaching. Lived experience of gambling harm.' },
    ];
    const staff = await insert('staff', staffData);

    // Create auth users for staff
    console.log('\n🔑 Creating Auth Users...');
    for (const s of staffData) {
        const password = `ATO-${s.first_name}-2026!`;
        await createAuthUser(s.email, password);
    }

    // 2. Companies
    console.log('\n🏢 Companies...');
    const companiesData = [
        { name: 'Manchester Metropolitan University', type: 'University', industry: 'Education', address: '53 All Saints, Manchester M15 6BH', phone: '0161 247 1234', email: 'partnerships@mmu.ac.uk', website: 'https://www.mmu.ac.uk', status: 'Active', notes: 'Running monthly awareness workshops for students. Key partner for campus outreach programme.' },
        { name: 'Salford City College', type: 'College', industry: 'Education', address: 'Worsley Campus, Walkden Rd, Worsley M28 7QD', phone: '0161 631 5000', email: 'admin@salfordcc.ac.uk', website: 'https://www.salfordcc.ac.uk', status: 'Active', notes: 'Workshop series for 16-18 year olds on gambling awareness.' },
        { name: 'Betknowmore UK', type: 'Charity', industry: 'Gambling Support', address: '86-90 Paul Street, London EC2A 4NE', phone: '0800 066 4827', email: 'hello@betknowmore.co.uk', website: 'https://www.betknowmoreuk.org', status: 'Active', notes: 'Collaborative partner for referral pathways. Joint training programme in development.' },
        { name: 'GamCare', type: 'Charity', industry: 'Gambling Support', address: '91 Brick Lane, London E1 6QL', phone: '0808 8020 133', email: 'info@gamcare.org.uk', website: 'https://www.gamcare.org.uk', status: 'Partner', notes: 'National Gambling Helpline partner. Cross-referral agreement signed.' },
        { name: 'Bolton Council', type: 'Local Authority', industry: 'Government', address: 'Town Hall, Victoria Square, Bolton BL1 1RU', phone: '01204 333 333', email: 'public.health@bolton.gov.uk', website: 'https://www.bolton.gov.uk', status: 'Active', notes: 'Funded community outreach programme. Quarterly report required.' },
    ];
    const companies = await insert('companies', companiesData);

    // 3. Contacts
    console.log('\n👤 Contacts...');
    const contactsData = [
        { company_id: companies[0].id, first_name: 'Sarah', last_name: 'Thompson', role: 'Student Wellbeing Lead', email: 's.thompson@mmu.ac.uk', phone: '0161 247 1100' },
        { company_id: companies[0].id, first_name: 'James', last_name: 'Patel', role: 'Campus Activities Coordinator', email: 'j.patel@mmu.ac.uk', phone: '0161 247 1101' },
        { company_id: companies[0].id, first_name: 'Emily', last_name: 'Roberts', role: 'Head of Student Services', email: 'e.roberts@mmu.ac.uk', phone: '0161 247 1102' },
        { company_id: companies[1].id, first_name: 'David', last_name: 'Chen', role: 'PSHE Coordinator', email: 'd.chen@salfordcc.ac.uk', phone: '0161 631 5001' },
        { company_id: companies[1].id, first_name: 'Lisa', last_name: 'Ahmed', role: 'Safeguarding Lead', email: 'l.ahmed@salfordcc.ac.uk', phone: '0161 631 5002' },
        { company_id: companies[2].id, first_name: 'Frankie', last_name: 'Graham', role: 'Programme Director', email: 'f.graham@betknowmore.co.uk', phone: '0800 066 4828' },
        { company_id: companies[2].id, first_name: 'Michael', last_name: 'Okafor', role: 'Peer Mentor Coordinator', email: 'm.okafor@betknowmore.co.uk', phone: '0800 066 4829' },
        { company_id: companies[3].id, first_name: 'Anna', last_name: 'Whitfield', role: 'Head of Treatment', email: 'a.whitfield@gamcare.org.uk', phone: '0808 8020 134' },
        { company_id: companies[3].id, first_name: 'Raj', last_name: 'Sharma', role: 'Referral Manager', email: 'r.sharma@gamcare.org.uk', phone: '0808 8020 135' },
        { company_id: companies[3].id, first_name: 'Claire', last_name: 'Donovan', role: 'Research Analyst', email: 'c.donovan@gamcare.org.uk', phone: '0808 8020 136' },
        { company_id: companies[4].id, first_name: 'Tom', last_name: 'Bradshaw', role: 'Public Health Officer', email: 't.bradshaw@bolton.gov.uk', phone: '01204 333 401' },
        { company_id: companies[4].id, first_name: 'Priya', last_name: 'Kaur', role: 'Community Engagement Lead', email: 'p.kaur@bolton.gov.uk', phone: '01204 333 402' },
    ];
    const contacts = await insert('contacts', contactsData);

    // 4. Recovery Seekers + Substance Use + Coaching Sessions
    console.log('\n💚 Recovery Seekers...');
    const seekersData = [
        { first_name: 'Alex', last_name: 'Morrison', date_of_birth: '1992-03-15', email: 'a.morrison@email.com', phone: '07412 345 678', address: '14 Oak Road, Bolton BL3 4AB', gender: 'Male', referral_source: 'Self-referral', status: 'Active', risk_level: 'High', gambling_type: 'Online slots, Sports betting', gambling_frequency: 'Daily', gambling_duration: '4 years', gambling_triggers: 'Stress, Boredom, Social pressure', notes: 'Very engaged with the programme. Strong motivation for recovery. Family support available.' },
        { first_name: 'Jessica', last_name: 'Barnes', date_of_birth: '1988-07-22', email: 'j.barnes@email.com', phone: '07534 567 890', address: '7 Elm Street, Salford M6 5FG', gender: 'Female', referral_source: 'GamCare', status: 'Active', risk_level: 'Medium', gambling_type: 'Online casino, Bingo', gambling_frequency: '3-4 times per week', gambling_duration: '2 years', gambling_triggers: 'Loneliness, Financial stress', notes: 'Referred from GamCare. Has completed 6-week GamCare programme. Looking for ongoing support.' },
        { first_name: 'Ryan', last_name: 'Cooper', date_of_birth: '1995-11-08', email: 'r.cooper@email.com', phone: '07623 789 012', address: '22 Pine Close, Manchester M20 3HJ', gender: 'Male', referral_source: 'Bolton Council', status: 'Active', risk_level: 'High', gambling_type: 'Sports betting, In-play betting', gambling_frequency: 'Daily', gambling_duration: '6 years', gambling_triggers: 'Sports events, Peer influence, Alcohol', notes: 'Complex case. Dual diagnosis needed. Strong family wanting to help but strained relationships.' },
        { first_name: 'Samina', last_name: 'Hussain', date_of_birth: '1990-04-30', email: 's.hussain@email.com', phone: '07456 234 567', address: '9 Cedar Ave, Oldham OL1 2KL', gender: 'Female', referral_source: 'GP Referral', status: 'Active', risk_level: 'Medium', gambling_type: 'Online slots', gambling_frequency: 'Weekly', gambling_duration: '18 months', gambling_triggers: 'Anxiety, Insomnia', notes: 'No substance use. Gambling as coping mechanism for anxiety. Referred by GP.' },
        { first_name: 'Daniel', last_name: 'Wright', date_of_birth: '1985-09-17', email: 'd.wright@email.com', phone: '07789 345 678', address: '31 Birch Lane, Bury BL9 6MN', gender: 'Male', referral_source: 'Self-referral', status: 'Completed', risk_level: 'Low', gambling_type: 'FOBT Machines, Sports betting', gambling_frequency: 'Formerly daily, now abstinent', gambling_duration: '8 years (in recovery 6 months)', gambling_triggers: 'Bookmakers proximity, Payday', notes: 'Success story. Completed programme. Now volunteering as peer mentor for new recovery seekers.' },
        { first_name: 'Keiran', last_name: 'Flood', date_of_birth: '1998-01-25', email: 'k.flood@email.com', phone: '07345 678 901', address: '5 Maple Drive, Wigan WN1 3OP', gender: 'Male', referral_source: 'Betknowmore UK', status: 'On Hold', risk_level: 'High', gambling_type: 'Crypto gambling, Online poker', gambling_frequency: 'Daily', gambling_duration: '3 years', gambling_triggers: 'Social media ads, Crypto price movements', notes: 'Placed on hold at own request. Dealing with housing issues. Will re-engage in March.' },
    ];
    const seekers = await insert('recovery_seekers', seekersData);

    console.log('  → Substance Use...');
    await insert('substance_use', [
        { seeker_id: seekers[0].id, substance: 'Alcohol', frequency: 'Weekly', duration: '6 years', notes: 'Binge drinking pattern correlated with gambling episodes' },
        { seeker_id: seekers[0].id, substance: 'Cannabis', frequency: 'Occasional', duration: '2 years', notes: 'Used as self-medication for anxiety' },
        { seeker_id: seekers[1].id, substance: 'Alcohol', frequency: 'Daily', duration: '3 years', notes: 'Evening drinking habit' },
        { seeker_id: seekers[2].id, substance: 'Alcohol', frequency: 'Daily', duration: '5 years', notes: 'Heavy drinking linked to betting sessions' },
        { seeker_id: seekers[2].id, substance: 'Cocaine', frequency: 'Weekend use', duration: '3 years', notes: 'Social use escalating' },
        { seeker_id: seekers[4].id, substance: 'Alcohol', frequency: 'Formerly heavy, now moderate', duration: '10 years', notes: 'Reduced significantly since recovery programme' },
        { seeker_id: seekers[5].id, substance: 'MDMA', frequency: 'Monthly', duration: '2 years', notes: 'Festival/social use' },
        { seeker_id: seekers[5].id, substance: 'Alcohol', frequency: 'Binge weekends', duration: '4 years', notes: '' },
    ]);

    console.log('  → Coaching Sessions...');
    await insert('coaching_sessions', [
        { seeker_id: seekers[0].id, date: '2026-01-10', notes: 'Initial assessment completed. High risk identified. Set up weekly coaching.', progress_rating: 3 },
        { seeker_id: seekers[0].id, date: '2026-01-17', notes: 'Discussed triggers. Started trigger diary. Positive engagement.', progress_rating: 4 },
        { seeker_id: seekers[0].id, date: '2026-01-24', notes: 'Reviewed trigger diary. Identified 3 key patterns. Created coping plan.', progress_rating: 5 },
        { seeker_id: seekers[0].id, date: '2026-02-01', notes: 'Reported 5 gambling-free days. Used coping techniques successfully twice.', progress_rating: 6 },
        { seeker_id: seekers[1].id, date: '2026-01-15', notes: 'Initial assessment. Medium risk. Good awareness of problem.', progress_rating: 5 },
        { seeker_id: seekers[1].id, date: '2026-01-29', notes: 'Installed self-exclusion tools. Discussing financial recovery plan.', progress_rating: 6 },
        { seeker_id: seekers[2].id, date: '2026-01-05', notes: 'Intake assessment. Severe gambling disorder with co-occurring substance issues. Referred to dual support.', progress_rating: 2 },
        { seeker_id: seekers[2].id, date: '2026-01-12', notes: 'Discussed motivation for change. Ambivalent but attending.', progress_rating: 3 },
        { seeker_id: seekers[2].id, date: '2026-01-19', notes: 'Missed session. Followed up by phone. Rescheduled.', progress_rating: 2 },
        { seeker_id: seekers[2].id, date: '2026-01-26', notes: 'Attended. Opened up about financial debt. Created budget plan.', progress_rating: 4 },
        { seeker_id: seekers[3].id, date: '2026-02-05', notes: 'First session. Anxious but engaged. Set initial goals.', progress_rating: 4 },
        { seeker_id: seekers[3].id, date: '2026-02-12', notes: 'Discussed anxiety management. Introduced breathing techniques.', progress_rating: 5 },
        { seeker_id: seekers[4].id, date: '2025-08-10', notes: 'Start of 12-week programme.', progress_rating: 3 },
        { seeker_id: seekers[4].id, date: '2025-11-01', notes: 'Programme completion. 8 weeks gambling-free. Strong progress.', progress_rating: 8 },
        { seeker_id: seekers[4].id, date: '2026-01-15', notes: '6 month check-in. Maintaining abstinence. Volunteering as peer mentor.', progress_rating: 9 },
        { seeker_id: seekers[5].id, date: '2026-01-20', notes: 'Initial session. Resistant to engagement. Exploring motivation.', progress_rating: 2 },
    ]);

    // 5. Campaigns
    console.log('\n📧 Campaigns...');
    await insert('campaigns', [
        { name: 'Gambling Awareness Week 2026', type: 'Email', status: 'Active', audience: 'All Contacts', subject: 'Join us for Gambling Awareness Week — Free Workshops & Resources', scheduled_date: '2026-03-01T09:00:00Z', sent_count: 245, open_count: 178, click_count: 67, description: 'Annual awareness campaign targeting all contacts and partner organisations with workshop invitations and educational materials.' },
        { name: 'Recovery Stories Newsletter', type: 'Newsletter', status: 'Draft', audience: 'Partner Organisations', subject: 'Against the Odds — Monthly Recovery Stories & Impact Report', scheduled_date: '2026-03-15T10:00:00Z', sent_count: 0, open_count: 0, click_count: 0, description: 'Monthly newsletter sharing anonymised recovery success stories, impact metrics, and upcoming events.' },
        { name: 'Student Workshop Outreach', type: 'Email', status: 'Completed', audience: 'Education Contacts', subject: 'Book Your Free Gambling Harm Prevention Workshop', scheduled_date: '2026-01-15T09:00:00Z', sent_count: 89, open_count: 72, click_count: 34, description: 'Targeted outreach to education sector contacts promoting free workshop bookings for Spring term.' },
    ]);

    // 6. Projects
    console.log('\n📁 Projects...');
    const projects = await insert('projects', [
        { name: 'MMU Campus Awareness Programme', type: 'Awareness', status: 'Active', company_id: companies[0].id, lead_id: staff[2].id, description: 'Year-long gambling awareness programme for MMU students.', start_date: '2025-09-01', end_date: '2026-07-31', budget: 15000, notes: 'Funded by university wellbeing grant.' },
        { name: 'Salford College Workshop Series', type: 'Awareness', status: 'Active', company_id: companies[1].id, lead_id: staff[2].id, description: 'Termly workshop series for 16-18 year olds.', start_date: '2025-10-01', end_date: '2026-06-30', budget: 8000, notes: 'Quarterly reporting to safeguarding team required.' },
        { name: 'Bolton Community Outreach', type: 'Awareness', status: 'Active', company_id: companies[4].id, lead_id: staff[0].id, description: 'Council-funded community gambling awareness programme.', start_date: '2025-11-01', end_date: '2026-10-31', budget: 25000, notes: 'Quarterly impact reports required for council funding.' },
        { name: 'Peer Mentor Training Programme', type: 'Recovery', status: 'Active', company_id: companies[2].id, lead_id: staff[1].id, description: 'Joint programme with Betknowmore UK to train recovered individuals as peer mentors.', start_date: '2026-01-15', end_date: '2026-12-31', budget: 12000, notes: 'Co-delivered with Betknowmore. 6 mentors currently in training.' },
        { name: 'Digital Recovery Resources', type: 'Internal', status: 'Planning', company_id: null, lead_id: staff[0].id, description: 'Development of online self-help resources, video content, and digital recovery toolkit.', start_date: '2026-04-01', end_date: '2026-09-30', budget: 5000, notes: 'Awaiting funding confirmation from lottery grant.' },
    ]);

    // 7. Tasks
    console.log('\n✅ Tasks...');
    await insert('tasks', [
        { title: 'Prepare Q1 impact report for Bolton Council', status: 'In Progress', priority: 'High', assignee_id: staff[3].id, project_id: projects[2].id, due_date: '2026-03-01', description: 'Compile attendance figures, feedback data, and impact metrics.' },
        { title: 'Book MMU workshop rooms for March', status: 'To Do', priority: 'Medium', assignee_id: staff[2].id, project_id: projects[0].id, due_date: '2026-02-28', description: 'Contact Sarah Thompson to confirm room bookings.' },
        { title: 'Update recovery resource pack', status: 'In Progress', priority: 'Medium', assignee_id: staff[1].id, project_id: null, due_date: '2026-03-15', description: 'Review and update with latest helpline numbers and referral pathways.' },
        { title: 'Invoice Salford City College for Spring workshops', status: 'To Do', priority: 'High', assignee_id: staff[3].id, project_id: projects[1].id, due_date: '2026-02-25', description: 'Raise invoice for completed Spring term workshop sessions.' },
        { title: 'Mentor training session 4 prep', status: 'To Do', priority: 'Medium', assignee_id: staff[1].id, project_id: projects[3].id, due_date: '2026-03-05', description: 'Prepare materials: Active listening techniques.' },
        { title: 'Social media content calendar for March', status: 'Done', priority: 'Low', assignee_id: staff[0].id, project_id: null, due_date: '2026-02-20', description: 'Plan social media posts for Gambling Awareness Week.' },
        { title: 'Follow up with Keiran Flood re: re-engagement', status: 'To Do', priority: 'Urgent', assignee_id: staff[4].id, project_id: null, due_date: '2026-03-01', description: 'Reach out to Keiran to discuss returning to coaching sessions.' },
        { title: 'Review GamCare cross-referral agreement', status: 'Done', priority: 'Medium', assignee_id: staff[0].id, project_id: null, due_date: '2026-02-15', description: 'Annual review of the cross-referral agreement with GamCare.' },
    ]);

    // 8. Contracts
    console.log('\n📄 Contracts...');
    await insert('contracts', [
        { title: 'MMU Awareness Programme 2025/26', company_id: companies[0].id, status: 'Active', value: 15000, start_date: '2025-09-01', end_date: '2026-07-31', renewal_date: '2026-06-01', type: 'Service Agreement', notes: 'Annual renewable. Covers 24 workshops, 12 drop-in sessions, and 2 staff training days.' },
        { title: 'Salford College Workshop Contract', company_id: companies[1].id, status: 'Active', value: 8000, start_date: '2025-10-01', end_date: '2026-06-30', renewal_date: '2026-05-01', type: 'Service Agreement', notes: 'Termly workshop delivery. 6 workshops per term for 3 terms.' },
        { title: 'Bolton Council Community Grant', company_id: companies[4].id, status: 'Active', value: 25000, start_date: '2025-11-01', end_date: '2026-10-31', renewal_date: '2026-08-01', type: 'Grant Agreement', notes: 'Annual grant for community outreach. Quarterly reporting required.' },
        { title: 'Betknowmore Partnership Agreement', company_id: companies[2].id, status: 'Active', value: 0, start_date: '2026-01-01', end_date: '2026-12-31', renewal_date: '2026-10-01', type: 'Partnership Agreement', notes: 'Non-financial partnership for peer mentor training and referral pathways.' },
        { title: 'GamCare Cross-Referral Agreement', company_id: companies[3].id, status: 'Active', value: 0, start_date: '2025-07-01', end_date: '2026-06-30', renewal_date: '2026-05-01', type: 'Referral Agreement', notes: 'Mutual referral pathway agreement. Annual review completed Feb 2026.' },
    ]);

    // 9. Meeting Notes
    console.log('\n📝 Meeting Notes...');
    const meetingNotes = await insert('meeting_notes', [
        { title: 'MMU Q1 Review Meeting', meeting_type: 'Face to Face', date: '2026-02-10T10:00:00Z', company_id: companies[0].id, location: 'MMU Student Services Office', agenda: 'Review Q1 workshop attendance, student feedback, plan for Gambling Awareness Week events.', notes: 'Attendance has been strong — 85% capacity. Sarah suggested adding evening session for mature students.', action_items: 'Book evening slot for March pilot. Send awareness week proposal by Feb 20.' },
        { title: 'Salford Safeguarding Check-in', meeting_type: 'Remote', date: '2026-02-05T14:00:00Z', company_id: companies[1].id, location: 'Microsoft Teams', agenda: 'Monthly safeguarding review and workshop planning.', notes: 'Lisa flagged two students showing signs of gambling issues. Agreed on referral protocol.', action_items: 'Jordan to prepare referral information pack. Follow up with Lisa.' },
        { title: 'ATO Team Weekly Stand-up', meeting_type: 'Remote', date: '2026-02-17T09:00:00Z', company_id: null, location: 'Google Meet', agenda: 'Weekly team check-in: updates, blockers, priorities.', notes: 'All updates shared. Callum reaching out to Keiran next week.', action_items: 'All: update task list by EOD.' },
    ]);

    // Meeting note junction tables
    await insert('meeting_note_contacts', [
        { meeting_note_id: meetingNotes[0].id, contact_id: contacts[0].id },
        { meeting_note_id: meetingNotes[0].id, contact_id: contacts[2].id },
        { meeting_note_id: meetingNotes[1].id, contact_id: contacts[4].id },
    ]);
    await insert('meeting_note_staff', [
        { meeting_note_id: meetingNotes[0].id, staff_id: staff[0].id },
        { meeting_note_id: meetingNotes[0].id, staff_id: staff[2].id },
        { meeting_note_id: meetingNotes[1].id, staff_id: staff[2].id },
        { meeting_note_id: meetingNotes[2].id, staff_id: staff[0].id },
        { meeting_note_id: meetingNotes[2].id, staff_id: staff[1].id },
        { meeting_note_id: meetingNotes[2].id, staff_id: staff[2].id },
        { meeting_note_id: meetingNotes[2].id, staff_id: staff[3].id },
        { meeting_note_id: meetingNotes[2].id, staff_id: staff[4].id },
    ]);

    // 10. Prevention Schedule
    console.log('\n📅 Prevention Schedule...');
    await insert('prevention_schedule', [
        { title: 'Gambling Awareness: Know the Risks', workshop_type: 'Awareness', company_id: companies[0].id, contact_id: contacts[0].id, facilitator_id: staff[2].id, date: '2026-03-03T10:00:00Z', end_time: '2026-03-03T12:00:00Z', location: 'MMU — Room B204', status: 'Scheduled', max_capacity: 30, notes: 'Part of Gambling Awareness Week.' },
        { title: 'Online Safety & Gambling for Young People', workshop_type: 'Prevention', company_id: companies[1].id, contact_id: contacts[3].id, facilitator_id: staff[2].id, date: '2026-02-18T13:00:00Z', end_time: '2026-02-18T15:00:00Z', location: 'Salford City College — Hall A', status: 'Completed', attendee_count: 24, max_capacity: 30, notes: 'Safeguarding team present. Two referrals made.', feedback: 'Excellent session. Students were engaged throughout.' },
        { title: 'Financial Literacy & Gambling Harms', workshop_type: 'Awareness', company_id: companies[0].id, contact_id: contacts[1].id, facilitator_id: staff[2].id, date: '2026-03-10T14:00:00Z', end_time: '2026-03-10T16:00:00Z', location: 'MMU — Student Union', status: 'Scheduled', max_capacity: 40, notes: 'Cross-departmental event.' },
        { title: 'Community Awareness Drop-in', workshop_type: 'Awareness', company_id: companies[4].id, contact_id: contacts[11].id, facilitator_id: staff[0].id, date: '2026-03-08T10:00:00Z', end_time: '2026-03-08T13:00:00Z', location: 'Bolton Community Centre', status: 'Scheduled', max_capacity: 50, notes: 'Open community event.' },
        { title: 'Staff Gambling Awareness Training', workshop_type: 'Training', company_id: companies[0].id, contact_id: contacts[2].id, facilitator_id: staff[0].id, date: '2026-02-10T09:30:00Z', end_time: '2026-02-10T12:30:00Z', location: 'MMU — Staff Training Suite', status: 'Completed', attendee_count: 18, max_capacity: 20, notes: 'Training for student services staff.', feedback: 'Very informative. Staff feel more confident.' },
        { title: 'Gambling Harm & Mental Health', workshop_type: 'Prevention', company_id: companies[1].id, contact_id: contacts[4].id, facilitator_id: staff[2].id, date: '2026-03-18T10:00:00Z', end_time: '2026-03-18T12:00:00Z', location: 'Salford City College — Room 105', status: 'Scheduled', max_capacity: 25, notes: 'Focus on mental health and gambling co-occurrence.' },
    ]);

    // 11. Invoices
    console.log('\n💷 Invoices...');
    await insert('invoices', [
        { invoice_number: 'ATO-2026-001', company_id: companies[0].id, amount: 3750, status: 'Paid', category: 'Prevention', date_issued: '2025-12-15', date_due: '2026-01-15', date_paid: '2026-01-10', description: 'Q1 Workshop Delivery — MMU Awareness Programme (6 sessions)' },
        { invoice_number: 'ATO-2026-002', company_id: companies[1].id, amount: 2666, status: 'Paid', category: 'Prevention', date_issued: '2025-12-20', date_due: '2026-01-20', date_paid: '2026-01-18', description: 'Autumn Term Workshop Series — Salford City College (6 sessions)' },
        { invoice_number: 'ATO-2026-003', company_id: companies[4].id, amount: 6250, status: 'Paid', category: 'Prevention', date_issued: '2026-01-05', date_due: '2026-02-05', date_paid: '2026-02-01', description: 'Q4 2025 Community Outreach — Bolton Council Grant Drawdown' },
        { invoice_number: 'ATO-2026-004', company_id: companies[0].id, amount: 3750, status: 'Sent', category: 'Prevention', date_issued: '2026-02-15', date_due: '2026-03-15', description: 'Q2 Workshop Delivery — MMU Awareness Programme (6 sessions)' },
        { invoice_number: 'ATO-2026-005', company_id: companies[1].id, amount: 2666, status: 'Draft', category: 'Prevention', description: 'Spring Term Workshop Series — Salford City College' },
        { invoice_number: 'ATO-2026-006', company_id: companies[4].id, amount: 6250, status: 'Sent', category: 'Prevention', date_issued: '2026-02-10', date_due: '2026-03-10', description: 'Q1 2026 Community Outreach — Bolton Council Grant Drawdown' },
        { invoice_number: 'ATO-2026-R01', company_id: companies[2].id, amount: 1500, status: 'Paid', category: 'Recovery', date_issued: '2025-11-01', date_due: '2025-12-01', date_paid: '2025-11-28', description: 'Q4 2025 Peer Mentor Training Programme — Betknowmore UK' },
        { invoice_number: 'ATO-2026-R02', company_id: companies[3].id, amount: 2000, status: 'Sent', category: 'Recovery', date_issued: '2026-01-15', date_due: '2026-02-15', description: 'Cross-referral pathway administration — GamCare' },
        { invoice_number: 'ATO-2026-R03', company_id: companies[2].id, amount: 1200, status: 'Draft', category: 'Recovery', description: 'Recovery Seeker Welcome Pack printing and materials' },
    ]);

    // 12. Targets
    console.log('\n🎯 Targets...');
    await insert('targets', [
        { name: 'Workshops Delivered', category: 'Awareness', metric: 'sessions', current_value: 28, goal_value: 48, deadline: '2026-07-31', description: 'Total awareness workshops delivered.' },
        { name: 'Community Members Reached', category: 'Awareness', metric: 'people', current_value: 680, goal_value: 1500, deadline: '2026-07-31', description: 'Total unique individuals attending workshops.' },
        { name: 'Active Recovery Seekers', category: 'Recovery', metric: 'seekers', current_value: 4, goal_value: 15, deadline: '2026-12-31', description: 'Number of recovery seekers actively enrolled.' },
        { name: 'Recovery Programme Completions', category: 'Recovery', metric: 'completions', current_value: 1, goal_value: 8, deadline: '2026-12-31', description: 'Number of seekers completing the programme.' },
        { name: 'Revenue Generated', category: 'Financial', metric: 'GBP', current_value: 25332, goal_value: 60000, deadline: '2026-12-31', description: 'Total revenue from contracts, grants, and delivery.' },
        { name: 'Partner Organisations', category: 'Engagement', metric: 'partners', current_value: 5, goal_value: 12, deadline: '2026-12-31', description: 'Active partner organisations.' },
        { name: 'Peer Mentors Trained', category: 'Recovery', metric: 'mentors', current_value: 1, goal_value: 6, deadline: '2026-12-31', description: 'Recovered individuals trained as peer mentors.' },
    ]);

    // 13. Templates
    console.log('\n📋 Templates...');
    await insert('templates', [
        { name: 'Workshop Booking Confirmation', category: 'Email', content: 'Dear [Contact Name],\n\nThank you for booking a workshop with Against the Odds.\n\nWorkshop: [Workshop Title]\nDate: [Date]\nTime: [Time]\nLocation: [Venue]\n\nBest regards,\nAgainst the Odds', description: 'Confirmation email after workshop booking.' },
        { name: 'Invoice Template', category: 'Invoice', content: 'INVOICE\n\nAgainst the Odds\n\nInvoice No: [Number]\nDate: [Date]\nDue: [Due Date]\n\nBill To: [Company]\n\nDescription: [Service]\nAmount: £[Amount]', description: 'Standard invoice template.' },
        { name: 'Quarterly Impact Report', category: 'Report', content: '# Against the Odds — Quarterly Impact Report\n\n## Awareness & Prevention\n- Workshops delivered: [X]\n- People reached: [X]\n\n## Recovery\n- Active seekers: [X]\n- Completions: [X]', description: 'Quarterly report template for funders.' },
        { name: 'Meeting Follow-up Email', category: 'Email', content: 'Hi [Name],\n\nThank you for meeting with us on [Date].\n\nSummary:\n[Meeting Summary]\n\nAction items:\n- [Action 1]\n\nBest regards,\n[Staff Name]', description: 'Follow-up email after meetings.' },
    ]);

    // 14. Prevention Resources
    console.log('\n📚 Prevention Resources...');
    await insert('prevention_resources', [
        { name: 'Gambling Awareness Slide Deck', workshop_type: 'Awareness', file_type: 'Presentation', description: 'Main slide deck for introductory gambling awareness sessions.', size: '4.2 MB' },
        { name: 'Online Safety Handout', workshop_type: 'Prevention', file_type: 'PDF', description: 'Handout covering online gambling risks, loot boxes, and social media advertising.', size: '1.1 MB' },
        { name: 'Workshop Feedback Form', workshop_type: 'Awareness', file_type: 'Form', description: 'Post-workshop evaluation form.', size: '320 KB' },
        { name: 'Know the Risks Activity Pack', workshop_type: 'Awareness', file_type: 'PDF', description: 'Interactive activity pack for ages 14-18.', size: '2.8 MB' },
        { name: 'Staff Training Guide', workshop_type: 'Training', file_type: 'PDF', description: 'Training manual for workshop facilitators.', size: '3.5 MB' },
        { name: 'Community Awareness Poster', workshop_type: 'Awareness', file_type: 'Image', description: 'Printable A3 poster with QR code to support services.', size: '8.7 MB' },
    ]);

    // 15. Recovery Resources
    console.log('\n📖 Recovery Resources...');
    await insert('recovery_resources', [
        { name: 'Recovery Coaching Session Plan', category: 'Coaching', file_type: 'PDF', description: 'Structured session plan template for 1-to-1 coaching.', size: '890 KB' },
        { name: 'Self-Assessment Questionnaire', category: 'Assessment', file_type: 'Form', description: 'Initial self-assessment form for new recovery seekers.', size: '420 KB' },
        { name: 'Peer Mentor Handbook', category: 'Training', file_type: 'PDF', description: 'Handbook covering mentoring techniques and boundaries.', size: '2.3 MB' },
        { name: 'Recovery Progress Template', category: 'Tracking', file_type: 'Spreadsheet', description: 'Weekly progress tracking template.', size: '560 KB' },
        { name: 'Signposting Directory', category: 'Reference', file_type: 'PDF', description: 'Directory of external support services.', size: '1.2 MB' },
    ]);

    console.log('\n✅ Done! All seed data inserted.\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Staff login credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    for (const s of staffData) {
        console.log(`  ${s.email}  →  ATO-${s.first_name}-2026!`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
