export interface Player {

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
  createdAt: string
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
export type NoteCategory = 'private' | 'medical' | 'technical' | 'performance' | 'meeting';
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
  createdByScoutId: string;
  createdAt: string;
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

  dueDate: string;
  status: TaskStatus | string;
  source: TaskSource | string;

  createdAt: string;

  assignedToScout?: Scout;

  club?: string | Club | null;
  player?: string | Player | null;
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

export const POSITIONS = ['GK', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'CF', 'ST'];

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
];

export const CLUB_CONTACT_ROLES = ['Coach', 'Technical Director', 'Commercial Manager', 'Scout'];

export const TEMPLATE_VARIABLES = [
  '{PlayerName}', '{ClubName}', '{AgentName}', '{Skill}', '{ReviewDate}',
];

export const DOCUMENT_TYPES = [
  "Contracts",
  "Development Plans",
  "Letters",
];