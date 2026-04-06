// // src/mappers/clubMapper.ts
// import type { Club } from '@/types';

// export const mapClub = (api: any): Club => ({
//   id: api.clubId ?? api.id,
//   name: api.clubName ?? api.name ?? api.club_name,
//   country: api.country,
//   address: api.addressLine ?? api.address
// });