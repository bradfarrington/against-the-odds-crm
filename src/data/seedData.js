import { v4 as uuid } from 'uuid';

export const seedCompanies = [
  {
    id: uuid(),
    name: 'Manchester Metropolitan University',
    type: 'University',
    industry: 'Education',
    address: '53 All Saints, Manchester M15 6BH',
    phone: '0161 247 1234',
    email: 'partnerships@mmu.ac.uk',
    website: 'https://www.mmu.ac.uk',
    status: 'Active',
    notes: 'Running monthly awareness workshops for students. Key partner for campus outreach programme.',
    createdAt: '2025-09-15T10:00:00Z',
  },
  {
    id: uuid(),
    name: 'Salford City College',
    type: 'College',
    industry: 'Education',
    address: 'Worsley Campus, Walkden Rd, Worsley M28 7QD',
    phone: '0161 631 5000',
    email: 'admin@salfordcc.ac.uk',
    website: 'https://www.salfordcc.ac.uk',
    status: 'Active',
    notes: 'Workshop series for 16-18 year olds on gambling awareness.',
    createdAt: '2025-10-02T09:00:00Z',
  },
  {
    id: uuid(),
    name: 'Betknowmore UK',
    type: 'Charity',
    industry: 'Gambling Support',
    address: '86-90 Paul Street, London EC2A 4NE',
    phone: '0800 066 4827',
    email: 'hello@betknowmore.co.uk',
    website: 'https://www.betknowmoreuk.org',
    status: 'Active',
    notes: 'Collaborative partner for referral pathways. Joint training programme in development.',
    createdAt: '2025-08-20T11:30:00Z',
  },
  {
    id: uuid(),
    name: 'GamCare',
    type: 'Charity',
    industry: 'Gambling Support',
    address: '91 Brick Lane, London E1 6QL',
    phone: '0808 8020 133',
    email: 'info@gamcare.org.uk',
    website: 'https://www.gamcare.org.uk',
    status: 'Partner',
    notes: 'National Gambling Helpline partner. Cross-referral agreement signed.',
    createdAt: '2025-07-10T14:00:00Z',
  },
  {
    id: uuid(),
    name: 'Bolton Council',
    type: 'Local Authority',
    industry: 'Government',
    address: 'Town Hall, Victoria Square, Bolton BL1 1RU',
    phone: '01204 333 333',
    email: 'public.health@bolton.gov.uk',
    website: 'https://www.bolton.gov.uk',
    status: 'Active',
    notes: 'Funded community outreach programme. Quarterly report required.',
    createdAt: '2025-11-05T08:45:00Z',
  },
];

export function generateSeedContacts(companies) {
  const contacts = [
    { companyIdx: 0, firstName: 'Sarah', lastName: 'Thompson', role: 'Student Wellbeing Lead', email: 's.thompson@mmu.ac.uk', phone: '0161 247 1100' },
    { companyIdx: 0, firstName: 'James', lastName: 'Patel', role: 'Campus Activities Coordinator', email: 'j.patel@mmu.ac.uk', phone: '0161 247 1101' },
    { companyIdx: 0, firstName: 'Emily', lastName: 'Roberts', role: 'Head of Student Services', email: 'e.roberts@mmu.ac.uk', phone: '0161 247 1102' },
    { companyIdx: 1, firstName: 'David', lastName: 'Chen', role: 'PSHE Coordinator', email: 'd.chen@salfordcc.ac.uk', phone: '0161 631 5001' },
    { companyIdx: 1, firstName: 'Lisa', lastName: 'Ahmed', role: 'Safeguarding Lead', email: 'l.ahmed@salfordcc.ac.uk', phone: '0161 631 5002' },
    { companyIdx: 2, firstName: 'Frankie', lastName: 'Graham', role: 'Programme Director', email: 'f.graham@betknowmore.co.uk', phone: '0800 066 4828' },
    { companyIdx: 2, firstName: 'Michael', lastName: 'Okafor', role: 'Peer Mentor Coordinator', email: 'm.okafor@betknowmore.co.uk', phone: '0800 066 4829' },
    { companyIdx: 3, firstName: 'Anna', lastName: 'Whitfield', role: 'Head of Treatment', email: 'a.whitfield@gamcare.org.uk', phone: '0808 8020 134' },
    { companyIdx: 3, firstName: 'Raj', lastName: 'Sharma', role: 'Referral Manager', email: 'r.sharma@gamcare.org.uk', phone: '0808 8020 135' },
    { companyIdx: 3, firstName: 'Claire', lastName: 'Donovan', role: 'Research Analyst', email: 'c.donovan@gamcare.org.uk', phone: '0808 8020 136' },
    { companyIdx: 4, firstName: 'Tom', lastName: 'Bradshaw', role: 'Public Health Officer', email: 't.bradshaw@bolton.gov.uk', phone: '01204 333 401' },
    { companyIdx: 4, firstName: 'Priya', lastName: 'Kaur', role: 'Community Engagement Lead', email: 'p.kaur@bolton.gov.uk', phone: '01204 333 402' },
  ];

  return contacts.map(c => ({
    id: uuid(),
    companyId: companies[c.companyIdx].id,
    firstName: c.firstName,
    lastName: c.lastName,
    role: c.role,
    email: c.email,
    phone: c.phone,
    status: 'Active',
    notes: '',
    createdAt: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
  }));
}

