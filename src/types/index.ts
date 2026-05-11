export interface PlayerForPage {
  playerId: string;
  userId?: string;
  playerEmail?: string;
  userStatus?: string;
  playerName: string;
  clubName: string;
  position: string;
  nationality: string;
  contractStartDate?: string;
  contractEndDate?: string;
  overallRating: number;
  agencyContractStatus: string;
  scoutId?: string;
  scoutName?: string;
  sportId?: number;
  sportName?: string;
}

export interface PlayersOtherData {
  scoutOptions: Array<{
    scoutId: string;
    scoutName: string;
  }>;
  positionOptions: Array<{
    positionId: string;
    positionName: string;
    positionCode: string;
  }>;
  sportsOptions: Array<{
    sportId: number;
    sportName: string;
  }>;
  loggedInScoutIsShowPlayer?: boolean;
}

export interface PlayersForPageResponse {
  players: PlayerForPage[];
  otherData: PlayersOtherData;
}

export interface Player {
  playerName?: string;
  playerId?: string | number;
  clubName?: string;
  overallRating?: number;
  agencyContractStatus?: string;
  scoutId?: string;
  scoutName?: string;

  id: string,
  fullName: string,
  dateOfBirth: string,
  nationality: string,
  position: string,
  preferredFoot: string,
  heightCm: number,
  weightKg: number,
  currentClub: string,
  contractStart: string,
  contractEnd: string,
  contractStatus: string,
  agentName: string,
  agentContact: string,
  createdAt: string,
  updatedAt: string,
  agent_scout_id?: string,
  contact_info?: string,
  profileImage?: string; // base64 or URL
  player_email:string;
  sportId?: number;
  sportName?: string;
  contractStartWithCoach?: string;
  contractEndWithCoach?: string;
  addressLine1?: string;
  addressLine2?: string;
  userStatus?: string;
  // New profile/contact fields
  gender?: string;
  placeOfBirth?: string;
  primaryLanguage?: string;
  secondaryLanguage?: string;
  profileVisibility?: boolean;

  phoneNumber?: string;
  alternatePhone?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;

  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;

  secondaryPosition?: string;
  jerseyNumber?: number;
  experienceYears?: number;
  playingLevel?: string;

  dominantSide?: string;
  fitnessLevel?: string;
  injuryStatus?: string;

  coachEmail?: string;
  coachPhone?: string;
}

export interface Scout {
  scoutId: string;
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
  sportId?: number;
  createdAt: string;
}

export interface Ratings {
  reviewId: string;
  passing: number;
  shooting: number;
  dribbling: number;
  tacticalAwareness: number;
  defensiveContribution: number;
  physicalStrength: number;
  behavior: number;
  overallPerformance: number;
  review: null;
}

export interface ReviewActivityRating {
  reviewActivityRatingId?: number;
  reviewId: string;
  activityId: number;
  rating: number;
  comment?: string;
  ratingFollowupDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SkillDetail {
  rating: number;
  comment?: string;
  followUpDate?: string;
}

// export interface Review {
//   id: string;
//   playerId: string;
//   scoutId: string;
//   matchDate: string;
//   club1Id?: string;
//   club2Id?: string;
//   ratings: Ratings;
//   skillDetails?: Record<string, SkillDetail>;
//   notes: string;
//   createdAt: string;
// }
export interface Review {
  comment: any;
  reviewId: string;
  playerId: string;
  scoutId: string;
  matchDate?: string;
  club1Id?: string;
  club2Id?: string;
  notes: string;
  createdAt: string;

