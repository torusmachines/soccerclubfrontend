import type { Scout, Club, ClubContact, Player, PlayerForPage, Review, Note, Task, Email, Template, ContactRole, PlayerPosition, ReviewActivityRating } from '@/types';

import {
  fetchScouts, fetchClubs, fetchClubContacts, fetchContactRoles, fetchPlayerPositions, fetchPlayers,
  fetchReviews, fetchNotes, fetchTasks, fetchEmails, fetchTemplates, fetchReviewActivityRatings,
} from '@/services/apiService';

import {
  mapScout, /*mapClub*/ /*mapClubContact,*/ /*mapPlayer*/
 /* mapReview*/ /* mapNote, mapTask, mapEmail, mapTemplate */
} from '@/mappers';

// ─────────────────────────────────────────────────────────────────────────────
// SCOUTS
// ─────────────────────────────────────────────────────────────────────────────

export const scouts: Scout[] = [];


// ─────────────────────────────────────────────────────────────────────────────
// CLUBS
// ─────────────────────────────────────────────────────────────────────────────

export const initialClubs: Club[] = [];


// ─────────────────────────────────────────────────────────────────────────────
// CLUB CONTACTS
// ─────────────────────────────────────────────────────────────────────────────

export const initialClubContacts: ClubContact[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT ROLES
// ─────────────────────────────────────────────────────────────────────────────

export const initialContactRoles: ContactRole[] = [
  { roleId: 'role-1', roleName: 'Coach', description: 'Team coach responsible for training and match preparation', createdAt: '2024-01-01T00:00:00Z', createdBy: 'admin' },
  { roleId: 'role-2', roleName: 'Technical Director', description: 'Oversees technical aspects of the football program', createdAt: '2024-01-01T00:00:00Z', createdBy: 'admin' },
  { roleId: 'role-3', roleName: 'Commercial Manager', description: 'Handles commercial partnerships and sponsorships', createdAt: '2024-01-01T00:00:00Z', createdBy: 'admin' },
  { roleId: 'role-4', roleName: 'Scout', description: 'Identifies and evaluates potential new players', createdAt: '2024-01-01T00:00:00Z', createdBy: 'admin' },
];

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER POSITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const initialPlayerPositions: PlayerPosition[] = [
  { positionId: 'pos-1', positionCode: 'GK', positionName: 'Goalkeeper', description: 'Goalkeeper - Protects the goal', createdAt: '2024-01-01T00:00:00Z', createdBy: 'system' },
  { positionId: 'pos-2', positionCode: 'CB', positionName: 'Center Back', description: 'Defender - Plays in the center of defense', createdAt: '2024-01-01T00:00:00Z', createdBy: 'system' },
  { positionId: 'pos-3', positionCode: 'RB', positionName: 'Right Back', description: 'Defender - Plays on the right side of defense', createdAt: '2024-01-01T00:00:00Z', createdBy: 'system' },
  { positionId: 'pos-4', positionCode: 'LB', positionName: 'Left Back', description: 'Defender - Plays on the left side of defense', createdAt: '2024-01-01T00:00:00Z', createdBy: 'system' },
  { positionId: 'pos-5', positionCode: 'CDM', positionName: 'Central Defensive Midfielder', description: 'Midfielder - Defensive midfielder in the center', createdAt: '2024-01-01T00:00:00Z', createdBy: 'system' },
  { positionId: 'pos-6', positionCode: 'CM', positionName: 'Central Midfielder', description: 'Midfielder - Plays in the center of midfield', createdAt: '2024-01-01T00:00:00Z', createdBy: 'system' },
  { positionId: 'pos-7', positionCode: 'CAM', positionName: 'Central Attacking Midfielder', description: 'Midfielder - Attacking midfielder in the center', createdAt: '2024-01-01T00:00:00Z', createdBy: 'system' },
  { positionId: 'pos-8', positionCode: 'RW', positionName: 'Right Winger', description: 'Forward - Plays on the right wing', createdAt: '2024-01-01T00:00:00Z', createdBy: 'system' },
  { positionId: 'pos-9', positionCode: 'LW', positionName: 'Left Winger', description: 'Forward - Plays on the left wing', createdAt: '2024-01-01T00:00:00Z', createdBy: 'system' },
  { positionId: 'pos-10', positionCode: 'CF', positionName: 'Center Forward', description: 'Forward - Plays in the center of attack', createdAt: '2024-01-01T00:00:00Z', createdBy: 'system' },
  { positionId: 'pos-11', positionCode: 'ST', positionName: 'Striker', description: 'Forward - Main striker/goal scorer', createdAt: '2024-01-01T00:00:00Z', createdBy: 'system' },
];

// ─────────────────────────────────────────────────────────────────────────────
// PLAYERS
// ─────────────────────────────────────────────────────────────────────────────

export const initialPlayers: PlayerForPage[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

export const initialReviews: Review[] = [];


// ─────────────────────────────────────────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────────────────────────────────────────

export const initialNotes: Note[] = [];


// ─────────────────────────────────────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────────────────────────────────────

export const initialTasks: Task[] = [];


// ─────────────────────────────────────────────────────────────────────────────
// EMAILS
// ─────────────────────────────────────────────────────────────────────────────

export const initialEmails: Email[] = [];


// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

export const initialTemplates: Template[] = [];


// ─────────────────────────────────────────────────────────────────────────────
// LOAD ALL DATA  ←  Called once from App.tsx on startup
// ─────────────────────────────────────────────────────────────────────────────

let mockDataLoaded = false;

export const loadMockData = async (): Promise<void> => {
  if (mockDataLoaded) {
    return;
  }
  mockDataLoaded = true;

  const [
    scoutsData,
    clubsData,
    clubContactsData,
    contactRolesData,
    playerPositionsData,
    playersData,
    reviewsData,
    notesData,
    tasksData,
    emailsData,
    templatesData,
  ] = await Promise.all([
    fetchScouts(),
    fetchClubs(),
    fetchClubContacts(),
    fetchContactRoles(),
    fetchPlayerPositions(),
    fetchPlayers(),
    fetchReviews(),
    fetchNotes(),
    fetchTasks(),
    fetchEmails(),
    fetchTemplates(),
  ]);

  scouts.push(...scoutsData.map(mapScout));
  // initialClubs.push(...clubsData.map(mapClub));
  initialClubs.push(...clubsData);
  // initialClubContacts.push(...clubContactsData.map(mapClubContact));
   initialClubContacts.push(...clubContactsData);
  // initialContactRoles.push(...contactRolesData);
  initialContactRoles.length = 0;
  initialContactRoles.push(...contactRolesData);
  // Load player positions from API
  initialPlayerPositions.length = 0;
  initialPlayerPositions.push(...playerPositionsData);
  // initialPlayers.push(...playersData.map(mapPlayer));

  initialPlayers.push(...playersData.map((p: any) => ({
    playerId: p.playerId ?? '',
    playerName: p.playerName ?? '',
    clubName: p.clubName ?? '',
    position: p.position ?? '',
    nationality: p.nationality ?? '',
    contractEndDate: p.contractEndDate ?? undefined,
    overallRating: p.overallRating ?? 0,
    agencyContractStatus: p.agencyContractStatus ?? '',
    scoutId: p.scoutId ?? undefined,
    scoutName: p.scoutName ?? undefined,
  })));

  // initialReviews.push(...reviewsData.map(mapReview));
  initialReviews.push(...reviewsData);
  const activityRatingsData = await fetchReviewActivityRatings();
  const ratingsByReview = new Map<string, ReviewActivityRating[]>();
  activityRatingsData.forEach(rating => {
    const list = ratingsByReview.get(rating.reviewId) || [];
    list.push(rating);
    ratingsByReview.set(rating.reviewId, list);
  });
  initialReviews.forEach(review => {
    const reviewRatings = ratingsByReview.get(review.reviewId);
    if (reviewRatings?.length) {
      review.revRatingActivities = reviewRatings;
    }
  });
  // initialNotes.push(...notesData.map(mapNote));
  initialNotes.push(...notesData);
  // initialTasks.push(...tasksData.map(mapTask));
  initialTasks.push(...tasksData);
  // initialEmails.push(...emailsData.map(mapEmail));
  initialEmails.push(...emailsData);
  // initialTemplates.push(...templatesData.map(mapTemplate));
  initialTemplates.push(...templatesData);

  console.log('mockData loaded from https://localhost:7001/api:', {
    scouts: scouts.length,
    clubs: initialClubs.length,
    clubContacts: initialClubContacts.length,
    contactRoles: initialContactRoles.length,
    playerPositions: initialPlayerPositions.length,
    players: initialPlayers.length,
    reviews: initialReviews.length,
    notes: initialNotes.length,
    tasks: initialTasks.length,
    emails: initialEmails.length,
    templates: initialTemplates.length,
  });
};