export const seedRecoverySeekers = [
  {
    id: uuid(),
    firstName: 'Alex',
    lastName: 'Morrison',
    dateOfBirth: '1992-03-15',
    email: 'a.morrison@email.com',
    phone: '07412 345 678',
    address: '14 Oak Road, Bolton BL3 4AB',
    gender: 'Male',
    referralSource: 'Self-referral',
    status: 'Active',
    riskLevel: 'High',
    gamblingType: 'Online slots, Sports betting',
    gamblingFrequency: 'Daily',
    gamblingDuration: '4 years',
    gamblingTriggers: 'Stress, Boredom, Social pressure',
    substanceUse: [
      { substance: 'Alcohol', frequency: 'Weekly', duration: '6 years', notes: 'Binge drinking pattern correlated with gambling episodes' },
      { substance: 'Cannabis', frequency: 'Occasional', duration: '2 years', notes: 'Used as self-medication for anxiety' },
    ],
    coachingSessions: [
      { date: '2026-01-10', notes: 'Initial assessment completed. High risk identified. Set up weekly coaching.', progressRating: 3 },
      { date: '2026-01-17', notes: 'Discussed triggers. Started trigger diary. Positive engagement.', progressRating: 4 },
      { date: '2026-01-24', notes: 'Reviewed trigger diary. Identified 3 key patterns. Created coping plan.', progressRating: 5 },
      { date: '2026-02-01', notes: 'Reported 5 gambling-free days. Used coping techniques successfully twice.', progressRating: 6 },
    ],
    notes: 'Very engaged with the programme. Strong motivation for recovery. Family support available.',
    createdAt: '2026-01-08T09:00:00Z',
  },
  {
    id: uuid(),
    firstName: 'Jessica',
    lastName: 'Barnes',
    dateOfBirth: '1988-07-22',
    email: 'j.barnes@email.com',
    phone: '07534 567 890',
    address: '7 Elm Street, Salford M6 5FG',
    gender: 'Female',
    referralSource: 'GamCare',
    status: 'Active',
    riskLevel: 'Medium',
    gamblingType: 'Online casino, Bingo',
    gamblingFrequency: '3-4 times per week',
    gamblingDuration: '2 years',
    gamblingTriggers: 'Loneliness, Financial stress',
    substanceUse: [
      { substance: 'Alcohol', frequency: 'Daily', duration: '3 years', notes: 'Evening drinking habit' },
    ],
    coachingSessions: [
      { date: '2026-01-15', notes: 'Initial assessment. Medium risk. Good awareness of problem.', progressRating: 5 },
      { date: '2026-01-29', notes: 'Installed self-exclusion tools. Discussing financial recovery plan.', progressRating: 6 },
    ],
    notes: 'Referred from GamCare. Has completed 6-week GamCare programme. Looking for ongoing support.',
    createdAt: '2026-01-12T11:30:00Z',
  },
  {
    id: uuid(),
    firstName: 'Ryan',
    lastName: 'Cooper',
    dateOfBirth: '1995-11-08',
    email: 'r.cooper@email.com',
    phone: '07623 789 012',
    address: '22 Pine Close, Manchester M20 3HJ',
    gender: 'Male',
    referralSource: 'Bolton Council',
    status: 'Active',
    riskLevel: 'High',
    gamblingType: 'Sports betting, In-play betting',
    gamblingFrequency: 'Daily',
    gamblingDuration: '6 years',
    gamblingTriggers: 'Sports events, Peer influence, Alcohol',
    substanceUse: [
      { substance: 'Alcohol', frequency: 'Daily', duration: '5 years', notes: 'Heavy drinking linked to betting sessions' },
      { substance: 'Cocaine', frequency: 'Weekend use', duration: '3 years', notes: 'Social use escalating' },
    ],
    coachingSessions: [
      { date: '2026-01-05', notes: 'Intake assessment. Severe gambling disorder with co-occurring substance issues. Referred to dual support.', progressRating: 2 },
      { date: '2026-01-12', notes: 'Discussed motivation for change. Ambivalent but attending.', progressRating: 3 },
      { date: '2026-01-19', notes: 'Missed session. Followed up by phone. Rescheduled.', progressRating: 2 },
      { date: '2026-01-26', notes: 'Attended. Opened up about financial debt. Created budget plan.', progressRating: 4 },
    ],
    notes: 'Complex case. Dual diagnosis needed. Strong family wanting to help but strained relationships.',
    createdAt: '2026-01-03T14:00:00Z',
  },
  {
    id: uuid(),
    firstName: 'Samina',
    lastName: 'Hussain',
    dateOfBirth: '1990-04-30',
    email: 's.hussain@email.com',
    phone: '07456 234 567',
    address: '9 Cedar Ave, Oldham OL1 2KL',
    gender: 'Female',
    referralSource: 'GP Referral',
    status: 'Active',
    riskLevel: 'Medium',
    gamblingType: 'Online slots',
    gamblingFrequency: 'Weekly',
    gamblingDuration: '18 months',
    gamblingTriggers: 'Anxiety, Insomnia',
    substanceUse: [],
    coachingSessions: [
      { date: '2026-02-05', notes: 'First session. Anxious but engaged. Set initial goals.', progressRating: 4 },
      { date: '2026-02-12', notes: 'Discussed anxiety management. Introduced breathing techniques.', progressRating: 5 },
    ],
    notes: 'No substance use. Gambling as coping mechanism for anxiety. Referred by GP.',
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: uuid(),
    firstName: 'Daniel',
    lastName: 'Wright',
    dateOfBirth: '1985-09-17',
    email: 'd.wright@email.com',
    phone: '07789 345 678',
    address: '31 Birch Lane, Bury BL9 6MN',
    gender: 'Male',
    referralSource: 'Self-referral',
    status: 'Completed',
    riskLevel: 'Low',
    gamblingType: 'FOBT Machines, Sports betting',
    gamblingFrequency: 'Formerly daily, now abstinent',
    gamblingDuration: '8 years (in recovery 6 months)',
    gamblingTriggers: 'Bookmakers proximity, Payday',
    substanceUse: [
      { substance: 'Alcohol', frequency: 'Formerly heavy, now moderate', duration: '10 years', notes: 'Reduced significantly since recovery programme' },
    ],
    coachingSessions: [
      { date: '2025-08-10', notes: 'Start of 12-week programme.', progressRating: 3 },
      { date: '2025-11-01', notes: 'Programme completion. 8 weeks gambling-free. Strong progress.', progressRating: 8 },
      { date: '2026-01-15', notes: '6 month check-in. Maintaining abstinence. Volunteering as peer mentor.', progressRating: 9 },
    ],
    notes: 'Success story. Completed programme. Now volunteering as peer mentor for new recovery seekers.',
    createdAt: '2025-08-05T09:00:00Z',
  },
  {
    id: uuid(),
    firstName: 'Keiran',
    lastName: 'Flood',
    dateOfBirth: '1998-01-25',
    email: 'k.flood@email.com',
    phone: '07345 678 901',
    address: '5 Maple Drive, Wigan WN1 3OP',
    gender: 'Male',
    referralSource: 'Betknowmore UK',
    status: 'On Hold',
    riskLevel: 'High',
    gamblingType: 'Crypto gambling, Online poker',
    gamblingFrequency: 'Daily',
    gamblingDuration: '3 years',
    gamblingTriggers: 'Social media ads, Crypto price movements',
    substanceUse: [
      { substance: 'MDMA', frequency: 'Monthly', duration: '2 years', notes: 'Festival/social use' },
      { substance: 'Alcohol', frequency: 'Binge weekends', duration: '4 years', notes: '' },
    ],
    coachingSessions: [
      { date: '2026-01-20', notes: 'Initial session. Resistant to engagement. Exploring motivation.', progressRating: 2 },
    ],
    notes: 'Placed on hold at own request. Dealing with housing issues. Will re-engage in March.',
    createdAt: '2026-01-18T13:00:00Z',
  },
];