  // Lovable UI specific fields (not returned from API)
  revRatings?: Ratings;
  revSkillDetails?: Record<string, SkillDetail>;
  revRatingActivities?: ReviewActivityRating[];
}

// export interface PlayerDocument {
//   id: string;
//   playerId?: string;
//   clubId?: string;
//   name: string;
//   type: string;
//   date: string;
//   size: string;
// }

export interface PlayerDocument {
  documentId: string;
  playerId?: string;
  clubId?: string;
  documentName: string;
  documentType: string;
  documentDate: string;
  fileSizeLabel: string;
  fileData?: string; // optional (only for detail view)
  isVisibleToPlayer?: boolean;
}

export interface DevelopmentPlan {
  id: string;
  playerId: string;
  generatedAt: string;
  goals: DevelopmentGoal[];
  recommendations: string[];
  physicalFocus: string[];
  duration: string;
}

export interface DevelopmentGoal {
  category: string;
  currentRating: number;
  targetRating: number;
  actions: string[];
}

export interface MatchCriteria {
  position?: string;
  preferredFoot?: string;
  minPassing?: number;
  minShooting?: number;
  minDribbling?: number;
  minTacticalAwareness?: number;
  minDefensiveContribution?: number;
  minPhysicalStrength?: number;
  minOverall?: number;
  contractStatus?: string;
}

export type ContractStatus = 'Active' | 'Expiring Soon' | 'Available';

// Club types
export interface Club {
  clubId: string,
  clubName: string,
  country: string,
  addressLine: string,
  logoUrl: string,
  createdAt: string,
  clubContactCount?: number
}

// export interface ClubContact {
//   id: string;
//   clubId: string;
//   name: string;
//   role: 'Coach' | 'Technical Director' | 'Commercial Manager' | 'Scout' | string;
//   email?: string;
//   phone?: string;
// }
export interface ClubContact {
  clubContactId: string;
  clubId: string;
  contactName: string;
  roleName: 'Coach' | 'Technical Director' | 'Commercial Manager' | 'Scout' | string;
  email?: string;
  phone?: string;
  createdAt: string;
  club?: Club | null;
}

// Note types
export type NoteCategory =
  | 'private'
  | 'medical'
  | 'technical'
  | 'performance'
  | 'meeting'
  | 'announcement'
  | 'reminder'
  | 'report'
  | 'discussion'
  | 'decision'
  | 'issue'
  | 'update'
  | 'training_session'
  | 'match_review'
  | 'injury_update'
  | 'transfer_update'
  | 'disciplinary'
  | 'financial'
  | 'sponsorship'
  | 'event'
  | 'facility';
export type EntityType = 'player' | 'club' | string;

// export interface Note {
//   id: string;
//   entityType: EntityType;
//   entityId: string;
//   topic: string;
//   description: string;
//   category: NoteCategory;
//   followUpDate?: string;
//   createdBy: string;
//   createdAt: string;
// }
export interface Note {
  noteId: string;
  playerId?: EntityType;
  clubId?: string;
  topic: string;
  description: string;
  category: NoteCategory | string;
  followUpDate?: string;
  meetingDate?: string;
  attendees?: string;
  createdByScoutId: string;
  createdAt: string;
  isVisibleToPlayer?: boolean;
}

// Task types
export type TaskStatus = 'open' | 'completed';
export type TaskSource = 'contract' | 'review' | 'note' | 'manual';

// export interface Task {
//   id: string;
//   title: string;
//   description: string;
//   relatedEntityType: EntityType;
//   relatedEntityId: string;
//   assignedTo: string;
//   dueDate: string;
//   status: TaskStatus;
//   createdAt: string;
//   source: TaskSource;
// }
export interface Task {
  taskId: string;
  title: string;
  description: string;

  playerId?: EntityType;
  clubId?: string;

  assignedToScoutId: string;
  assignedToID?: string;
  assignedToName?: string;

  dueDate: string;
  status: TaskStatus | string;
  source: TaskSource | string;

  createdAt: string;

  assignedToScout?: Scout;

  club?: string | Club | null;
  player?: string | Player | null;
}

export interface TaskComment {
  commentId: string;
  taskId: string;
  userId: string;
  userName: string;
  comment: string;
  createdAt: string;
  updatedAt?: string | null;
  isDeleted: boolean;
  isVisibleToPlayer: boolean;
}

// Email types
// export interface Email {
//   id: string;
//   relatedEntityType: EntityType;
//   relatedEntityId: string;
//   to: string;
//   subject: string;
//   body: string;
//   sentBy: string;
//   sentAt: string;
// }
export interface Email {
  emailId: string;

  playerId?: string | null;
  clubId?: string | null;

  recipientEmail: string;
  subject: string;
  body: string;

  sentByScoutId: string;
  sentAt: string;

