// src/services/apiService.ts
// ─────────────────────────────────────────────
// Central Axios instance pointed at https://soccerclubbackend.onrender.com/api
// All API calls return typed data directly (interceptor unwraps .data)
// ─────────────────────────────────────────────

import axios from 'axios';
import type {
  Scout, Club, ClubContact, Player,
  Review, Note, Task, TaskComment, Email, Template, Ratings,
  TaskStatus,
  TaskSource,
  PlayerDocument,
  ContactRole,
  PlayerPosition,
  Sport,
  SportActivity,
  ReviewActivityRating,
  Sponsor,
  CommercialContract,
  AiPlanGeneratePayload,
  AiPlanResponse,
  AiPlanHistoryResponse,
} from '@/types';

const TOKEN_KEY = 'auth_token';

// =======================================================
// Axios Instance Configuration
// =======================================================
const api = axios.create({
  baseURL: 'https://soccerclubbackend.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
});

// =======================================================
// Request Interceptor — attach JWT if present
// =======================================================
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = (config.headers as any) || {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    delete headers['Content-Type'];
  }

  config.headers = headers;
  return config;
});


// =======================================================
// Response Interceptor
// - Unwraps response.data
// - On 401 redirect to /login (unless already there)
// - Standardizes error handling
// =======================================================

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err?.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/accept-invite') {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = '/login';
      }
    }
    const message = err?.response?.data?.message || err?.message || 'API Error';
    console.error(`[API Error] ${message}`);
    return Promise.reject({ message, status: err?.response?.status });
  }
);

// =======================================================
// FETCH APIs (GET)
// =======================================================

export const fetchScouts = (): Promise<Scout[]> => api.get('/Scouts');
export const fetchClubs = (): Promise<Club[]> => api.get('/Clubs');
export const fetchClubContacts = (): Promise<ClubContact[]> => api.get('/ClubContacts');
export const fetchContactRoles = (): Promise<ContactRole[]> => api.get('/ContactRoles');
export const fetchPlayers = (): Promise<Player[]> => api.get('/Players');
export const fetchNotes = (): Promise<Note[]> => api.get('/Notes');
export const fetchTasks = (): Promise<Task[]> => api.get('/Tasks');
export const fetchEmails = (): Promise<Email[]> => api.get('/Emails');
export const fetchTemplates = (): Promise<Template[]> => api.get('/Templates');
export const fetchReviews = (): Promise<Review[]> => api.get('/Reviews');
export const fetchReviewRatings = (): Promise<Ratings[]> => api.get('/ReviewRatings');
export const fetchReviewActivityRatings = (): Promise<ReviewActivityRating[]> => api.get('/ReviewActivityRatings');
export const fetchReviewActivityRatingsByReview = (reviewId: string): Promise<ReviewActivityRating[]> =>
  api.get(`/ReviewActivityRatings/review/${reviewId}`);

// =======================================================
// SPONSOR APIs
// =======================================================

export const fetchSponsors = (): Promise<Sponsor[]> => api.get('/Sponsors');
export const createSponsorApi = (payload: Omit<Sponsor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Sponsor> =>
  api.post('/Sponsors', payload);
export const updateSponsorApi = (id: string, payload: Partial<Sponsor>): Promise<Sponsor> =>
  api.put(`/Sponsors/${id}`, payload);
export const deleteSponsorApi = (id: string): Promise<void> =>
  api.delete(`/Sponsors/${id}`);

// =======================================================
// COMMERCIAL CONTRACT APIs
// =======================================================

export const fetchCommercialContracts = (): Promise<CommercialContract[]> => api.get('/CommercialContracts');
export const fetchContractsByClub = (clubId: string): Promise<CommercialContract[]> =>
  api.get(`/CommercialContracts/by-club/${clubId}`);
export const fetchContractsByPlayer = (playerId: string): Promise<CommercialContract[]> =>
  api.get(`/CommercialContracts/by-player/${playerId}`);
export const createCommercialContractApi = (payload: Omit<CommercialContract, 'id' | 'createdAt' | 'updatedAt'>): Promise<CommercialContract> =>
  api.post('/CommercialContracts', payload);
export const updateCommercialContractApi = (id: string, payload: Partial<CommercialContract>): Promise<CommercialContract> =>
  api.put(`/CommercialContracts/${id}`, payload);
export const deleteCommercialContractApi = (id: string): Promise<void> =>
  api.delete(`/CommercialContracts/${id}`);
export const uploadContractDocumentApi = (id: string, files: FileList | File[]): Promise<{ documentPath: string }> => {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('files', file));
  return api.post(`/CommercialContracts/${id}/upload-document`, formData);
};

