import { Player, Review, Ratings, ContractStatus, DevelopmentPlan, DevelopmentGoal, MatchCriteria, RATING_CATEGORIES } from '@/types';
import { addMonths, differenceInDays } from 'date-fns';
import { getContractExpiringMonths } from '@/lib/settingsUtils';

type RatingKey =
  | "passing"
  | "shooting"
  | "dribbling"
  | "tacticalAwareness"
  | "defensiveContribution"
  | "physicalStrength"
  | "behavior"
  | "overallPerformance";

const ratingKeys: RatingKey[] = [
  "passing",
  "shooting",
  "dribbling",
  "tacticalAwareness",
  "defensiveContribution",
  "physicalStrength",
  "behavior",
  "overallPerformance"
];

// Contract status logic: compare only differenceInMonths
// export function getContractStatus(player: Player): ContractStatus {
//   const now = new Date();
//   const end = new Date(player.contractEnd);
//   if (end < now) return 'Available';
//   if (differenceInMonths(end, now) <= 6) return 'Expiring Soon';
//   return 'Active';
// }


export function getContractStatus(player: Player): ContractStatus {
  const now = new Date();
  const end = new Date(player.contractEnd);

  // If already expired
  if (end < now) return 'Available';

  const monthsThreshold = getContractExpiringMonths();
  const thresholdDate = addMonths(now, monthsThreshold);

  if (end <= thresholdDate) return 'Expiring Soon';

  return 'Active';
}


const emptyRatings: Ratings = {
  reviewId: '',
  passing: 0,
  shooting: 0,
  dribbling: 0,
  tacticalAwareness: 0,
  defensiveContribution: 0,
  physicalStrength: 0,
  behavior: 0,
  overallPerformance: 0,
  review: null
};

// export function getAverageRatings(reviews: Review[]): Ratings {
//   if (reviews.length === 0) return { ...emptyRatings };
//   const sum = { ...emptyRatings };
//   reviews.forEach(r => {
//     (Object.keys(sum) as (keyof Ratings)[]).forEach(k => { sum[k] += r.revRatings[k]; });
//   });
//   const avg: any = {};
//   (Object.keys(sum) as (keyof Ratings)[]).forEach(k => { avg[k] = sum[k] / reviews.length; });
//   return avg as Ratings;
// }
export function getAverageRatings(reviews: Review[]): Ratings {

  if (reviews.length === 0) return { ...emptyRatings };

  const sum = { ...emptyRatings };

  reviews.forEach(r => {

    if (!r.revRatings) return;

    ratingKeys.forEach(k => {
      sum[k] += r.revRatings![k];
    });

  });

  const avg: Ratings = { ...emptyRatings };

  ratingKeys.forEach(k => {
    avg[k] = sum[k] / reviews.length;
  });

  return avg;
}

// export function calculateOverallAverage(ratings: Ratings): number {
//   const vals = Object.values(ratings);
//   if (vals.length === 0) return 0;
//   return vals.reduce((s, v) => s + v, 0) / vals.length;
// }
export function calculateOverallAverage(ratings: Ratings): number {
  const vals = Object.values(ratings).filter(
    (v): v is number => typeof v === "number"
  );

  if (vals.length === 0) return 0;

  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

export interface MatchResult {
  player: Player;
  matchScore: number;
  averageRatings: Ratings;
  contractStatus: ContractStatus;
}

export function matchPlayers(players: Player[], reviews: Review[], criteria: MatchCriteria): MatchResult[] {
  return players.map(player => {
    const playerReviews = reviews.filter(r => r.playerId === String(player.id));
    const avgRatings = getAverageRatings(playerReviews);
    const contractStatus = getContractStatus(player);
    const overall = calculateOverallAverage(avgRatings);

    let total = 0, met = 0;
    if (criteria.position) { total++; if (player.position === criteria.position) met++; }
    if (criteria.preferredFoot) { total++; if (player.preferredFoot === criteria.preferredFoot) met++; }
    if (criteria.contractStatus) { total++; if (contractStatus === criteria.contractStatus) met++; }

    const ratingChecks: [number | undefined, number][] = [
      [criteria.minPassing, avgRatings.passing],
      [criteria.minShooting, avgRatings.shooting],
      [criteria.minDribbling, avgRatings.dribbling],
      [criteria.minTacticalAwareness, avgRatings.tacticalAwareness],
      [criteria.minDefensiveContribution, avgRatings.defensiveContribution],
      [criteria.minPhysicalStrength, avgRatings.physicalStrength],
      [criteria.minOverall, overall],
    ];
    ratingChecks.forEach(([min, val]) => {
      if (min && min > 0) { total++; met += Math.min(val / min, 1); }
    });

    const matchScore = total > 0 ? Math.round((met / total) * 100) : 100;
    return { player, matchScore, averageRatings: avgRatings, contractStatus };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

const TRAINING_TIPS: Record<string, string[]> = {
  passing: ['Long-range passing drills with both feet', 'One-touch passing exercises in small-sided games', 'Vision training through pattern recognition drills'],
  shooting: ['Finishing drills from various angles and distances', 'Shooting under pressure in game-like scenarios', 'Weak foot finishing accuracy training'],
  dribbling: ['Close control drills in tight spaces', '1v1 attacking scenarios against defenders', 'Speed dribbling with direction changes'],
  tacticalAwareness: ['Video analysis of positioning and movement', 'Shadow play and positional games', 'Team tactical sessions for reading the game'],
  defensiveContribution: ['Pressing triggers and intensity training', '1v1 defensive drills and recovery runs', 'Team pressing and defensive shape exercises'],
  physicalStrength: ['Functional strength gym program', 'Explosive power training with plyometrics', 'Core stability and balance exercises'],
  behavior: ['Leadership mentoring with senior players', 'Mental resilience and focus workshops', 'Communication and team bonding activities'],
  overallPerformance: ['Full match simulation training', 'Individualized performance review sessions', 'Goal-setting and tracking program'],
};

export function generateDevPlan(player: Player, avgRatings: Ratings): DevelopmentPlan {
  const sorted = RATING_CATEGORIES.map(c => ({ ...c, value: avgRatings[c.key] })).sort((a, b) => a.value - b.value);
  const weakest = sorted.slice(0, 3);

  const goals: DevelopmentGoal[] = weakest.map(c => ({
    category: c.label,
    currentRating: Math.round(c.value * 10) / 10,
    targetRating: Math.min(5, Math.round((c.value + 1) * 10) / 10),
    actions: TRAINING_TIPS[c.key] || [],
  }));

  return {
    id: crypto.randomUUID(),
    playerId: player.id,
    generatedAt: new Date().toISOString(),
    goals,
    recommendations: [
      `Primary focus: improve ${weakest[0]?.label} through dedicated weekly sessions`,
      `Secondary target: ${weakest[1]?.label} – integrate into match-day prep`,
      `Monitor progress on ${weakest[2]?.label} with bi-weekly assessments`,
    ],
    physicalFocus: avgRatings.physicalStrength < 3
      ? ['Structured strength & conditioning program', 'Explosive power development', 'Core stability training']
      : ['Maintain current fitness levels', 'Injury prevention protocols', 'Recovery optimization'],
    duration: '3_months',
  };
}