  club?: Club | null;
  player?: Player | null;
  sentByScout?: Scout | null;
}

// Template types
export type TemplateType = 'email' | 'letter' | 'report';

// export interface Template {
//   id: string;
//   name: string;
//   type: TemplateType;
//   subject?: string;
//   body: string;
//   createdAt: string;
// }

export interface Template {
  templateId: string;
  templateName: string;
  templateType: TemplateType;
  subject?: string;
  body: string;
  createdAt: string;
}

export const RATING_CATEGORIES: { key: string; label: string }[] = [
  { key: 'passing', label: 'Passing' },
  { key: 'shooting', label: 'Shooting' },
  { key: 'dribbling', label: 'Dribbling' },
  { key: 'tacticalAwareness', label: 'Tactical Awareness' },
  { key: 'defensiveContribution', label: 'Defensive Contribution' },
  { key: 'physicalStrength', label: 'Physical Strength' },
  { key: 'behavior', label: 'Behavior / Attitude' },
  { key: 'overallPerformance', label: 'Overall Performance' },
];

export const NOTE_CATEGORIES: { value: NoteCategory; label: string }[] = [
  { value: 'private', label: 'Private' },
  { value: 'medical', label: 'Medical' },
  { value: 'technical', label: 'Technical' },
  { value: 'performance', label: 'Performance' },
  { value: 'meeting', label: 'Meeting' },

  // Club / Operations
  { value: 'announcement', label: 'Announcement' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'report', label: 'Report' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'decision', label: 'Decision' },
  { value: 'issue', label: 'Issue' },
  { value: 'update', label: 'Update' },

  // Sports-specific ops
  { value: 'training_session', label: 'Training Session' },
  { value: 'match_review', label: 'Match Review' },
  { value: 'injury_update', label: 'Injury Update' },
  { value: 'transfer_update', label: 'Transfer Update' },
  { value: 'disciplinary', label: 'Disciplinary Action' },

  // Club management
  { value: 'financial', label: 'Financial Update' },
  { value: 'sponsorship', label: 'Sponsorship Update' },
  { value: 'event', label: 'Event Planning' },
  { value: 'facility', label: 'Facility Update' },
];

export interface ContactRole {
  roleId: string;
  roleName: string;
  description?: string;
  createdAt: string;
  createdBy: string;
}

export interface PlayerPosition {
  positionId: string;
  positionCode: string;
  positionName: string;
  description?: string;
  sportId?: number;
  createdAt: string;
  createdBy: string;
}

export interface Sponsor {
  id: string;
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SponsorComment {
  commentId: string;
  sponsorId: string;
  comment: string;
  createdByUserId?: string;
  createdByName?: string;
  createdByRole?: string;
  isAdminComment: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CommercialContract {
  id: string;
  sponsorId: string;
  entityType: 'club' | 'player';
  clubId?: string;
  playerId?: string;
  contractStartDate: string;
  contractEndDate: string;
  expiryDate?: string;
  contractDetails?: string;
  documentPath?: string;
  createdAt: string;
  updatedAt: string;
  sponsor?: Sponsor;
}

export type ContractType = 'PlayerClub' | 'ClubCompany' | 'PlayerCompany' | 'PlayerCoach';
export type PartyType = 'Player' | 'Club' | 'Company' | 'Coach';

export interface Contract {
  id: string;
  party1Id: string;
  party1Type: PartyType;
  party1Name?: string;
  party2Id: string;
  party2Type: PartyType;
  party2Name?: string;
  contractType: ContractType;
  startDate: string;
  endDate: string;
  expiryDate?: string;
  contractDetails?: string;
  documentPath?: string;
  createdAt: string;
  updatedAt: string;
  expiryStatus: string;
}

export interface AiPlanContent {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  trend_analysis: string;
  injury_risks: string[];
  improvements_from_last_plan: string[];
  timeline_weeks: Record<string, string>;
  skill_plan: Record<string, string[]>;
  weekly_schedule: Record<string, string[]>;
  performance_tracking: string[];
  recommendations: string[];
}

export interface AiPlanResponse {
  planId: string;
  playerId: string;
  plan: AiPlanContent;
  version: number;
  createdAt: string;
  skillType?: string;
  durationWeeks?: number;
  trainingDaysPerWeek?: number;
  sessionDurationMinutes?: number;
  topNRatings?: number;
  currentRating?: number;
  targetRating?: number;
  pdfPath?: string;
}

export interface AiPlanHistoryResponse {
  plans: AiPlanResponse[];
}

export interface AiPlanGeneratePayload {
  skillType: string;
  durationWeeks: number;
  trainingDaysPerWeek: number;
  sessionDurationMinutes: number;
  topNRatings: number;
  currentRating: number;
  targetRating?: number;
}

export const CLUB_CONTACT_ROLES = ['Coach', 'Technical Director', 'Commercial Manager', 'Scout'];

export const TEMPLATE_VARIABLES = [
  '{PlayerName}', '{ClubName}', '{AgentName}', '{Skill}', '{ReviewDate}',
];

export const DOCUMENT_TYPES = [
  "Contracts",
  "Development Plans",
  "Letters",
];

export interface Sport {
  sportId?: number;
  sportName: string;
  createdAt?: string;
}

export interface SportActivity {
  activityId?: number;
  sportId: number;
  activityName: string;
  createdAt?: string;
  sport?: Sport;
}