export const deleteContractDocumentApi = (id: string, documentPath: string): Promise<{ documentPath: string }> =>
  api.delete(`/CommercialContracts/${id}/documents`, { params: { documentPath } });


// =======================================================
// GENERIC HELPERS
// =======================================================
export const post = <T>(url: string, data: any): Promise<T> => { return api.post(url, data); };

const POWER_AUTOMATE_FLOW_URL = 'https://default4b9f13b4233941df97ccedf0d25c58.7c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/1c19f6cfa3a2446da68a02be428b70f0/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=MC6pqYcVWraPeFtcdHviSjM0T-CaZ7VA9ZxSketLTik'; // Replace with your actual Power Automate flow URL

export const sendPowerAutomateEmail = (to: string, subject: string, body: string): Promise<object> => {
  return axios.post(POWER_AUTOMATE_FLOW_URL, {
    to,
    subject,
    body,
  }, {
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(res => res.data as object);
};


// export const uploadPlayerImageApi = async (playerId: string, file: File) => {
//   const formData = new FormData();
//   formData.append('file', file);

//   return api.post(`/Players/upload-image/${playerId}`, formData, {
//     headers: {
//       'Content-Type': 'multipart/form-data',
//     },
//   });
// };

export const uploadPlayerImageApi = async (
  playerId: string,
  file: File
): Promise<{ imageUrl: string }> => {

  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post<{ imageUrl: string }>(
    `/Players/upload-image/${playerId}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return res as unknown as { imageUrl: string };
};


export const uploadClubLogoApi = async (
  clubId: string,
  file: File
): Promise<{ logoUrl: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post<{ logoUrl: string }>(
    `/Clubs/upload-logo/${clubId}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return res as unknown as { logoUrl: string };
};

// =======================================================
// CLUB APIs
// =======================================================

export const createClub = (payload: { clubName: string; country: string; addressLine: string; logoUrl: string }): Promise<Club> =>
  api.post('/Clubs', payload);

export const updateClubApi = (
  id: string,
  payload: { clubName: string; country: string; addressLine?: string; logoUrl?: string }
): Promise<Club> => api.put(`/Clubs/${id}`, payload);

export const deleteClubApi = (id: string): Promise<void> =>
  api.delete(`/Clubs/${id}`);


// =======================================================
// CLUB CONTACT APIs
// =======================================================

export const createClubContactApi = (payload: {
  clubId: string;
  contactName: string;
  roleName: string;
  email?: string;
  phone?: string;
}): Promise<ClubContact> =>
  api.post('/ClubContacts', payload);

export const updateClubContactApi = (
  id: string,
  payload: Partial<{
    clubId: string;
    contactName: string;
    roleName: string;
    email?: string;
    phone?: string;
  }>
): Promise<ClubContact> =>
  api.put(`/ClubContacts/${id}`, payload);

export const deleteClubContactApi = (id: string) =>
  api.delete(`/ClubContacts/${id}`);

// CONTACT ROLE APIs
// =======================================================

export const createContactRoleApi = (payload: {
  roleName: string;
  description?: string;
}): Promise<ContactRole> =>
  api.post('/ContactRoles', payload);

export const updateContactRoleApi = (
  id: string,
  payload: {
    roleName: string;
    description?: string;
  }
): Promise<ContactRole> =>
  api.put(`/ContactRoles/${id}`, payload);

export const deleteContactRoleApi = (id: string): Promise<{ message: string }> =>
  api.delete(`/ContactRoles/${id}`);


// =======================================================
// TEMPLATE APIs
// =======================================================

export const createTemplateApi = (payload: {
  templateName: string
  templateType: string
  subject?: string
  body: string
}): Promise<Template> =>
  api.post('/Templates', payload);


export const updateTemplateApi = (
  id: string,
  payload: {
    templateName: string
    templateType: string
    subject?: string
    body: string
  }
): Promise<Template> =>
  api.put(`/Templates/${id}`, payload);


export const deleteTemplateApi = (id: string): Promise<void> =>
  api.delete(`/Templates/${id}`);


// =======================================================
// TASK APIs
// =======================================================

export const createTaskApi = (payload: {
  title: string;
  description?: string;
  playerId: string;
  clubId?: string;
  assignedToScoutId?: string;
  dueDate: string;
  source?: string;
  status: string;
}): Promise<Task> => api.post('/Tasks', payload);

export const updateTaskApi = (
  taskId: string,
  payload: Partial<{
    title: string;
    description: string;

    playerId?: string;
    clubId?: string;

    assignedToScoutId: string;

    dueDate: string;
    status: TaskStatus | string;
    source: TaskSource | string;
  }>
): Promise<Task> =>
  api.put(`/Tasks/${taskId}`, payload);

export const deleteTaskApi = (taskId: string): Promise<void> =>
  api.delete(`/Tasks/${taskId}`);

export const fetchTaskComments = (taskId: string, page = 1, pageSize = 20): Promise<TaskComment[]> =>
  api.get(`/tasks/${taskId}/comments`, { params: { page, pageSize } });

export const createTaskCommentApi = (taskId: string, payload: { comment: string; isVisibleToPlayer: boolean }): Promise<TaskComment> =>
  api.post(`/tasks/${taskId}/comments`, payload);

export const updateTaskCommentApi = (commentId: string, payload: { comment: string; isVisibleToPlayer: boolean }): Promise<TaskComment> =>
  api.put(`/comments/${commentId}`, payload);

export const deleteTaskCommentApi = (commentId: string): Promise<void> =>
  api.delete(`/comments/${commentId}`);


// =======================================================
// PLAYER APIs
// =======================================================


export const createPlayerApi = (payload: {
  fullName: string
  dateOfBirth: string
  nationality: string
  position: string
  preferredFoot: string
  heightCm: number
  weightKg: number
  currentClub: string
  contractStart: string
  contractEnd: string
  contractStartWithCoach?: string | null
  contractEndWithCoach?: string | null
  agentName: string
  agent_scout_id: string
  contact_info: string
  profileImage?: string
  player_email:string
  sportId?: number
}): Promise<Player> =>
  api.post('/Players', payload);

export const updatePlayerApi = (id: string, payload: any): Promise<Player> =>
  api.put(`/Players/${id}`, payload);

export const deletePlayerApi = (id: string): Promise<void> =>
  api.delete(`/Players/${id}`);



// Add these two exports to apiService.ts

export const createReviewApi = (payload: {
  playerId: string;
  scoutId: string;
  matchDate?: string;
  club1Id?: string;
  club2Id?: string;
  notes?: string;
}): Promise<Review> => api.post('/Reviews', payload);

export const createReviewRatingApi = (payload: {
  reviewId: string;          // ← comes from the Review response above
  passing: number;
  shooting: number;
  dribbling: number;
  tacticalAwareness: number;
  defensiveContribution: number;
  physicalStrength: number;
  behavior: number;
  overallPerformance: number;
}): Promise<Ratings> => api.post('/ReviewRatings', payload);

export const createReviewActivityRatingsApi = (payload: {
  reviewId: string;
  ratings: Array<{
    activityId: number;
    rating: number;
    comment?: string;
    ratingFollowupDate?: string | Date;
  }>;
}): Promise<any> => api.post('/ReviewActivityRatings/bulk', payload);

export const createReviewSkillDetailApi = (payload: {
  reviewId: string;
  skillKey: string;
  rating: number;
  commentText?: string;
  followUpDate?: string;
}): Promise<any> => api.post('/ReviewSkillDetails', payload);

export const fetchReviewSkillDetailsByReviewApi = (reviewId: string): Promise<any[]> => api.get(`/ReviewSkillDetails/review/${reviewId}`);

export const createNoteApi = (payload: {
  playerId?: string;
  clubId?: string;
  createdByScoutId: string;
  category: string;
  topic: string;
  description: string;
  followUpDate?: string;
  isVisibleToPlayer?: boolean;
}): Promise<Note> => api.post('/Notes', payload);

export const updateEmailApi = (
  id: string,
  payload: Partial<{
    recipientEmail: string;
    subject: string;
    body: string;
    sentByScoutId: string;
    sentAt: string;
  }>
): Promise<Email> => api.put(`/Emails/${id}`, payload);

export const deleteEmailApi = (id: string): Promise<void> =>
  api.delete(`/Emails/${id}`);

export const updateNoteApi = (
  id: string,
  payload: Partial<{
    playerId?: string;
    clubId?: string;
    category: string;
    topic: string;
    description: string;
    followUpDate?: string;
    isVisibleToPlayer?: boolean;
  }>
): Promise<Note> =>
  api.put(`/Notes/${id}`, payload);

export const deleteNoteApi = (id: string): Promise<void> =>
  api.delete(`/Notes/${id}`);

export const createDocumentApi = (payload: any): Promise<PlayerDocument> =>
  api.post('/Documents', payload);

export const updateDocumentApi = (id: string, payload: any) =>
  api.put(`/Documents/${id}`, payload);

export const deleteDocumentApi = (id: string) =>
  api.delete(`/Documents/${id}`);

export const getDocumentsApi = (): Promise<PlayerDocument[]> =>
  api.get('/Documents');


// =======================================================
// SCOUT APIs
// =======================================================


export const createScoutApi = (payload: {
  scoutName: string;
  roleName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  lockedAreas?: string;
  isShowPlayer?: boolean;
}): Promise<Scout> =>
  api.post('/Scouts', payload);

export const updateScoutApi = (
  id: string,
  payload: Partial<{
    scoutName: string;
    roleName: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    lockedAreas?: string;
    isShowPlayer?: boolean;
  }>
): Promise<Scout> =>
  api.put(`/Scouts/${id}`, payload);
export const deleteScoutApi = (id: string): Promise<void> =>
  api.delete(`/Scouts/${id}`);

// =======================================================
// AUTH APIs
// =======================================================

export interface InviteUserPayload {
  email: string;
  fullName: string;
  role: 'Admin' | 'Player' | 'Scout';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AcceptInvitePayload {
  inviteToken: string;
  password: string;
  confirmPassword: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const loginApi = (payload: LoginPayload): Promise<AuthResponse> =>
  api.post('/auth/login', payload);

export const acceptInviteApi = (payload: AcceptInvitePayload): Promise<AuthResponse> =>
  api.post('/auth/accept-invite', payload);

export const inviteUserApi = (payload: InviteUserPayload): Promise<{ message: string }> =>
  api.post('/auth/invite-user', payload);

export const getMeApi = (): Promise<AuthUser> =>
  api.get('/auth/me');

// =======================================================
// COMPANY PROFILE APIs
// =======================================================

export interface CompanyProfilePayload {
  // Basic Info
  companyName?: string;
  shortName?: string;
  tagline?: string;
  description?: string;
  foundedYear?: number | null;
  logoUrl?: string;
  primaryColor?: string;

  // Contact Info
  email?: string;
  phoneNumber?: string;
  alternatePhone?: string;

  // Address
  addressLine1?: string;
  addressLine2?: string;
  areaLocality?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  postalCode?: string;

  // Organization Details
  organizationType?: string;
  sportType?: string;

  // Social Media
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;

  // Contract Settings
  contractExpiringMonths?: number;
}

export const fetchCompanyProfile = (): Promise<CompanyProfilePayload> =>
  api.get('/CompanyProfile');

export const updateCompanyProfile = (payload: CompanyProfilePayload): Promise<CompanyProfilePayload> =>
  api.post('/CompanyProfile', payload);

export const uploadCompanyLogoApi = async (file: File): Promise<{ logoUrl: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post<{ logoUrl: string }>(
    `/CompanyProfile/upload-logo`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return res as unknown as { logoUrl: string };
};

// =======================================================
// PLAYER POSITION APIs
// =======================================================

export const fetchPlayerPositions = (): Promise<PlayerPosition[]> =>
  api.get('/PlayerPositions');

// =======================================================
// AI PLAN APIs
// =======================================================

export const generateAiPlanApi = (playerId: string, payload: AiPlanGeneratePayload): Promise<AiPlanResponse> =>
  api.post(`/ai/generate/${playerId}`, payload);

export const getLatestAiPlanApi = (playerId: string): Promise<AiPlanResponse> =>
  api.get(`/ai/latest/${playerId}`);

export const getAiPlanHistoryApi = (playerId: string): Promise<AiPlanHistoryResponse> =>
  api.get(`/ai/history/${playerId}`);

export const createPlayerPositionApi = (payload: {
  positionCode: string;
  positionName: string;
  description?: string;
}): Promise<PlayerPosition> =>
  api.post('/PlayerPositions', payload);

export const updatePlayerPositionApi = (
  id: string,
  payload: {
    positionCode: string;
    positionName: string;
    description?: string;
  }
): Promise<PlayerPosition> =>
  api.put(`/PlayerPositions/${id}`, payload);

export const deletePlayerPositionApi = (id: string): Promise<void> =>
  api.delete(`/PlayerPositions/${id}`);

// Sports API
export const fetchSportsApi = (): Promise<Sport[]> =>
  api.get('/Sports');

export const createSportApi = (payload: {
  sportName: string;
}): Promise<Sport> =>
  api.post('/Sports', payload);

export const updateSportApi = (
  id: number,
  payload: {
    sportName: string;
  }
): Promise<Sport> =>
  api.put(`/Sports/${id}`, payload);

export const deleteSportApi = (id: number): Promise<void> =>
  api.delete(`/Sports/${id}`);

// Sport Activities API
export const fetchSportActivitiesApi = (): Promise<SportActivity[]> =>
  api.get('/SportActivities');

export const createSportActivityApi = (payload: {
  sportId: number;
  activityName: string;
}): Promise<SportActivity> =>
  api.post('/SportActivities', payload);

export const updateSportActivityApi = (
  id: number,
  payload: {
    sportId: number;
    activityName: string;
  }
): Promise<SportActivity> =>
  api.put(`/SportActivities/${id}`, payload);

export const deleteSportActivityApi = (id: number): Promise<void> =>
  api.delete(`/SportActivities/${id}`);

export const fetchSportActivitiesBySportApi = (sportId: number): Promise<SportActivity[]> =>
  api.get(`/SportActivities/BySport/${sportId}`);

export const fetchScoutsBySportApi = (sportId: number): Promise<Scout[]> =>
  api.get(`/Scouts/BySport/${sportId}`);

export const fetchPlayerPositionsBySportApi = (sportId: number): Promise<PlayerPosition[]> =>
  api.get(`/PlayerPositions/BySport/${sportId}`);

export default api;