export const seedCampaigns = [
  {
    id: uuid(),
    name: 'Gambling Awareness Week 2026',
    type: 'Email',
    status: 'Active',
    audience: 'All Contacts',
    subject: 'Join us for Gambling Awareness Week — Free Workshops & Resources',
    scheduledDate: '2026-03-01T09:00:00Z',
    sentCount: 245,
    openCount: 178,
    clickCount: 67,
    description: 'Annual awareness campaign targeting all contacts and partner organisations with workshop invitations and educational materials.',
    createdAt: '2026-02-10T10:00:00Z',
  },
  {
    id: uuid(),
    name: 'Recovery Stories Newsletter',
    type: 'Newsletter',
    status: 'Draft',
    audience: 'Partner Organisations',
    subject: 'Against the Odds — Monthly Recovery Stories & Impact Report',
    scheduledDate: '2026-03-15T10:00:00Z',
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    description: 'Monthly newsletter sharing anonymised recovery success stories, impact metrics, and upcoming events.',
    createdAt: '2026-02-18T14:00:00Z',
  },
  {
    id: uuid(),
    name: 'Student Workshop Outreach',
    type: 'Email',
    status: 'Completed',
    audience: 'Education Contacts',
    subject: 'Book Your Free Gambling Harm Prevention Workshop',
    scheduledDate: '2026-01-15T09:00:00Z',
    sentCount: 89,
    openCount: 72,
    clickCount: 34,
    description: 'Targeted outreach to education sector contacts promoting free workshop bookings for Spring term.',
    createdAt: '2026-01-08T11:00:00Z',
  },
];

/* ===== NEW SEED DATA ===== */

export const seedStaff = [
  { id: uuid(), firstName: 'Marcus', lastName: 'Williams', role: 'Founder & Director', dashboardRole: 'admin', email: 'marcus@againsttheodds.org.uk', phone: '07700 100 001', department: 'Leadership', status: 'Active', bio: 'Founded Against the Odds in 2023. Passionate about reducing gambling harm through education and recovery support.', createdAt: '2023-01-01T09:00:00Z' },
  { id: uuid(), firstName: 'Sophie', lastName: 'Clarke', role: 'Recovery Coach Lead', dashboardRole: 'recovery', email: 'sophie@againsttheodds.org.uk', phone: '07700 100 002', department: 'Recovery', status: 'Active', bio: 'Qualified recovery coach with 5 years experience in addiction support services.', createdAt: '2024-03-15T09:00:00Z' },
  { id: uuid(), firstName: 'Jordan', lastName: 'Mitchell', role: 'Prevention Workshop Facilitator', dashboardRole: 'prevention', email: 'jordan@againsttheodds.org.uk', phone: '07700 100 003', department: 'Prevention', status: 'Active', bio: 'Delivers awareness workshops across schools, colleges and universities in Greater Manchester.', createdAt: '2024-06-01T09:00:00Z' },
  { id: uuid(), firstName: 'Aisha', lastName: 'Rahman', role: 'Operations & Admin Manager', dashboardRole: 'admin', email: 'aisha@againsttheodds.org.uk', phone: '07700 100 004', department: 'Operations', status: 'Active', bio: 'Manages day-to-day operations, scheduling, invoicing and contract management.', createdAt: '2024-09-01T09:00:00Z' },
  { id: uuid(), firstName: 'Callum', lastName: 'O\'Brien', role: 'Recovery Coach', dashboardRole: 'recovery', email: 'callum@againsttheodds.org.uk', phone: '07700 100 005', department: 'Recovery', status: 'Active', bio: 'Specialises in young adult recovery coaching. Lived experience of gambling harm.', createdAt: '2025-01-15T09:00:00Z' },
];

