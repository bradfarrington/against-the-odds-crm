import { supabase } from './supabaseClient';

// ─── Helpers ──────────────────────────────────────────────────

/** Convert snake_case DB row to camelCase JS object */
function toCamel(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toCamel);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        out[camel] = v;
    }
    return out;
}

/** Convert camelCase JS object to snake_case for DB */
function toSnake(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toSnake);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        const snake = k.replace(/([A-Z])/g, '_$1').toLowerCase();
        out[snake] = v;
    }
    return out;
}

/** Throw on Supabase errors */
function handleError(result) {
    if (result.error) throw new Error(result.error.message);
    return result.data;
}

// ─── Generic CRUD ──────────────────────────────────────────────

async function fetchAll(table, orderBy = 'created_at') {
    const res = await supabase.from(table).select('*').order(orderBy, { ascending: true });
    return handleError(res).map(toCamel);
}

async function insertRow(table, data) {
    const res = await supabase.from(table).insert(toSnake(data)).select().single();
    return toCamel(handleError(res));
}

async function updateRow(table, id, data) {
    const { id: _id, ...rest } = data;
    const res = await supabase.from(table).update(toSnake(rest)).eq('id', id).select().single();
    return toCamel(handleError(res));
}

async function deleteRow(table, id) {
    const res = await supabase.from(table).delete().eq('id', id);
    handleError(res);
}

// ─── Collection-specific APIs ──────────────────────────────────

// Companies
export const fetchCompanies = () => fetchAll('companies');
export const createCompany = (d) => insertRow('companies', d);
export const modifyCompany = (id, d) => updateRow('companies', id, d);
export const removeCompany = (id) => deleteRow('companies', id);

// Contacts
export const fetchContacts = () => fetchAll('contacts');
export const createContact = (d) => insertRow('contacts', d);
export const modifyContact = (id, d) => updateRow('contacts', id, d);
export const removeContact = (id) => deleteRow('contacts', id);

// Recovery Seekers (with nested substance_use & coaching_sessions)
export async function fetchRecoverySeekers() {
    const seekers = await fetchAll('recovery_seekers');
    const substances = await fetchAll('substance_use');
    const sessions = await fetchAll('coaching_sessions');
    return seekers.map(s => ({
        ...s,
        substanceUse: substances.filter(su => su.seekerId === s.id),
        coachingSessions: sessions.filter(cs => cs.seekerId === s.id),
    }));
}
export const createSeeker = (d) => {
    const { substanceUse, coachingSessions, ...rest } = d;
    return insertRow('recovery_seekers', rest);
};
export const modifySeeker = (id, d) => {
    const { substanceUse, coachingSessions, ...rest } = d;
    return updateRow('recovery_seekers', id, rest);
};
export const removeSeeker = async (id) => {
    // cascade will handle child rows
    await deleteRow('recovery_seekers', id);
};

// Substance Use
export const createSubstanceUse = (d) => insertRow('substance_use', d);
export const removeSubstanceUse = (id) => deleteRow('substance_use', id);

// Coaching Sessions
export const createCoachingSession = (d) => insertRow('coaching_sessions', d);
export const modifyCoachingSession = (id, d) => updateRow('coaching_sessions', id, d);
export const removeCoachingSession = (id) => deleteRow('coaching_sessions', id);

// Campaigns
export const fetchCampaigns = () => fetchAll('campaigns');
export const createCampaign = (d) => insertRow('campaigns', d);
export const modifyCampaign = (id, d) => updateRow('campaigns', id, d);
export const removeCampaign = (id) => deleteRow('campaigns', id);

