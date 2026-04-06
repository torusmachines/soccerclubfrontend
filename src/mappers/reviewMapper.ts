// // src/mappers/reviewMapper.ts
// import type { Review } from '@/types';

// export const mapReview = (api: any): Review => ({
//     id: api.id,
//     playerId: api.playerId ?? api.player_id,
//     scoutId: api.scoutId ?? api.scout_id,
//     matchDate: api.matchDate ?? api.match_date,
//     club1Id: api.club1Id ?? api.club1_id ?? undefined,
//     club2Id: api.club2Id ?? api.club2_id ?? undefined,
//     ratings: {
//         passing: api.ratings?.passing ?? api.passing ?? 0,
//         shooting: api.ratings?.shooting ?? api.shooting ?? 0,
//         dribbling: api.ratings?.dribbling ?? api.dribbling ?? 0,
//         tacticalAwareness: api.ratings?.tacticalAwareness ?? api.tactical_awareness ?? 0,
//         defensiveContribution: api.ratings?.defensiveContribution ?? api.defensive_contribution ?? 0,
//         physicalStrength: api.ratings?.physicalStrength ?? api.physical_strength ?? 0,
//         behavior: api.ratings?.behavior ?? api.behavior ?? 0,
//         overallPerformance: api.ratings?.overallPerformance ?? api.overall_performance ?? 0,
//     },
//     notes: api.notes ?? '',
//     createdAt: api.createdAt ?? api.created_at,
// });