export function generateSeedProjects(companies, staff) {
  return [
    { id: uuid(), name: 'MMU Campus Awareness Programme', type: 'Awareness', status: 'Active', companyId: companies[0].id, leadId: staff[2].id, description: 'Year-long gambling awareness programme for MMU students including workshops, drop-in sessions, and peer support training.', startDate: '2025-09-01', endDate: '2026-07-31', budget: 15000, notes: 'Funded by university wellbeing grant.', createdAt: '2025-08-20T10:00:00Z' },
    { id: uuid(), name: 'Salford College Workshop Series', type: 'Awareness', status: 'Active', companyId: companies[1].id, leadId: staff[2].id, description: 'Termly workshop series for 16-18 year olds covering gambling awareness, online safety, and financial literacy.', startDate: '2025-10-01', endDate: '2026-06-30', budget: 8000, notes: 'Quarterly reporting to safeguarding team required.', createdAt: '2025-09-25T09:00:00Z' },
    { id: uuid(), name: 'Bolton Community Outreach', type: 'Awareness', status: 'Active', companyId: companies[4].id, leadId: staff[0].id, description: 'Council-funded community gambling awareness programme targeting vulnerable adults in Bolton area.', startDate: '2025-11-01', endDate: '2026-10-31', budget: 25000, notes: 'Quarterly impact reports required for council funding.', createdAt: '2025-10-15T11:00:00Z' },
    { id: uuid(), name: 'Peer Mentor Training Programme', type: 'Recovery', status: 'Active', companyId: companies[2].id, leadId: staff[1].id, description: 'Joint programme with Betknowmore UK to train recovered individuals as peer mentors.', startDate: '2026-01-15', endDate: '2026-12-31', budget: 12000, notes: 'Co-delivered with Betknowmore. 6 mentors currently in training.', createdAt: '2026-01-10T10:00:00Z' },
    { id: uuid(), name: 'Digital Recovery Resources', type: 'Internal', status: 'Planning', companyId: null, leadId: staff[0].id, description: 'Development of online self-help resources, video content, and digital recovery toolkit.', startDate: '2026-04-01', endDate: '2026-09-30', budget: 5000, notes: 'Awaiting funding confirmation from lottery grant.', createdAt: '2026-02-01T14:00:00Z' },
  ];
}

export function generateSeedTasks(staff, projects) {
  return [
    { id: uuid(), title: 'Prepare Q1 impact report for Bolton Council', status: 'In Progress', priority: 'High', assigneeId: staff[3].id, projectId: projects[2].id, dueDate: '2026-03-01', description: 'Compile attendance figures, feedback data, and impact metrics for the Bolton Community Outreach quarterly report.', createdAt: '2026-02-10T09:00:00Z' },
    { id: uuid(), title: 'Book MMU workshop rooms for March', status: 'To Do', priority: 'Medium', assigneeId: staff[2].id, projectId: projects[0].id, dueDate: '2026-02-28', description: 'Contact Sarah Thompson to confirm room bookings for March workshop series.', createdAt: '2026-02-15T11:00:00Z' },
    { id: uuid(), title: 'Update recovery resource pack', status: 'In Progress', priority: 'Medium', assigneeId: staff[1].id, projectId: null, dueDate: '2026-03-15', description: 'Review and update the recovery seeker resource pack with latest helpline numbers and referral pathways.', createdAt: '2026-02-08T10:00:00Z' },
    { id: uuid(), title: 'Invoice Salford City College for Spring workshops', status: 'To Do', priority: 'High', assigneeId: staff[3].id, projectId: projects[1].id, dueDate: '2026-02-25', description: 'Raise invoice for completed Spring term workshop sessions.', createdAt: '2026-02-18T09:00:00Z' },
    { id: uuid(), title: 'Mentor training session 4 prep', status: 'To Do', priority: 'Medium', assigneeId: staff[1].id, projectId: projects[3].id, dueDate: '2026-03-05', description: 'Prepare materials for peer mentor training session 4: Active listening techniques.', createdAt: '2026-02-20T14:00:00Z' },
    { id: uuid(), title: 'Social media content calendar for March', status: 'Done', priority: 'Low', assigneeId: staff[0].id, projectId: null, dueDate: '2026-02-20', description: 'Plan social media posts for Gambling Awareness Week and ongoing engagement.', createdAt: '2026-02-05T10:00:00Z' },
    { id: uuid(), title: 'Follow up with Keiran Flood re: re-engagement', status: 'To Do', priority: 'Urgent', assigneeId: staff[4].id, projectId: null, dueDate: '2026-03-01', description: 'Reach out to Keiran to discuss returning to coaching sessions as agreed.', createdAt: '2026-02-19T09:00:00Z' },
    { id: uuid(), title: 'Review GamCare cross-referral agreement', status: 'Done', priority: 'Medium', assigneeId: staff[0].id, projectId: null, dueDate: '2026-02-15', description: 'Annual review of the cross-referral agreement with GamCare. Update terms if needed.', createdAt: '2026-01-20T11:00:00Z' },
  ];
}