// Staff
export const fetchStaff = () => fetchAll('staff');
export const createStaffMember = (d) => insertRow('staff', d);
export const modifyStaffMember = (id, d) => updateRow('staff', id, d);
export const removeStaffMember = async (id) => {
    // Attempt edge function deletion (which deletes the auth user)
    // If it fails because the user isn't logged in, or we are running locally without edge functions, fallback to DB delete.
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        if (session && supabaseUrl) {
            const res = await fetch(`${supabaseUrl}/functions/v1/admin-delete-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ userId: id })
            });

            if (!res.ok) {
                console.warn('Edge function deletion failed, falling back to direct table deletion.');
                await deleteRow('staff', id);
            }
        } else {
            await deleteRow('staff', id);
        }
    } catch (e) {
        console.warn('Fallback: direct staff table deletion.', e);
        await deleteRow('staff', id);
    }
};

export async function fetchProjects() {
    const projects = await fetchAll('projects');
    let ps = [];
    try {
        const result = await supabase.from('project_staff').select('*');
        if (result.data) {
            ps = result.data;
        }
    } catch (e) {
        console.warn('project_staff table might not exist yet', e);
    }
    return projects.map(p => ({
        ...p,
        staffIds: ps.filter(r => r.project_id === p.id).map(r => r.staff_id),
    }));
}

export async function createProject(d) {
    const { staffIds = [], ...rest } = d;
    const project = await insertRow('projects', rest);
    if (staffIds.length) {
        try {
            await supabase.from('project_staff').insert(
                staffIds.map(sid => ({ project_id: project.id, staff_id: sid }))
            );
        } catch (e) {
            console.warn('Could not insert project staff', e);
        }
    }
    return { ...project, staffIds };
}

export async function modifyProject(id, d) {
    const { staffIds, ...rest } = d;
    const project = await updateRow('projects', id, rest);
    if (staffIds !== undefined) {
        try {
            await supabase.from('project_staff').delete().eq('project_id', id);
            if (staffIds.length) {
                await supabase.from('project_staff').insert(
                    staffIds.map(sid => ({ project_id: id, staff_id: sid }))
                );
            }
        } catch (e) {
            console.warn('Could not update project staff', e);
        }
    }
    return { ...project, staffIds: staffIds ?? [] };
}

export const removeProject = (id) => deleteRow('projects', id);

export const addProjectStaffMember = (projectId, staffId) =>
    supabase.from('project_staff').insert({ project_id: projectId, staff_id: staffId });
export const removeProjectStaffMember = (projectId, staffId) =>
    supabase.from('project_staff').delete().eq('project_id', projectId).eq('staff_id', staffId);

// Tasks
export const fetchTasks = () => fetchAll('tasks');
export const createTask = (d) => insertRow('tasks', d);
export const modifyTask = (id, d) => updateRow('tasks', id, d);
export const removeTask = (id) => deleteRow('tasks', id);

// Contracts
export const fetchContracts = () => fetchAll('contracts');
export const createContract = (d) => insertRow('contracts', d);
export const modifyContract = (id, d) => updateRow('contracts', id, d);
export const removeContract = (id) => deleteRow('contracts', id);

// Meeting Notes (with junction tables)
export async function fetchMeetingNotes() {
    const notes = await fetchAll('meeting_notes');
    const { data: mnContacts } = await supabase.from('meeting_note_contacts').select('*');
    const { data: mnStaff } = await supabase.from('meeting_note_staff').select('*');
    return notes.map(n => ({
        ...n,
        contactIds: (mnContacts || []).filter(mc => mc.meeting_note_id === n.id).map(mc => mc.contact_id),
        attendeeStaffIds: (mnStaff || []).filter(ms => ms.meeting_note_id === n.id).map(ms => ms.staff_id),
    }));
}

export async function createMeetingNote(d) {
    const { contactIds = [], attendeeStaffIds = [], ...rest } = d;
    const note = await insertRow('meeting_notes', rest);
    if (contactIds.length) {
        await supabase.from('meeting_note_contacts').insert(
            contactIds.map(cid => ({ meeting_note_id: note.id, contact_id: cid }))
        );
    }
    if (attendeeStaffIds.length) {
        await supabase.from('meeting_note_staff').insert(
            attendeeStaffIds.map(sid => ({ meeting_note_id: note.id, staff_id: sid }))
        );
    }
    return { ...note, contactIds, attendeeStaffIds };
}

export async function modifyMeetingNote(id, d) {
    const { contactIds, attendeeStaffIds, ...rest } = d;
    const note = await updateRow('meeting_notes', id, rest);
    if (contactIds !== undefined) {
        await supabase.from('meeting_note_contacts').delete().eq('meeting_note_id', id);
        if (contactIds.length) {
            await supabase.from('meeting_note_contacts').insert(
                contactIds.map(cid => ({ meeting_note_id: id, contact_id: cid }))
            );
        }
    }
    if (attendeeStaffIds !== undefined) {
        await supabase.from('meeting_note_staff').delete().eq('meeting_note_id', id);
        if (attendeeStaffIds.length) {
            await supabase.from('meeting_note_staff').insert(
                attendeeStaffIds.map(sid => ({ meeting_note_id: id, staff_id: sid }))
            );
        }
    }
    return { ...note, contactIds: contactIds || [], attendeeStaffIds: attendeeStaffIds || [] };
}

export const removeMeetingNote = (id) => deleteRow('meeting_notes', id);

// Prevention Schedule
export const fetchPreventionSchedule = () => fetchAll('prevention_schedule');
export const createWorkshop = (d) => insertRow('prevention_schedule', d);
export const modifyWorkshop = (id, d) => updateRow('prevention_schedule', id, d);
export const removeWorkshop = (id) => deleteRow('prevention_schedule', id);

// Invoices
export const fetchInvoices = () => fetchAll('invoices');
export const createInvoice = (d) => insertRow('invoices', d);
export const modifyInvoice = (id, d) => updateRow('invoices', id, d);
export const removeInvoice = (id) => deleteRow('invoices', id);

// Targets
export const fetchTargets = () => fetchAll('targets');
export const createTarget = (d) => insertRow('targets', d);
export const modifyTarget = (id, d) => updateRow('targets', id, d);
export const removeTarget = (id) => deleteRow('targets', id);

// Templates
export const fetchTemplates = () => fetchAll('templates');
export const createTemplate = (d) => insertRow('templates', d);
export const modifyTemplate = (id, d) => updateRow('templates', id, d);
export const removeTemplate = (id) => deleteRow('templates', id);

// Prevention Resources
export const fetchPreventionResources = () => fetchAll('prevention_resources', 'uploaded_at');
export const createPreventionResource = (d) => insertRow('prevention_resources', d);
export const modifyPreventionResource = (id, d) => updateRow('prevention_resources', id, d);
export const removePreventionResource = (id) => deleteRow('prevention_resources', id);

// Recovery Resources
export const fetchRecoveryResources = () => fetchAll('recovery_resources', 'uploaded_at');
export const createRecoveryResource = (d) => insertRow('recovery_resources', d);
export const modifyRecoveryResource = (id, d) => updateRow('recovery_resources', id, d);
export const removeRecoveryResource = (id) => deleteRow('recovery_resources', id);

// Task Categories
export const fetchTaskCategories = () => fetchAll('task_categories', 'sort_order');
export const createTaskCategory = (d) => insertRow('task_categories', d);
export const modifyTaskCategory = (id, d) => updateRow('task_categories', id, d);
export const removeTaskCategory = (id) => deleteRow('task_categories', id);

// Workshop Stages
export const fetchWorkshopStages = () => fetchAll('workshop_stages', 'sort_order');
export const createWorkshopStage = (d) => insertRow('workshop_stages', d);
export const modifyWorkshopStage = (id, d) => updateRow('workshop_stages', id, d);
export const removeWorkshopStage = (id) => deleteRow('workshop_stages', id);
export async function reorderWorkshopStages(updates) {
    await Promise.all(
        updates.map(({ id, sortOrder }) =>
            supabase.from('workshop_stages').update({ sort_order: sortOrder }).eq('id', id)
        )
    );
}

// ─── Surveys ──────────────────────────────────────────────────

export async function fetchSurveys(type) {
    let query = supabase
        .from('surveys')
        .select('*, survey_questions(count)')
        .order('created_at', { ascending: false });
    if (type) query = query.eq('type', type);
    const res = await query;
    const data = handleError(res);
    return data.map(row => ({
        ...toCamel(row),
        questionCount: row.survey_questions?.[0]?.count ?? 0,
    }));
}

export const createSurvey = (d) => insertRow('surveys', d);
export const modifySurvey = (id, d) => updateRow('surveys', id, d);
export const removeSurvey = (id) => deleteRow('surveys', id);

// Survey Questions

export async function fetchSurveyQuestions(surveyId) {
    const res = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('sort_order', { ascending: true });
    return handleError(res).map(toCamel);
}

export const createSurveyQuestion = (d) => insertRow('survey_questions', d);
export const modifySurveyQuestion = (id, d) => updateRow('survey_questions', id, d);
export const removeSurveyQuestion = (id) => deleteRow('survey_questions', id);

export async function reorderSurveyQuestions(updates) {
    await Promise.all(
        updates.map(({ id, sortOrder }) =>
            supabase.from('survey_questions').update({ sort_order: sortOrder }).eq('id', id)
        )
    );
}

// Survey Responses

export async function fetchSurveyResponses(surveyId) {
    const res = await supabase
        .from('survey_responses')
        .select('*, survey_answers(*)')
        .eq('survey_id', surveyId)
        .order('submitted_at', { ascending: false });
    return handleError(res).map(row => ({
        ...toCamel(row),
        answers: (row.survey_answers || []).map(toCamel),
    }));
}

export const createSurveyResponse = (d) => insertRow('survey_responses', d);

export async function submitSurveyAnswers(responseId, answers) {
    const rows = answers.map(a => ({
        response_id: responseId,
        question_id: a.questionId,
        value: a.value,
    }));
    const res = await supabase.from('survey_answers').insert(rows);
    handleError(res);
}

// Public Survey (anon access — RLS policies allow select on surveys/questions, insert on responses/answers)

export async function fetchPublicSurvey(token) {
    const res = await supabase
        .from('surveys')
        .select('*, survey_questions(*)')
        .eq('public_token', token)
        .eq('status', 'active')
        .single();
    if (res.error) return null;
    const row = res.data;
    const survey = toCamel({ ...row, survey_questions: undefined });
    const questions = (row.survey_questions || [])
        .map(toCamel)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    return { survey, questions };
}

export async function submitPublicSurveyResponse(surveyId, answers, metadata = {}) {
    const responseRes = await supabase
        .from('survey_responses')
        .insert({ survey_id: surveyId, respondent_type: 'external', metadata })
        .select()
        .single();
    if (responseRes.error) throw new Error(responseRes.error.message);
    const response = toCamel(responseRes.data);
    await submitSurveyAnswers(response.id, answers);
}
