import type { Scout, Club, ClubContact, Player, Review, Note, Task, Email, Template, ContactRole, PlayerPosition } from '@/types';

import {
  fetchScouts, fetchClubs, fetchClubContacts, fetchContactRoles, fetchPlayerPositions, fetchPlayers,
  fetchReviews, fetchNotes, fetchTasks, fetchEmails, fetchTemplates, fetchReviewRatings,
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

export const initialPlayers: Player[] = [];

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
  initialPlayers.push(...playersData)
  // initialReviews.push(...reviewsData.map(mapReview));
  initialReviews.push(...reviewsData);
  const ratingsData = await fetchReviewRatings();
  ratingsData.forEach(rating => {
    const review = initialReviews.find(r => r.reviewId === rating.reviewId);
    if (review) {
      review.revRatings = rating;
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

  console.log('mockData loaded from https://soccerclubbackend.onrender.com/api:', {
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








// import { Player, Review, Scout, Club, ClubContact, Note, Task, Email, Template } from '@/types';

// export const scouts: Scout[] = [
//   { scoutId: 's1', scoutName: 'James Mitchell', roleName: 'Senior Scout', createdAt: '2026-03-09T12:10:48' },
//   { scoutId: 's2', scoutName: 'Carlos Vega', roleName: 'Regional Scout', createdAt: '2026-03-09T12:11:00' },
//   { scoutId: 's3', scoutName: 'Sarah Chen', roleName: 'Youth Scout', createdAt: '2026-03-09T12:12:00' },
// ];

// export const initialClubs: Club[] = [
//   { id: 'c1', name: 'SC Freiburg', country: 'Germany', address: 'Schwarzwaldstraße 193, Freiburg' },
//   { id: 'c2', name: 'Ajax Amsterdam', country: 'Netherlands', address: 'Johan Cruijff ArenA, Amsterdam' },
//   { id: 'c3', name: 'RSC Anderlecht', country: 'Belgium', address: 'Theo Verbeecklaan 2, Brussels' },
//   { id: 'c4', name: 'Brøndby IF', country: 'Denmark', address: 'Brøndby Stadion 30, Brøndby' },
//   { id: 'c5', name: 'Bologna FC', country: 'Italy', address: 'Via Andrea Costa 174, Bologna' },
//   { id: 'c6', name: 'Stade Rennais', country: 'France', address: 'Route de Lorient, Rennes' },
//   { id: 'c7', name: 'Celtic FC', country: 'Scotland', address: 'Celtic Park, Glasgow' },
//   { id: 'c8', name: 'Vitória SC', country: 'Portugal', address: 'Estádio D. Afonso Henriques, Guimarães' },
// ];

// export const initialClubContacts: ClubContact[] = [
//   { id: 'cc1', clubId: 'c1', name: 'Hans Müller', role: 'Technical Director', email: 'hans@scfreiburg.de', phone: '+49 761 123456' },
//   { id: 'cc2', clubId: 'c1', name: 'Peter Schmidt', role: 'Scout', email: 'peter@scfreiburg.de' },
//   { id: 'cc3', clubId: 'c2', name: 'Erik de Vries', role: 'Coach', email: 'erik@ajax.nl', phone: '+31 20 123456' },
//   { id: 'cc4', clubId: 'c7', name: 'John MacGregor', role: 'Commercial Manager', email: 'john@celtic.co.uk' },
// ];

// export const initialPlayers: Player[] = [
//   { id: '1', fullName: 'Marcus Almeida', dateOfBirth: '2001-03-15', nationality: 'Brazil', position: 'CF', preferredFoot: 'Right', height: 183, weight: 78, currentClub: 'SC Freiburg', contractStart: '2023-07-01', contractEnd: '2027-06-30', agentName: 'Ricardo Silva', agentId: 's1', contactInfo: 'r.silva@sports.com' },
//   { id: '2', fullName: 'Yuki Tanaka', dateOfBirth: '2003-08-22', nationality: 'Japan', position: 'CM', preferredFoot: 'Both', height: 175, weight: 70, currentClub: 'Ajax Amsterdam', contractStart: '2024-01-15', contractEnd: '2026-06-15', agentName: 'Kenji Yamamoto', agentId: 's3', contactInfo: 'k.yamamoto@jfa.jp' },
//   { id: '3', fullName: 'Kwame Asante', dateOfBirth: '1998-11-02', nationality: 'Ghana', position: 'CB', preferredFoot: 'Right', height: 191, weight: 88, currentClub: 'RSC Anderlecht', contractStart: '2022-08-01', contractEnd: '2025-12-31', agentName: 'Emmanuel Ofori', agentId: 's2', contactInfo: 'e.ofori@sportsgroup.com' },
//   { id: '4', fullName: 'Oliver Berg', dateOfBirth: '2005-01-10', nationality: 'Norway', position: 'LW', preferredFoot: 'Left', height: 178, weight: 72, currentClub: 'Brøndby IF', contractStart: '2024-07-01', contractEnd: '2028-06-30', agentName: 'Lars Olsen', agentId: 's3', contactInfo: 'lars@nordictalent.no' },
//   { id: '5', fullName: 'Luca Moretti', dateOfBirth: '1999-05-18', nationality: 'Italy', position: 'GK', preferredFoot: 'Right', height: 194, weight: 85, currentClub: 'Bologna FC', contractStart: '2023-01-01', contractEnd: '2026-08-01', agentName: 'Marco Rossi', agentId: 's2', contactInfo: 'marco@ital-sport.it' },
//   { id: '6', fullName: 'Amadou Diallo', dateOfBirth: '2002-09-30', nationality: 'Senegal', position: 'RB', preferredFoot: 'Right', height: 180, weight: 75, currentClub: 'Stade Rennais', contractStart: '2023-08-01', contractEnd: '2027-07-31', agentName: 'Moussa Fall', agentId: 's3', contactInfo: 'mfall@afrisport.sn' },
//   { id: '7', fullName: "Finn O'Connor", dateOfBirth: '2004-02-14', nationality: 'Ireland', position: 'ST', preferredFoot: 'Left', height: 185, weight: 80, currentClub: 'Celtic FC', contractStart: '2024-01-01', contractEnd: '2026-03-31', agentName: 'Sean Murphy', agentId: 's1', contactInfo: 'sean@greenfield.ie' },
//   { id: '8', fullName: 'Rafael Santos', dateOfBirth: '2000-07-25', nationality: 'Portugal', position: 'CDM', preferredFoot: 'Right', height: 182, weight: 79, currentClub: 'Vitória SC', contractStart: '2022-07-01', contractEnd: '2025-06-30', agentName: 'Pedro Costa', agentId: 's1', contactInfo: 'pedro@lusosport.pt' },
// ];

// export const initialReviews: Review[] = [
//   { id: 'r1', playerId: '1', scoutId: 's1', matchDate: '2025-11-15', club1Id: 'c1', club2Id: 'c2', ratings: { passing: 4, shooting: 5, dribbling: 4, tacticalAwareness: 3, defensiveContribution: 2, physicalStrength: 4, behavior: 4, overallPerformance: 4 }, notes: 'Clinical in front of goal. Needs defensive work.', createdAt: '2025-11-16' },
//   { id: 'r2', playerId: '1', scoutId: 's2', matchDate: '2025-12-10', ratings: { passing: 3, shooting: 4, dribbling: 5, tacticalAwareness: 3, defensiveContribution: 2, physicalStrength: 4, behavior: 5, overallPerformance: 4 }, notes: 'Excellent dribbling display.', createdAt: '2025-12-11' },
//   { id: 'r3', playerId: '1', scoutId: 's1', matchDate: '2026-01-20', ratings: { passing: 4, shooting: 5, dribbling: 4, tacticalAwareness: 4, defensiveContribution: 3, physicalStrength: 4, behavior: 4, overallPerformance: 5 }, notes: 'Consistent improvement across matches.', createdAt: '2026-01-21' },
//   { id: 'r4', playerId: '2', scoutId: 's3', matchDate: '2025-10-05', ratings: { passing: 5, shooting: 3, dribbling: 4, tacticalAwareness: 5, defensiveContribution: 4, physicalStrength: 3, behavior: 5, overallPerformance: 4 }, notes: 'Outstanding vision and passing range.', createdAt: '2025-10-06' },
//   { id: 'r5', playerId: '2', scoutId: 's1', matchDate: '2026-01-28', ratings: { passing: 5, shooting: 3, dribbling: 4, tacticalAwareness: 5, defensiveContribution: 4, physicalStrength: 3, behavior: 4, overallPerformance: 4 }, notes: 'Dictated tempo from midfield.', createdAt: '2026-01-29' },
//   { id: 'r6', playerId: '3', scoutId: 's2', matchDate: '2025-09-20', ratings: { passing: 3, shooting: 2, dribbling: 2, tacticalAwareness: 4, defensiveContribution: 5, physicalStrength: 5, behavior: 4, overallPerformance: 4 }, notes: 'Dominant in aerial duels.', createdAt: '2025-09-21' },
//   { id: 'r7', playerId: '3', scoutId: 's1', matchDate: '2025-12-05', ratings: { passing: 3, shooting: 1, dribbling: 2, tacticalAwareness: 4, defensiveContribution: 5, physicalStrength: 5, behavior: 3, overallPerformance: 3 }, notes: 'Solid defensively but limited on ball.', createdAt: '2025-12-06' },
//   { id: 'r8', playerId: '4', scoutId: 's3', matchDate: '2025-11-01', ratings: { passing: 3, shooting: 4, dribbling: 5, tacticalAwareness: 3, defensiveContribution: 2, physicalStrength: 3, behavior: 4, overallPerformance: 4 }, notes: 'Electric pace and dribbling.', createdAt: '2025-11-02' },
//   { id: 'r9', playerId: '4', scoutId: 's2', matchDate: '2026-01-15', ratings: { passing: 4, shooting: 3, dribbling: 5, tacticalAwareness: 3, defensiveContribution: 2, physicalStrength: 3, behavior: 5, overallPerformance: 4 }, notes: 'Great attitude, willing runner.', createdAt: '2026-01-16' },
//   { id: 'r10', playerId: '4', scoutId: 's1', matchDate: '2026-02-08', ratings: { passing: 3, shooting: 4, dribbling: 5, tacticalAwareness: 4, defensiveContribution: 2, physicalStrength: 3, behavior: 5, overallPerformance: 4 }, notes: 'Standout performer in winter window.', createdAt: '2026-02-09' },
//   { id: 'r11', playerId: '5', scoutId: 's2', matchDate: '2025-12-20', ratings: { passing: 3, shooting: 1, dribbling: 2, tacticalAwareness: 4, defensiveContribution: 5, physicalStrength: 4, behavior: 4, overallPerformance: 4 }, notes: 'Commanding presence. Good distribution.', createdAt: '2025-12-21' },
//   { id: 'r12', playerId: '6', scoutId: 's3', matchDate: '2025-10-18', ratings: { passing: 3, shooting: 2, dribbling: 3, tacticalAwareness: 4, defensiveContribution: 4, physicalStrength: 4, behavior: 4, overallPerformance: 3 }, notes: 'Solid defensively, improving going forward.', createdAt: '2025-10-19' },
//   { id: 'r13', playerId: '6', scoutId: 's1', matchDate: '2025-12-15', ratings: { passing: 4, shooting: 2, dribbling: 3, tacticalAwareness: 4, defensiveContribution: 4, physicalStrength: 5, behavior: 4, overallPerformance: 4 }, notes: 'Athletic and tireless performer.', createdAt: '2025-12-16' },
//   { id: 'r14', playerId: '7', scoutId: 's2', matchDate: '2026-02-01', ratings: { passing: 3, shooting: 4, dribbling: 3, tacticalAwareness: 3, defensiveContribution: 2, physicalStrength: 4, behavior: 3, overallPerformance: 3 }, notes: 'Good instinct in the box. Raw talent.', createdAt: '2026-02-02' },
//   { id: 'r15', playerId: '8', scoutId: 's3', matchDate: '2025-11-22', ratings: { passing: 4, shooting: 2, dribbling: 3, tacticalAwareness: 5, defensiveContribution: 5, physicalStrength: 4, behavior: 5, overallPerformance: 4 }, notes: 'Shield in front of defense. Leader.', createdAt: '2025-11-23' },
// ];

// export const initialNotes: Note[] = [
//   { id: 'n1', entityType: 'player', entityId: '1', topic: 'Transfer Interest', description: 'Multiple Bundesliga clubs showing interest. Need to discuss with player.', category: 'private', followUpDate: '2026-04-01', createdBy: 's1', createdAt: '2026-02-15' },
//   { id: 'n2', entityType: 'player', entityId: '3', topic: 'Knee Assessment', description: 'Minor knee discomfort after last match. Monitoring required.', category: 'medical', createdBy: 's2', createdAt: '2026-01-10' },
//   { id: 'n3', entityType: 'club', entityId: 'c2', topic: 'Meeting with Ajax', description: 'Discussed potential youth exchange program. Positive response from TD.', category: 'meeting', followUpDate: '2026-03-20', createdBy: 's1', createdAt: '2026-02-20' },
// ];

// export const initialTasks: Task[] = [
//   { id: 't1', title: 'Contract expiring soon - Kwame Asante', description: 'Contract ends Dec 2025. Begin renewal discussions.', relatedEntityType: 'player', relatedEntityId: '3', assignedTo: 's2', dueDate: '2025-10-01', status: 'open', createdAt: '2025-07-01', source: 'contract' },
//   { id: 't2', title: 'Contract expiring soon - Rafael Santos', description: 'Contract ends Jun 2025. Urgent renewal needed.', relatedEntityType: 'player', relatedEntityId: '8', assignedTo: 's1', dueDate: '2025-04-01', status: 'open', createdAt: '2025-01-01', source: 'contract' },
//   { id: 't3', title: 'Follow up: Transfer Interest', description: 'Follow up on transfer interest note for Marcus Almeida.', relatedEntityType: 'player', relatedEntityId: '1', assignedTo: 's1', dueDate: '2026-04-01', status: 'open', createdAt: '2026-02-15', source: 'note' },
// ];

// export const initialEmails: Email[] = [
//   { id: 'e1', relatedEntityType: 'player', relatedEntityId: '1', to: 'r.silva@sports.com', subject: 'Performance Update - Marcus Almeida', body: 'Dear Ricardo,\n\nPlease find attached the latest performance review for Marcus Almeida...', sentBy: 's1', sentAt: '2026-01-25' },
//   { id: 'e2', relatedEntityType: 'club', relatedEntityId: 'c2', to: 'erik@ajax.nl', subject: 'Youth Exchange Program Follow-up', body: 'Dear Erik,\n\nThank you for the productive meeting regarding the youth exchange program...', sentBy: 's1', sentAt: '2026-02-22' },
// ];

// export const initialTemplates: Template[] = [
//   { id: 'tmpl1', name: 'Performance Review', type: 'email', subject: 'Player Development Review - {PlayerName}', body: 'Dear {PlayerName},\n\nYour performance review from {ReviewDate} shows improvement in {Skill}.\n\nWe look forward to continued progress.\n\nBest regards,\n{AgentName}', createdAt: '2026-01-01' },
//   { id: 'tmpl2', name: 'Contract Discussion', type: 'email', subject: 'Contract Discussion - {PlayerName}', body: 'Dear {PlayerName},\n\nWe would like to discuss the terms of your contract with {ClubName}.\n\nPlease let us know your availability.\n\nBest regards,\n{AgentName}', createdAt: '2026-01-01' },
//   { id: 'tmpl3', name: 'Scouting Report Letter', type: 'letter', body: 'SCOUTING REPORT\n\nPlayer: {PlayerName}\nClub: {ClubName}\nDate: {ReviewDate}\n\nSkill Highlights: {Skill}\n\nPrepared by: {AgentName}', createdAt: '2026-01-01' },
// ];