export function generateSeedContracts(companies, contacts) {
  return [
    { id: uuid(), title: 'MMU Awareness Programme 2025/26', companyId: companies[0].id, contactId: contacts[2].id, status: 'Active', value: 15000, startDate: '2025-09-01', endDate: '2026-07-31', renewalDate: '2026-06-01', type: 'Service Agreement', partnershipType: 'Prevention', notes: 'Annual renewable. Covers 24 workshops, 12 drop-in sessions, and 2 staff training days.', createdAt: '2025-08-15T10:00:00Z' },
    { id: uuid(), title: 'Salford College Workshop Contract', companyId: companies[1].id, contactId: contacts[4].id, status: 'Active', value: 8000, startDate: '2025-10-01', endDate: '2026-06-30', renewalDate: '2026-05-01', type: 'Service Agreement', partnershipType: 'Prevention', notes: 'Termly workshop delivery. 6 workshops per term for 3 terms.', createdAt: '2025-09-20T09:00:00Z' },
    { id: uuid(), title: 'Bolton Council Community Grant', companyId: companies[4].id, contactId: contacts[10].id, status: 'Active', value: 25000, startDate: '2025-11-01', endDate: '2026-10-31', renewalDate: '2026-08-01', type: 'Grant Agreement', partnershipType: 'Community', notes: 'Annual grant for community outreach. Quarterly reporting required.', createdAt: '2025-10-10T11:00:00Z' },
    { id: uuid(), title: 'Betknowmore Partnership Agreement', companyId: companies[2].id, contactId: contacts[5].id, status: 'Active', value: 0, startDate: '2026-01-01', endDate: '2026-12-31', renewalDate: '2026-10-01', type: 'Partnership Agreement', partnershipType: 'Recovery', notes: 'Non-financial partnership for peer mentor training and referral pathways.', createdAt: '2025-12-15T14:00:00Z' },
    { id: uuid(), title: 'GamCare Cross-Referral Agreement', companyId: companies[3].id, contactId: contacts[8].id, status: 'Active', value: 0, startDate: '2025-07-01', endDate: '2026-06-30', renewalDate: '2026-05-01', type: 'Referral Agreement', partnershipType: 'Referral', notes: 'Mutual referral pathway agreement. Annual review completed Feb 2026.', createdAt: '2025-06-20T10:00:00Z' },
  ];
}

export function generateSeedMeetingNotes(companies, contacts, staff) {
  return [
    { id: uuid(), title: 'MMU Q1 Review Meeting', meetingType: 'Face to Face', date: '2026-02-10T10:00:00Z', companyId: companies[0].id, contactIds: [contacts[0].id, contacts[2].id], attendeeStaffIds: [staff[0].id, staff[2].id], location: 'MMU Student Services Office', agenda: 'Review Q1 workshop attendance, student feedback, plan for Gambling Awareness Week events.', notes: 'Attendance has been strong — 85% capacity across all sessions. Sarah suggested adding an evening session for mature students. Agreed to pilot in March. Emily confirmed budget for awareness week activities.', actionItems: 'Book evening slot for March pilot. Send awareness week proposal to Emily by Feb 20.', createdAt: '2026-02-10T12:00:00Z' },
    { id: uuid(), title: 'Salford Safeguarding Check-in', meetingType: 'Remote', date: '2026-02-05T14:00:00Z', companyId: companies[1].id, contactIds: [contacts[4].id], attendeeStaffIds: [staff[2].id], location: 'Microsoft Teams', agenda: 'Monthly safeguarding review and workshop planning.', notes: 'Lisa flagged two students showing signs of gambling issues after workshop. Agreed on referral protocol. Next workshop confirmed for Feb 18.', actionItems: 'Jordan to prepare referral information pack. Follow up with Lisa on referred students.', createdAt: '2026-02-05T15:30:00Z' },
    { id: uuid(), title: 'Betknowmore Peer Mentor Planning', meetingType: 'Remote', date: '2026-01-28T11:00:00Z', companyId: companies[2].id, contactIds: [contacts[5].id, contacts[6].id], attendeeStaffIds: [staff[0].id, staff[1].id], location: 'Zoom', agenda: 'Review mentor recruitment, discuss training curriculum, set milestones.', notes: '6 candidates selected for mentor training. Frankie offered to co-facilitate sessions 3 and 4. Curriculum outline agreed — 8 sessions over 4 months.', actionItems: 'Sophie to finalise session plans. Marcus to draft MOU with training milestones.', createdAt: '2026-01-28T13:00:00Z' },
    { id: uuid(), title: 'Bolton Council Quarterly Report Review', meetingType: 'Face to Face', date: '2026-01-20T09:30:00Z', companyId: companies[4].id, contactIds: [contacts[10].id, contacts[11].id], attendeeStaffIds: [staff[0].id, staff[3].id], location: 'Bolton Town Hall', agenda: 'Present Q4 2025 impact data, discuss 2026 programme plans, budget review.', notes: 'Council pleased with outreach numbers — 340 community members reached in Q4. Tom requested more data on demographic breakdowns. Priya suggested partnership with local GP surgeries for referral pathway.', actionItems: 'Aisha to add demographic data to Q1 report template. Marcus to contact local GP practices.', createdAt: '2026-01-20T12:00:00Z' },
    { id: uuid(), title: 'ATO Team Weekly Stand-up', meetingType: 'Remote', date: '2026-02-17T09:00:00Z', companyId: null, contactIds: [], attendeeStaffIds: [staff[0].id, staff[1].id, staff[2].id, staff[3].id, staff[4].id], location: 'Google Meet', agenda: 'Weekly team check-in: updates, blockers, priorities.', notes: 'Jordan: 3 workshops delivered this week, all positive feedback. Sophie: Samina and Alex progressing well. Callum: Reaching out to Keiran next week. Aisha: Invoicing up to date, Q1 report in progress. Marcus: Gambling Awareness Week planning on track.', actionItems: 'All: update task list by EOD. Callum: contact Keiran. Jordan: submit workshop reports.', createdAt: '2026-02-17T09:45:00Z' },
  ];
}

