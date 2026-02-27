import { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import { useAuth } from './AuthContext';
import * as api from '../lib/api';

const DataContext = createContext();

// ─── Action types ──────────────────────────────────────────────

const ACTIONS = {
    // Data loading
    SET_DATA: 'SET_DATA',
    // Companies
    ADD_COMPANY: 'ADD_COMPANY',
    UPDATE_COMPANY: 'UPDATE_COMPANY',
    DELETE_COMPANY: 'DELETE_COMPANY',
    // Contacts
    ADD_CONTACT: 'ADD_CONTACT',
    UPDATE_CONTACT: 'UPDATE_CONTACT',
    DELETE_CONTACT: 'DELETE_CONTACT',
    // Recovery Seekers
    ADD_SEEKER: 'ADD_SEEKER',
    UPDATE_SEEKER: 'UPDATE_SEEKER',
    DELETE_SEEKER: 'DELETE_SEEKER',
    ADD_COACHING_SESSION: 'ADD_COACHING_SESSION',
    UPDATE_COACHING_SESSION: 'UPDATE_COACHING_SESSION',
    DELETE_COACHING_SESSION: 'DELETE_COACHING_SESSION',
    // Campaigns
    ADD_CAMPAIGN: 'ADD_CAMPAIGN',
    UPDATE_CAMPAIGN: 'UPDATE_CAMPAIGN',
    DELETE_CAMPAIGN: 'DELETE_CAMPAIGN',
    // Projects
    ADD_PROJECT: 'ADD_PROJECT',
    UPDATE_PROJECT: 'UPDATE_PROJECT',
    DELETE_PROJECT: 'DELETE_PROJECT',
    ADD_PROJECT_STAFF: 'ADD_PROJECT_STAFF',
    REMOVE_PROJECT_STAFF: 'REMOVE_PROJECT_STAFF',
    // Tasks
    ADD_TASK: 'ADD_TASK',
    UPDATE_TASK: 'UPDATE_TASK',
    DELETE_TASK: 'DELETE_TASK',
    // Task Categories
    ADD_TASK_CATEGORY: 'ADD_TASK_CATEGORY',
    UPDATE_TASK_CATEGORY: 'UPDATE_TASK_CATEGORY',
    DELETE_TASK_CATEGORY: 'DELETE_TASK_CATEGORY',
    // Contracts
    ADD_CONTRACT: 'ADD_CONTRACT',
    UPDATE_CONTRACT: 'UPDATE_CONTRACT',
    DELETE_CONTRACT: 'DELETE_CONTRACT',
    // Meeting Notes
    ADD_MEETING_NOTE: 'ADD_MEETING_NOTE',
    UPDATE_MEETING_NOTE: 'UPDATE_MEETING_NOTE',
    DELETE_MEETING_NOTE: 'DELETE_MEETING_NOTE',
    // Prevention Schedule
    ADD_WORKSHOP: 'ADD_WORKSHOP',
    UPDATE_WORKSHOP: 'UPDATE_WORKSHOP',
    DELETE_WORKSHOP: 'DELETE_WORKSHOP',
    // Invoices
    ADD_INVOICE: 'ADD_INVOICE',
    UPDATE_INVOICE: 'UPDATE_INVOICE',
    DELETE_INVOICE: 'DELETE_INVOICE',
    // Targets
    ADD_TARGET: 'ADD_TARGET',
    UPDATE_TARGET: 'UPDATE_TARGET',
    DELETE_TARGET: 'DELETE_TARGET',
    // Templates
    ADD_TEMPLATE: 'ADD_TEMPLATE',
    UPDATE_TEMPLATE: 'UPDATE_TEMPLATE',
    DELETE_TEMPLATE: 'DELETE_TEMPLATE',
    // Staff
    ADD_STAFF: 'ADD_STAFF',
    UPDATE_STAFF: 'UPDATE_STAFF',
    DELETE_STAFF: 'DELETE_STAFF',
    // Prevention Resources
    ADD_PREVENTION_RESOURCE: 'ADD_PREVENTION_RESOURCE',
    UPDATE_PREVENTION_RESOURCE: 'UPDATE_PREVENTION_RESOURCE',
    DELETE_PREVENTION_RESOURCE: 'DELETE_PREVENTION_RESOURCE',
    // Recovery Resources
    ADD_RECOVERY_RESOURCE: 'ADD_RECOVERY_RESOURCE',
    UPDATE_RECOVERY_RESOURCE: 'UPDATE_RECOVERY_RESOURCE',
    DELETE_RECOVERY_RESOURCE: 'DELETE_RECOVERY_RESOURCE',
    // Surveys
    UPDATE_SURVEY: 'UPDATE_SURVEY',
    DELETE_SURVEY: 'DELETE_SURVEY',
    // Workshop Stages
    ADD_WORKSHOP_STAGE: 'ADD_WORKSHOP_STAGE',
    UPDATE_WORKSHOP_STAGE: 'UPDATE_WORKSHOP_STAGE',
    DELETE_WORKSHOP_STAGE: 'DELETE_WORKSHOP_STAGE',
    // Pipelines
    ADD_PIPELINE: 'ADD_PIPELINE',
    UPDATE_PIPELINE: 'UPDATE_PIPELINE',
    DELETE_PIPELINE: 'DELETE_PIPELINE',
    // Seeker Survey Answers
    UPDATE_SEEKER_SURVEY_ANSWERS: 'UPDATE_SEEKER_SURVEY_ANSWERS',
    // Company Lookup Tables
    ADD_COMPANY_TYPE: 'ADD_COMPANY_TYPE',
    UPDATE_COMPANY_TYPE: 'UPDATE_COMPANY_TYPE',
    DELETE_COMPANY_TYPE: 'DELETE_COMPANY_TYPE',
    ADD_COMPANY_INDUSTRY: 'ADD_COMPANY_INDUSTRY',
    UPDATE_COMPANY_INDUSTRY: 'UPDATE_COMPANY_INDUSTRY',
    DELETE_COMPANY_INDUSTRY: 'DELETE_COMPANY_INDUSTRY',
    ADD_COMPANY_STATUS: 'ADD_COMPANY_STATUS',
    UPDATE_COMPANY_STATUS: 'UPDATE_COMPANY_STATUS',
    DELETE_COMPANY_STATUS: 'DELETE_COMPANY_STATUS',
    // Workshop Types
    ADD_WORKSHOP_TYPE: 'ADD_WORKSHOP_TYPE',
    UPDATE_WORKSHOP_TYPE: 'UPDATE_WORKSHOP_TYPE',
    DELETE_WORKSHOP_TYPE: 'DELETE_WORKSHOP_TYPE',
    // Workshop Names (Active Workshops)
    ADD_WORKSHOP_NAME: 'ADD_WORKSHOP_NAME',
    UPDATE_WORKSHOP_NAME: 'UPDATE_WORKSHOP_NAME',
    DELETE_WORKSHOP_NAME: 'DELETE_WORKSHOP_NAME',
    // Referral Sources
    ADD_REFERRAL_SOURCE: 'ADD_REFERRAL_SOURCE',
    UPDATE_REFERRAL_SOURCE: 'UPDATE_REFERRAL_SOURCE',
    DELETE_REFERRAL_SOURCE: 'DELETE_REFERRAL_SOURCE',
    // Prevention Resource Categories
    ADD_PREVENTION_RESOURCE_CATEGORY: 'ADD_PREVENTION_RESOURCE_CATEGORY',
    UPDATE_PREVENTION_RESOURCE_CATEGORY: 'UPDATE_PREVENTION_RESOURCE_CATEGORY',
    DELETE_PREVENTION_RESOURCE_CATEGORY: 'DELETE_PREVENTION_RESOURCE_CATEGORY',
    // Recovery Resource Categories
    ADD_RECOVERY_RESOURCE_CATEGORY: 'ADD_RECOVERY_RESOURCE_CATEGORY',
    UPDATE_RECOVERY_RESOURCE_CATEGORY: 'UPDATE_RECOVERY_RESOURCE_CATEGORY',
    DELETE_RECOVERY_RESOURCE_CATEGORY: 'DELETE_RECOVERY_RESOURCE_CATEGORY',
    // Invoice Template
    SET_INVOICE_TEMPLATE: 'SET_INVOICE_TEMPLATE',
};

// ─── Initial empty state ──────────────────────────────────────

const emptyState = {
    companies: [],
    contacts: [],
    recoverySeekers: [],
    campaigns: [],
    staff: [],
    projects: [],
    tasks: [],
    taskCategories: [],
    contracts: [],
    meetingNotes: [],
    preventionSchedule: [],
    invoices: [],
    targets: [],
    templates: [],
    preventionResources: [],
    recoveryResources: [],
    surveys: [],
    workshopStages: [],
    pipelines: [],
    companyTypes: [],
    companyIndustries: [],
    companyStatuses: [],
    workshopTypes: [],
    workshopNames: [],
    referralSources: [],
    preventionResourceCategories: [],
    recoveryResourceCategories: [],
    invoiceTemplate: null,
};

// ─── Reducer ──────────────────────────────────────────────────

function crudLocal(state, collection, action) {
    switch (action.crud) {
        case 'ADD':
            return { ...state, [collection]: [...state[collection], action.payload] };
        case 'UPDATE':
            return {
                ...state,
                [collection]: state[collection].map(item =>
                    item.id === action.payload.id ? { ...item, ...action.payload } : item
                ),
            };
        case 'DELETE':
            return {
                ...state,
                [collection]: state[collection].filter(item => item.id !== action.payload),
            };
        default:
            return state;
    }
}

function dataReducer(state, action) {
    switch (action.type) {
        case ACTIONS.SET_DATA:
            return { ...state, ...action.payload };

        // Companies
        case ACTIONS.ADD_COMPANY: return crudLocal(state, 'companies', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_COMPANY: return crudLocal(state, 'companies', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_COMPANY: return crudLocal(state, 'companies', { crud: 'DELETE', payload: action.payload });

        // Contacts
        case ACTIONS.ADD_CONTACT: return crudLocal(state, 'contacts', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_CONTACT: return crudLocal(state, 'contacts', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_CONTACT: return crudLocal(state, 'contacts', { crud: 'DELETE', payload: action.payload });

        // Recovery Seekers
        case ACTIONS.ADD_SEEKER: return crudLocal(state, 'recoverySeekers', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_SEEKER: return crudLocal(state, 'recoverySeekers', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_SEEKER: return crudLocal(state, 'recoverySeekers', { crud: 'DELETE', payload: action.payload });
        case ACTIONS.ADD_COACHING_SESSION: {
            const seekerId = action.payload.seekerId || action.payload.seeker_id;
            const sessionData = action.payload.session || action.payload;
            return {
                ...state,
                recoverySeekers: state.recoverySeekers.map(s =>
                    s.id === seekerId
                        ? { ...s, coachingSessions: [...(s.coachingSessions || []), sessionData] }
                        : s
                ),
            };
        }
        case ACTIONS.UPDATE_COACHING_SESSION:
            return {
                ...state,
                recoverySeekers: state.recoverySeekers.map(s =>
                    s.id === action.payload.seekerId
                        ? {
                            ...s,
                            coachingSessions: s.coachingSessions.map(cs =>
                                cs.id === action.payload.session.id ? action.payload.session : cs
                            )
                        }
                        : s
                ),
            };
        case ACTIONS.DELETE_COACHING_SESSION:
            return {
                ...state,
                recoverySeekers: state.recoverySeekers.map(s =>
                    s.id === action.payload.seekerId
                        ? {
                            ...s,
                            coachingSessions: s.coachingSessions.filter(cs => cs.id !== action.payload.sessionId)
                        }
                        : s
                ),
            };

        // Campaigns
        case ACTIONS.ADD_CAMPAIGN: return crudLocal(state, 'campaigns', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_CAMPAIGN: return crudLocal(state, 'campaigns', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_CAMPAIGN: return crudLocal(state, 'campaigns', { crud: 'DELETE', payload: action.payload });

        // Projects
        case ACTIONS.ADD_PROJECT: return crudLocal(state, 'projects', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_PROJECT: return crudLocal(state, 'projects', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_PROJECT: return crudLocal(state, 'projects', { crud: 'DELETE', payload: action.payload });
        case ACTIONS.ADD_PROJECT_STAFF:
            return {
                ...state,
                projects: state.projects.map(p =>
                    p.id === action.payload.projectId
                        ? { ...p, staffIds: [...(p.staffIds || []), action.payload.staffId] }
                        : p
                ),
            };
        case ACTIONS.REMOVE_PROJECT_STAFF:
            return {
                ...state,
                projects: state.projects.map(p =>
                    p.id === action.payload.projectId
                        ? { ...p, staffIds: (p.staffIds || []).filter(id => id !== action.payload.staffId) }
                        : p
                ),
            };

        // Tasks
        case ACTIONS.ADD_TASK: return crudLocal(state, 'tasks', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_TASK: return crudLocal(state, 'tasks', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_TASK: return crudLocal(state, 'tasks', { crud: 'DELETE', payload: action.payload });

        // Task Categories
        case ACTIONS.ADD_TASK_CATEGORY: return crudLocal(state, 'taskCategories', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_TASK_CATEGORY: return crudLocal(state, 'taskCategories', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_TASK_CATEGORY: return crudLocal(state, 'taskCategories', { crud: 'DELETE', payload: action.payload });

        // Contracts
        case ACTIONS.ADD_CONTRACT: return crudLocal(state, 'contracts', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_CONTRACT: return crudLocal(state, 'contracts', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_CONTRACT: return crudLocal(state, 'contracts', { crud: 'DELETE', payload: action.payload });

        // Meeting Notes
        case ACTIONS.ADD_MEETING_NOTE: return crudLocal(state, 'meetingNotes', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_MEETING_NOTE: return crudLocal(state, 'meetingNotes', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_MEETING_NOTE: return crudLocal(state, 'meetingNotes', { crud: 'DELETE', payload: action.payload });

        // Prevention Schedule
        case ACTIONS.ADD_WORKSHOP: return crudLocal(state, 'preventionSchedule', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_WORKSHOP: return crudLocal(state, 'preventionSchedule', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_WORKSHOP: return crudLocal(state, 'preventionSchedule', { crud: 'DELETE', payload: action.payload });

        // Invoices
        case ACTIONS.ADD_INVOICE: return crudLocal(state, 'invoices', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_INVOICE: return crudLocal(state, 'invoices', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_INVOICE: return crudLocal(state, 'invoices', { crud: 'DELETE', payload: action.payload });

        // Targets
        case ACTIONS.ADD_TARGET: return crudLocal(state, 'targets', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_TARGET: return crudLocal(state, 'targets', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_TARGET: return crudLocal(state, 'targets', { crud: 'DELETE', payload: action.payload });

        // Templates
        case ACTIONS.ADD_TEMPLATE: return crudLocal(state, 'templates', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_TEMPLATE: return crudLocal(state, 'templates', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_TEMPLATE: return crudLocal(state, 'templates', { crud: 'DELETE', payload: action.payload });

        // Staff
        case ACTIONS.ADD_STAFF: return crudLocal(state, 'staff', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_STAFF: return crudLocal(state, 'staff', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_STAFF: return crudLocal(state, 'staff', { crud: 'DELETE', payload: action.payload });

        // Prevention Resources
        case ACTIONS.ADD_PREVENTION_RESOURCE: return crudLocal(state, 'preventionResources', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_PREVENTION_RESOURCE: return crudLocal(state, 'preventionResources', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_PREVENTION_RESOURCE: return crudLocal(state, 'preventionResources', { crud: 'DELETE', payload: action.payload });

        // Recovery Resources
        case ACTIONS.ADD_RECOVERY_RESOURCE: return crudLocal(state, 'recoveryResources', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_RECOVERY_RESOURCE: return crudLocal(state, 'recoveryResources', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_RECOVERY_RESOURCE: return crudLocal(state, 'recoveryResources', { crud: 'DELETE', payload: action.payload });

        // Surveys
        case ACTIONS.ADD_SURVEY: return crudLocal(state, 'surveys', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_SURVEY: return crudLocal(state, 'surveys', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_SURVEY: return crudLocal(state, 'surveys', { crud: 'DELETE', payload: action.payload });

        // Workshop Stages
        case ACTIONS.ADD_WORKSHOP_STAGE: return crudLocal(state, 'workshopStages', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_WORKSHOP_STAGE: return crudLocal(state, 'workshopStages', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_WORKSHOP_STAGE: return crudLocal(state, 'workshopStages', { crud: 'DELETE', payload: action.payload });

        // Pipelines
        case ACTIONS.ADD_PIPELINE: return crudLocal(state, 'pipelines', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_PIPELINE: return crudLocal(state, 'pipelines', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_PIPELINE: return crudLocal(state, 'pipelines', { crud: 'DELETE', payload: action.payload });

        // Company Lookup Tables
        case ACTIONS.ADD_COMPANY_TYPE: return crudLocal(state, 'companyTypes', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_COMPANY_TYPE: return crudLocal(state, 'companyTypes', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_COMPANY_TYPE: return crudLocal(state, 'companyTypes', { crud: 'DELETE', payload: action.payload });
        case ACTIONS.ADD_COMPANY_INDUSTRY: return crudLocal(state, 'companyIndustries', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_COMPANY_INDUSTRY: return crudLocal(state, 'companyIndustries', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_COMPANY_INDUSTRY: return crudLocal(state, 'companyIndustries', { crud: 'DELETE', payload: action.payload });
        case ACTIONS.ADD_COMPANY_STATUS: return crudLocal(state, 'companyStatuses', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_COMPANY_STATUS: return crudLocal(state, 'companyStatuses', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_COMPANY_STATUS: return crudLocal(state, 'companyStatuses', { crud: 'DELETE', payload: action.payload });

        // Workshop Types
        case ACTIONS.ADD_WORKSHOP_TYPE: return crudLocal(state, 'workshopTypes', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_WORKSHOP_TYPE: return crudLocal(state, 'workshopTypes', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_WORKSHOP_TYPE: return crudLocal(state, 'workshopTypes', { crud: 'DELETE', payload: action.payload });

        // Workshop Names
        case ACTIONS.ADD_WORKSHOP_NAME: return crudLocal(state, 'workshopNames', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_WORKSHOP_NAME: return crudLocal(state, 'workshopNames', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_WORKSHOP_NAME: return crudLocal(state, 'workshopNames', { crud: 'DELETE', payload: action.payload });

        // Referral Sources
        case ACTIONS.ADD_REFERRAL_SOURCE: return crudLocal(state, 'referralSources', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_REFERRAL_SOURCE: return crudLocal(state, 'referralSources', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_REFERRAL_SOURCE: return crudLocal(state, 'referralSources', { crud: 'DELETE', payload: action.payload });

        // Prevention Resource Categories
        case ACTIONS.ADD_PREVENTION_RESOURCE_CATEGORY: return crudLocal(state, 'preventionResourceCategories', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_PREVENTION_RESOURCE_CATEGORY: return crudLocal(state, 'preventionResourceCategories', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_PREVENTION_RESOURCE_CATEGORY: return crudLocal(state, 'preventionResourceCategories', { crud: 'DELETE', payload: action.payload });

        // Recovery Resource Categories
        case ACTIONS.ADD_RECOVERY_RESOURCE_CATEGORY: return crudLocal(state, 'recoveryResourceCategories', { crud: 'ADD', payload: action.payload });
        case ACTIONS.UPDATE_RECOVERY_RESOURCE_CATEGORY: return crudLocal(state, 'recoveryResourceCategories', { crud: 'UPDATE', payload: action.payload });
        case ACTIONS.DELETE_RECOVERY_RESOURCE_CATEGORY: return crudLocal(state, 'recoveryResourceCategories', { crud: 'DELETE', payload: action.payload });

        // Invoice Template
        case ACTIONS.SET_INVOICE_TEMPLATE: return { ...state, invoiceTemplate: action.payload };

        // Seeker Survey Answers
        case ACTIONS.UPDATE_SEEKER_SURVEY_ANSWERS: {
            const { seekerId, surveyId, answers: answerData } = action.payload;
            return {
                ...state,
                recoverySeekers: state.recoverySeekers.map(s => {
                    if (s.id !== seekerId) return s;
                    const existing = (s.surveyAnswers || []).find(sa => sa.surveyId === surveyId);
                    if (existing) {
                        return {
                            ...s,
                            surveyAnswers: s.surveyAnswers.map(sa =>
                                sa.surveyId === surveyId ? { ...sa, answers: answerData, submittedAt: new Date().toISOString() } : sa
                            ),
                        };
                    }
                    return {
                        ...s,
                        surveyAnswers: [...(s.surveyAnswers || []), { seekerId, surveyId, answers: answerData, submittedAt: new Date().toISOString() }],
                    };
                }),
            };
        }

        default:
            return state;
    }
}

// ─── Async dispatch wrapper ───────────────────────────────────
// Maps each action type to its API call so the dispatch stays synchronous
// for the UI while the API call runs in the background.

const apiMap = {
    [ACTIONS.ADD_COMPANY]: (p) => api.createCompany(p),
    [ACTIONS.UPDATE_COMPANY]: (p) => api.modifyCompany(p.id, p),
    [ACTIONS.DELETE_COMPANY]: (p) => api.removeCompany(p),

    [ACTIONS.ADD_CONTACT]: (p) => api.createContact(p),
    [ACTIONS.UPDATE_CONTACT]: (p) => api.modifyContact(p.id, p),
    [ACTIONS.DELETE_CONTACT]: (p) => api.removeContact(p),

    [ACTIONS.ADD_SEEKER]: (p) => api.createSeeker(p),
    [ACTIONS.UPDATE_SEEKER]: (p) => api.modifySeeker(p.id, p),
    [ACTIONS.DELETE_SEEKER]: (p) => api.removeSeeker(p),
    [ACTIONS.ADD_COACHING_SESSION]: (p) => api.createCoachingSession({ seekerId: p.seekerId, ...p.session }),
    [ACTIONS.UPDATE_COACHING_SESSION]: (p) => api.modifyCoachingSession(p.session.id, p.session),
    [ACTIONS.DELETE_COACHING_SESSION]: (p) => api.removeCoachingSession(p.sessionId),

    [ACTIONS.ADD_CAMPAIGN]: (p) => api.createCampaign(p),
    [ACTIONS.UPDATE_CAMPAIGN]: (p) => api.modifyCampaign(p.id, p),
    [ACTIONS.DELETE_CAMPAIGN]: (p) => api.removeCampaign(p),

    [ACTIONS.ADD_PROJECT]: (p) => api.createProject(p),
    [ACTIONS.UPDATE_PROJECT]: (p) => api.modifyProject(p.id, p),
    [ACTIONS.DELETE_PROJECT]: (p) => api.removeProject(p),
    [ACTIONS.ADD_PROJECT_STAFF]: (p) => api.addProjectStaffMember(p.projectId, p.staffId),
    [ACTIONS.REMOVE_PROJECT_STAFF]: (p) => api.removeProjectStaffMember(p.projectId, p.staffId),

    [ACTIONS.ADD_TASK]: (p) => api.createTask(p),
    [ACTIONS.UPDATE_TASK]: (p) => api.modifyTask(p.id, p),
    [ACTIONS.DELETE_TASK]: (p) => api.removeTask(p),

    [ACTIONS.ADD_TASK_CATEGORY]: (p) => api.createTaskCategory(p),
    [ACTIONS.UPDATE_TASK_CATEGORY]: (p) => api.modifyTaskCategory(p.id, p),
    [ACTIONS.DELETE_TASK_CATEGORY]: (p) => api.removeTaskCategory(p),

    [ACTIONS.ADD_CONTRACT]: (p) => api.createContract(p),
    [ACTIONS.UPDATE_CONTRACT]: (p) => api.modifyContract(p.id, p),
    [ACTIONS.DELETE_CONTRACT]: (p) => api.removeContract(p),

    [ACTIONS.ADD_MEETING_NOTE]: (p) => api.createMeetingNote(p),
    [ACTIONS.UPDATE_MEETING_NOTE]: (p) => api.modifyMeetingNote(p.id, p),
    [ACTIONS.DELETE_MEETING_NOTE]: (p) => api.removeMeetingNote(p),

    [ACTIONS.ADD_WORKSHOP]: (p) => api.createWorkshop(p),
    [ACTIONS.UPDATE_WORKSHOP]: (p) => api.modifyWorkshop(p.id, p),
    [ACTIONS.DELETE_WORKSHOP]: (p) => api.removeWorkshop(p),

    [ACTIONS.ADD_INVOICE]: (p) => api.createInvoice(p),
    [ACTIONS.UPDATE_INVOICE]: (p) => api.modifyInvoice(p.id, p),
    [ACTIONS.DELETE_INVOICE]: (p) => api.removeInvoice(p),

    [ACTIONS.ADD_TARGET]: (p) => api.createTarget(p),
    [ACTIONS.UPDATE_TARGET]: (p) => api.modifyTarget(p.id, p),
    [ACTIONS.DELETE_TARGET]: (p) => api.removeTarget(p),

    [ACTIONS.ADD_TEMPLATE]: (p) => api.createTemplate(p),
    [ACTIONS.UPDATE_TEMPLATE]: (p) => api.modifyTemplate(p.id, p),
    [ACTIONS.DELETE_TEMPLATE]: (p) => api.removeTemplate(p),

    [ACTIONS.ADD_STAFF]: (p) => api.createStaffMember(p),
    [ACTIONS.UPDATE_STAFF]: (p) => api.modifyStaffMember(p.id, p),
    [ACTIONS.DELETE_STAFF]: (p) => api.removeStaffMember(p),

    [ACTIONS.ADD_PREVENTION_RESOURCE]: (p) => api.createPreventionResource(p),
    [ACTIONS.UPDATE_PREVENTION_RESOURCE]: (p) => api.modifyPreventionResource(p.id, p),
    [ACTIONS.DELETE_PREVENTION_RESOURCE]: (p) => api.removePreventionResource(p),

    [ACTIONS.ADD_RECOVERY_RESOURCE]: (p) => api.createRecoveryResource(p),
    [ACTIONS.UPDATE_RECOVERY_RESOURCE]: (p) => api.modifyRecoveryResource(p.id, p),
    [ACTIONS.DELETE_RECOVERY_RESOURCE]: (p) => api.removeRecoveryResource(p),

    [ACTIONS.ADD_SURVEY]: (p) => api.createSurvey(p),
    [ACTIONS.UPDATE_SURVEY]: (p) => api.modifySurvey(p.id, p),
    [ACTIONS.DELETE_SURVEY]: (p) => api.removeSurvey(p),

    [ACTIONS.ADD_WORKSHOP_STAGE]: (p) => api.createWorkshopStage(p),
    [ACTIONS.UPDATE_WORKSHOP_STAGE]: (p) => api.modifyWorkshopStage(p.id, p),
    [ACTIONS.DELETE_WORKSHOP_STAGE]: (p) => api.removeWorkshopStage(p),

    [ACTIONS.ADD_PIPELINE]: (p) => api.createPipeline(p),
    [ACTIONS.UPDATE_PIPELINE]: (p) => api.modifyPipeline(p.id, p),
    [ACTIONS.DELETE_PIPELINE]: (p) => api.removePipeline(p),

    [ACTIONS.UPDATE_SEEKER_SURVEY_ANSWERS]: (p) => api.upsertSeekerSurveyAnswers(p.seekerId, p.surveyId, p.answers),

    [ACTIONS.ADD_COMPANY_TYPE]: (p) => api.createCompanyType(p),
    [ACTIONS.UPDATE_COMPANY_TYPE]: (p) => api.modifyCompanyType(p.id, p),
    [ACTIONS.DELETE_COMPANY_TYPE]: (p) => api.removeCompanyType(p),
    [ACTIONS.ADD_COMPANY_INDUSTRY]: (p) => api.createCompanyIndustry(p),
    [ACTIONS.UPDATE_COMPANY_INDUSTRY]: (p) => api.modifyCompanyIndustry(p.id, p),
    [ACTIONS.DELETE_COMPANY_INDUSTRY]: (p) => api.removeCompanyIndustry(p),
    [ACTIONS.ADD_COMPANY_STATUS]: (p) => api.createCompanyStatus(p),
    [ACTIONS.UPDATE_COMPANY_STATUS]: (p) => api.modifyCompanyStatus(p.id, p),
    [ACTIONS.DELETE_COMPANY_STATUS]: (p) => api.removeCompanyStatus(p),
    [ACTIONS.ADD_WORKSHOP_TYPE]: (p) => api.createWorkshopType(p),
    [ACTIONS.UPDATE_WORKSHOP_TYPE]: (p) => api.modifyWorkshopType(p.id, p),
    [ACTIONS.DELETE_WORKSHOP_TYPE]: (p) => api.removeWorkshopType(p),
    [ACTIONS.ADD_WORKSHOP_NAME]: (p) => api.createWorkshopName(p),
    [ACTIONS.UPDATE_WORKSHOP_NAME]: (p) => api.modifyWorkshopName(p.id, p),
    [ACTIONS.DELETE_WORKSHOP_NAME]: (p) => api.removeWorkshopName(p),
    [ACTIONS.ADD_REFERRAL_SOURCE]: (p) => api.createReferralSource(p),
    [ACTIONS.UPDATE_REFERRAL_SOURCE]: (p) => api.modifyReferralSource(p.id, p),
    [ACTIONS.DELETE_REFERRAL_SOURCE]: (p) => api.removeReferralSource(p),

    [ACTIONS.ADD_PREVENTION_RESOURCE_CATEGORY]: (p) => api.createPreventionResourceCategory(p),
    [ACTIONS.UPDATE_PREVENTION_RESOURCE_CATEGORY]: (p) => api.modifyPreventionResourceCategory(p.id, p),
    [ACTIONS.DELETE_PREVENTION_RESOURCE_CATEGORY]: (p) => api.removePreventionResourceCategory(p),
    [ACTIONS.ADD_RECOVERY_RESOURCE_CATEGORY]: (p) => api.createRecoveryResourceCategory(p),
    [ACTIONS.UPDATE_RECOVERY_RESOURCE_CATEGORY]: (p) => api.modifyRecoveryResourceCategory(p.id, p),
    [ACTIONS.DELETE_RECOVERY_RESOURCE_CATEGORY]: (p) => api.removeRecoveryResourceCategory(p),
};

// ─── Provider ──────────────────────────────────────────────────

export function DataProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const [state, rawDispatch] = useReducer(dataReducer, emptyState);
    const [dataLoading, setDataLoading] = useState(true);
    const [dataError, setDataError] = useState(null);

    // Fetch all data from Supabase on login
    const loadData = useCallback(async () => {
        if (!isAuthenticated) {
            setDataLoading(false);
            return;
        }
        setDataLoading(true);
        setDataError(null);
        try {
            const [
                companies, contacts, recoverySeekers, campaigns, staff,
                projects, tasks, contracts, meetingNotes, preventionSchedule,
                invoices, targets, templates, preventionResources, recoveryResources,
                taskCategories, surveys, workshopStages, pipelines,
                companyTypes, companyIndustries, companyStatuses,
                workshopTypes, workshopNames, referralSources,
                preventionResourceCategories, recoveryResourceCategories, invoiceTemplate,
            ] = await Promise.all([
                api.fetchCompanies(),
                api.fetchContacts(),
                api.fetchRecoverySeekers(),
                api.fetchCampaigns(),
                api.fetchStaff(),
                api.fetchProjects(),
                api.fetchTasks(),
                api.fetchContracts(),
                api.fetchMeetingNotes(),
                api.fetchPreventionSchedule(),
                api.fetchInvoices(),
                api.fetchTargets(),
                api.fetchTemplates(),
                api.fetchPreventionResources(),
                api.fetchRecoveryResources(),
                api.fetchTaskCategories(),
                api.fetchSurveys(),
                api.fetchWorkshopStages(),
                api.fetchPipelines(),
                api.fetchCompanyTypes(),
                api.fetchCompanyIndustries(),
                api.fetchCompanyStatuses(),
                api.fetchWorkshopTypes(),
                api.fetchWorkshopNames(),
                api.fetchReferralSources(),
                api.fetchPreventionResourceCategories().catch(() => []),
                api.fetchRecoveryResourceCategories().catch(() => []),
                api.fetchInvoiceTemplate(),
            ]);
            rawDispatch({
                type: ACTIONS.SET_DATA,
                payload: {
                    companies, contacts, recoverySeekers, campaigns, staff,
                    projects, tasks, contracts, meetingNotes, preventionSchedule,
                    invoices, targets, templates, preventionResources, recoveryResources,
                    taskCategories, surveys, workshopStages, pipelines,
                    companyTypes, companyIndustries, companyStatuses,
                    workshopTypes, workshopNames, referralSources,
                    preventionResourceCategories, recoveryResourceCategories, invoiceTemplate,
                },
            });
        } catch (err) {
            console.error('Failed to load data:', err);
            setDataError(err.message);
        } finally {
            setDataLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Async-aware dispatch: optimistically updates local state,
    // then fires the API call. On error, reloads from DB.
    const dispatch = useCallback(async (action) => {
        // Allow callers to skip the API call when they've already handled it
        if (action._skipApi) {
            rawDispatch(action);
            return;
        }

        const apiFn = apiMap[action.type];
        if (!apiFn) {
            // No API mapping (e.g. SET_DATA) — just dispatch locally
            rawDispatch(action);
            return;
        }

        try {
            // Call API first to get the record with DB-generated id
            const result = await apiFn(action.payload);
            // For ADD actions, use the API-returned data (has DB id)
            if (action.type.startsWith('ADD_')) {
                rawDispatch({ type: action.type, payload: result || action.payload });
            } else {
                rawDispatch(action);
            }
        } catch (err) {
            console.error(`API error for ${action.type}:`, err);
            // Reload data to stay in sync
            loadData();
        }
    }, [loadData]);

    return (
        <DataContext.Provider value={{ state, dispatch, ACTIONS, dataLoading, dataError, reloadData: loadData }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within DataProvider');
    return context;
}

export { ACTIONS };
