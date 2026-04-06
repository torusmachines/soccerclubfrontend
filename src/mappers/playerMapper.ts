// // src/mappers/playerMapper.ts
// import type { Player } from '@/types';

// export const mapPlayer = (api: any): Player => ({
//   id: String(api.id),

//   fullName: api.fullName,
//   dateOfBirth: api.dateOfBirth,
//   nationality: api.nationality,
//   position: api.position,

//   preferredFoot: api.preferredFoot ?? 'Right',

//   // API uses heightCm / weightKg
//   height: api.heightCm ?? api.height ?? 0,
//   weight: api.weightKg ?? api.weight ?? 0,

//   // API returns club id like "c6"
//   currentClub: api.currentClub,

//   contractStart: api.contractStart,
//   contractEnd: api.contractEnd,

//   agentName: api.agentName ?? '',

//   // API doesn't provide agentId
//   agentId: api.agentId ?? 's1',

//   // API uses agentContact
//   contactInfo: api.agentContact ?? '',
// });





// // // src/mappers/playerMapper.ts
// // import type { Player } from '@/types';

// // export const mapPlayer = (api: any): Player => ({
// //   id: api.id,
// //   fullName: api.fullName ?? api.name ?? api.full_name,
// //   dateOfBirth: api.dateOfBirth ?? api.dob ?? api.date_of_birth,
// //   nationality: api.nationality ?? api.country,
// //   position: api.position,
// //   preferredFoot: api.preferredFoot ?? api.preferred_foot ?? 'Right',
// //   height: api.height,
// //   weight: api.weight,
// //   currentClub: api.currentClub ?? api.clubName ?? api.club_name,
// //   contractStart: api.contractStart ?? api.contract_start,
// //   contractEnd: api.contractEnd ?? api.contract_end,
// //   agentName: api.agentName ?? api.agent_name,
// //   agentId: api.agentId ?? api.agent_id,
// //   contactInfo: api.contactInfo ?? api.email ?? api.contact_info,
// // });