export function generateSeedPreventionSchedule(companies, contacts, staff) {
  return [
    { id: uuid(), title: 'Gambling Awareness: Know the Risks', workshopType: 'Awareness', companyId: companies[0].id, contactId: contacts[0].id, facilitatorId: staff[2].id, date: '2026-03-03T10:00:00Z', endTime: '2026-03-03T12:00:00Z', location: 'MMU — Room B204', status: 'Scheduled', attendeeCount: null, maxCapacity: 30, notes: 'Part of Gambling Awareness Week.', feedback: '', createdAt: '2026-02-10T10:00:00Z' },
    { id: uuid(), title: 'Online Safety & Gambling for Young People', workshopType: 'Prevention', companyId: companies[1].id, contactId: contacts[3].id, facilitatorId: staff[2].id, date: '2026-02-18T13:00:00Z', endTime: '2026-02-18T15:00:00Z', location: 'Salford City College — Hall A', status: 'Completed', attendeeCount: 24, maxCapacity: 30, notes: 'Safeguarding team present. Two referrals made.', feedback: 'Excellent session. Students were engaged throughout. Very relevant content.', createdAt: '2026-02-01T09:00:00Z' },
    { id: uuid(), title: 'Financial Literacy & Gambling Harms', workshopType: 'Awareness', companyId: companies[0].id, contactId: contacts[1].id, facilitatorId: staff[2].id, date: '2026-03-10T14:00:00Z', endTime: '2026-03-10T16:00:00Z', location: 'MMU — Student Union', status: 'Scheduled', attendeeCount: null, maxCapacity: 40, notes: 'Cross-departmental event with finance support team.', feedback: '', createdAt: '2026-02-15T11:00:00Z' },
    { id: uuid(), title: 'Community Awareness Drop-in', workshopType: 'Awareness', companyId: companies[4].id, contactId: contacts[11].id, facilitatorId: staff[0].id, date: '2026-03-08T10:00:00Z', endTime: '2026-03-08T13:00:00Z', location: 'Bolton Community Centre', status: 'Scheduled', attendeeCount: null, maxCapacity: 50, notes: 'Open community event. Leaflets and resources available.', feedback: '', createdAt: '2026-02-12T10:00:00Z' },
    { id: uuid(), title: 'Staff Gambling Awareness Training', workshopType: 'Training', companyId: companies[0].id, contactId: contacts[2].id, facilitatorId: staff[0].id, date: '2026-02-10T09:30:00Z', endTime: '2026-02-10T12:30:00Z', location: 'MMU — Staff Training Suite', status: 'Completed', attendeeCount: 18, maxCapacity: 20, notes: 'Training for student services staff on identifying gambling harm indicators.', feedback: 'Very informative. Staff feel more confident in identifying and referring students.', createdAt: '2026-01-20T10:00:00Z' },
    { id: uuid(), title: 'Gambling Harm & Mental Health', workshopType: 'Prevention', companyId: companies[1].id, contactId: contacts[4].id, facilitatorId: staff[2].id, date: '2026-03-18T10:00:00Z', endTime: '2026-03-18T12:00:00Z', location: 'Salford City College — Room 105', status: 'Scheduled', attendeeCount: null, maxCapacity: 25, notes: 'Linked with PSHE curriculum. Focus on mental health and gambling co-occurrence.', feedback: '', createdAt: '2026-02-20T09:00:00Z' },
  ];
}

export function generateSeedInvoices(companies) {
  return [
    { id: uuid(), invoiceNumber: 'ATO-2026-001', companyId: companies[0].id, amount: 3750, status: 'Paid', category: 'Prevention', dateIssued: '2025-12-15', dateDue: '2026-01-15', datePaid: '2026-01-10', description: 'Q1 Workshop Delivery — MMU Awareness Programme (6 sessions)', notes: '', createdAt: '2025-12-15T10:00:00Z' },
    { id: uuid(), invoiceNumber: 'ATO-2026-002', companyId: companies[1].id, amount: 2666, status: 'Paid', category: 'Prevention', dateIssued: '2025-12-20', dateDue: '2026-01-20', datePaid: '2026-01-18', description: 'Autumn Term Workshop Series — Salford City College (6 sessions)', notes: '', createdAt: '2025-12-20T09:00:00Z' },
    { id: uuid(), invoiceNumber: 'ATO-2026-003', companyId: companies[4].id, amount: 6250, status: 'Paid', category: 'Prevention', dateIssued: '2026-01-05', dateDue: '2026-02-05', datePaid: '2026-02-01', description: 'Q4 2025 Community Outreach — Bolton Council Grant Drawdown', notes: 'Quarterly grant payment.', createdAt: '2026-01-05T11:00:00Z' },
    { id: uuid(), invoiceNumber: 'ATO-2026-004', companyId: companies[0].id, amount: 3750, status: 'Sent', category: 'Prevention', dateIssued: '2026-02-15', dateDue: '2026-03-15', datePaid: null, description: 'Q2 Workshop Delivery — MMU Awareness Programme (6 sessions)', notes: 'Includes staff training session.', createdAt: '2026-02-15T10:00:00Z' },
    { id: uuid(), invoiceNumber: 'ATO-2026-005', companyId: companies[1].id, amount: 2666, status: 'Draft', category: 'Prevention', dateIssued: null, dateDue: null, datePaid: null, description: 'Spring Term Workshop Series — Salford City College', notes: 'Awaiting confirmation of completed sessions.', createdAt: '2026-02-18T09:00:00Z' },
    { id: uuid(), invoiceNumber: 'ATO-2026-006', companyId: companies[4].id, amount: 6250, status: 'Sent', category: 'Prevention', dateIssued: '2026-02-10', dateDue: '2026-03-10', datePaid: null, description: 'Q1 2026 Community Outreach — Bolton Council Grant Drawdown', notes: '', createdAt: '2026-02-10T11:00:00Z' },
    { id: uuid(), invoiceNumber: 'ATO-2026-R01', companyId: companies[2].id, amount: 1500, status: 'Paid', category: 'Recovery', dateIssued: '2025-11-01', dateDue: '2025-12-01', datePaid: '2025-11-28', description: 'Q4 2025 Peer Mentor Training Programme — Betknowmore UK', notes: 'Joint delivery of peer mentor induction.', createdAt: '2025-11-01T10:00:00Z' },
    { id: uuid(), invoiceNumber: 'ATO-2026-R02', companyId: companies[3].id, amount: 2000, status: 'Sent', category: 'Recovery', dateIssued: '2026-01-15', dateDue: '2026-02-15', datePaid: null, description: 'Cross-referral pathway administration — GamCare', notes: 'Covers admin and coaching costs for referred seekers.', createdAt: '2026-01-15T10:00:00Z' },
    { id: uuid(), invoiceNumber: 'ATO-2026-R03', companyId: companies[2].id, amount: 1200, status: 'Draft', category: 'Recovery', dateIssued: null, dateDue: null, datePaid: null, description: 'Recovery Seeker Welcome Pack printing and materials', notes: '', createdAt: '2026-02-20T10:00:00Z' },
  ];
}

export const seedTargets = [
  { id: uuid(), name: 'Workshops Delivered', category: 'Awareness', metric: 'sessions', currentValue: 28, goalValue: 48, deadline: '2026-07-31', description: 'Total awareness workshops delivered across all partner organisations.', createdAt: '2025-09-01T10:00:00Z' },
  { id: uuid(), name: 'Community Members Reached', category: 'Awareness', metric: 'people', currentValue: 680, goalValue: 1500, deadline: '2026-07-31', description: 'Total unique individuals attending workshops and community events.', createdAt: '2025-09-01T10:00:00Z' },
  { id: uuid(), name: 'Active Recovery Seekers', category: 'Recovery', metric: 'seekers', currentValue: 4, goalValue: 15, deadline: '2026-12-31', description: 'Number of recovery seekers actively enrolled in coaching.', createdAt: '2025-09-01T10:00:00Z' },
  { id: uuid(), name: 'Recovery Programme Completions', category: 'Recovery', metric: 'completions', currentValue: 1, goalValue: 8, deadline: '2026-12-31', description: 'Number of seekers successfully completing the coaching programme.', createdAt: '2025-09-01T10:00:00Z' },
  { id: uuid(), name: 'Revenue Generated', category: 'Financial', metric: 'GBP', currentValue: 25332, goalValue: 60000, deadline: '2026-12-31', description: 'Total revenue from contracts, grants, and workshop delivery.', createdAt: '2025-09-01T10:00:00Z' },
  { id: uuid(), name: 'Partner Organisations', category: 'Engagement', metric: 'partners', currentValue: 5, goalValue: 12, deadline: '2026-12-31', description: 'Number of active partner organisations in the network.', createdAt: '2025-09-01T10:00:00Z' },
  { id: uuid(), name: 'Peer Mentors Trained', category: 'Recovery', metric: 'mentors', currentValue: 1, goalValue: 6, deadline: '2026-12-31', description: 'Recovered individuals trained and active as peer mentors.', createdAt: '2025-09-01T10:00:00Z' },
];

export const seedTemplates = [
  { id: uuid(), name: 'Workshop Booking Confirmation', category: 'Email', content: 'Dear [Contact Name],\n\nThank you for booking a gambling awareness workshop with Against the Odds.\n\nWorkshop: [Workshop Title]\nDate: [Date]\nTime: [Time]\nLocation: [Venue]\nFacilitator: [Facilitator Name]\n\nPlease ensure the room is set up with [requirements]. We will arrive 15 minutes before the session.\n\nBest regards,\nAgainst the Odds', description: 'Confirmation email sent to contacts after workshop booking.', createdAt: '2025-09-01T10:00:00Z' },
  { id: uuid(), name: 'Invoice Template', category: 'Invoice', content: 'INVOICE\n\nAgainst the Odds\n[ATO Address]\n\nInvoice No: [Number]\nDate: [Date]\nDue: [Due Date]\n\nBill To:\n[Company Name]\n[Company Address]\n\nDescription: [Service Description]\nAmount: £[Amount]\n\nPayment Terms: 30 days\nBank Details: [Bank Details]', description: 'Standard invoice template for workshop delivery and services.', createdAt: '2025-09-01T10:00:00Z' },
  { id: uuid(), name: 'Quarterly Impact Report', category: 'Report', content: '# Against the Odds — Quarterly Impact Report\n\n## Period: [Quarter] [Year]\n\n### Awareness & Prevention\n- Workshops delivered: [X]\n- People reached: [X]\n- Organisations engaged: [X]\n\n### Recovery Coaching\n- Active recovery seekers: [X]\n- Programme completions: [X]\n- Average progress rating: [X]/10\n\n### Key Achievements\n- [Achievement 1]\n- [Achievement 2]\n\n### Challenges & Next Steps\n- [Challenge 1]\n- [Next step 1]', description: 'Template for quarterly reports to funders and partners.', createdAt: '2025-09-01T10:00:00Z' },
  { id: uuid(), name: 'Recovery Seeker Welcome Pack', category: 'Workshop', content: 'Welcome to Against the Odds Recovery Coaching\n\nWhat to expect:\n- Weekly 1-to-1 coaching sessions\n- Personalised recovery plan\n- Access to peer mentor support\n- Confidential and judgement-free environment\n\nYour coach: [Coach Name]\nContact: [Coach Email / Phone]\n\nHelplines:\n- National Gambling Helpline: 0808 8020 133\n- GamCare: www.gamcare.org.uk\n- Samaritans: 116 123', description: 'Welcome information pack for new recovery seekers.', createdAt: '2025-09-01T10:00:00Z' },
  { id: uuid(), name: 'Meeting Follow-up Email', category: 'Email', content: 'Hi [Name],\n\nThank you for meeting with us on [Date].\n\nHere is a summary of what we discussed:\n\n[Meeting Summary]\n\nAction items:\n- [Action 1]\n- [Action 2]\n\nPlease let us know if you have any questions.\n\nBest regards,\n[Staff Name]\nAgainst the Odds', description: 'Follow-up email template sent after meetings.', createdAt: '2025-09-01T10:00:00Z' },
  { id: uuid(), name: 'Contract Agreement Template', category: 'Contract', content: 'SERVICE AGREEMENT\n\nBetween: Against the Odds ("Provider")\nAnd: [Organisation Name] ("Client")\n\nServices: [Description of services]\nDuration: [Start Date] to [End Date]\nValue: £[Amount]\n\nTerms:\n1. Provider will deliver [X] workshops per [period]\n2. Client will provide suitable venue and equipment\n3. Payment terms: [X] days from invoice\n4. Either party may terminate with [X] days notice\n\nSigned: _____________ Date: _____________', description: 'Standard contract template for service agreements.', createdAt: '2025-09-01T10:00:00Z' },
];

/* ===== PREVENTION RESOURCES ===== */
export const seedPreventionResources = [];

/* ===== RECOVERY RESOURCES ===== */
export const seedRecoveryResources = [];

export function getInitialData() {
  const stored = localStorage.getItem('ato-crm-data');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // If existing data doesn't have new fields, re-seed
      const hasRoles = parsed.staff && parsed.staff[0] && parsed.staff[0].dashboardRole;
      if (parsed.preventionResources && parsed.recoveryResources && hasRoles) {
        return parsed;
      }
    } catch {
      // corrupted, re-seed
    }
  }

  const companies = seedCompanies;
  const contacts = generateSeedContacts(companies);
  const recoverySeekers = seedRecoverySeekers;
  const campaigns = seedCampaigns;
  const staff = seedStaff;
  const projects = generateSeedProjects(companies, staff);
  const tasks = generateSeedTasks(staff, projects);
  const contracts = generateSeedContracts(companies, contacts);
  const meetingNotes = generateSeedMeetingNotes(companies, contacts, staff);
  const preventionSchedule = generateSeedPreventionSchedule(companies, contacts, staff);
  const invoices = generateSeedInvoices(companies);
  const targets = seedTargets;
  const templates = seedTemplates;
  const preventionResources = seedPreventionResources;
  const recoveryResources = seedRecoveryResources;

  const data = { companies, contacts, recoverySeekers, campaigns, staff, projects, tasks, contracts, meetingNotes, preventionSchedule, invoices, targets, templates, preventionResources, recoveryResources };
  localStorage.setItem('ato-crm-data', JSON.stringify(data));
  return data;
}

