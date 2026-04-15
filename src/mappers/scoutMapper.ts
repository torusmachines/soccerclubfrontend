// src/mappers/scoutMapper.ts
import type { Scout } from '@/types';

export const mapScout = (api: any): Scout => ({
  scoutId: api.scoutId ?? api.id,
  scoutName: api.scoutName ?? api.name ?? api.fullName ?? api.full_name,
  roleName: api.roleName ?? api.role,
  email: api.email,
  firstName: api.firstName ?? api.first_name ?? api.givenName ?? api.given_name,
  lastName: api.lastName ?? api.last_name ?? api.familyName ?? api.family_name,
  phoneNumber: api.phoneNumber ?? api.phone ?? api.phone_number,
  addressLine1: api.addressLine1 ?? api.address_line1 ?? api.address1,
  addressLine2: api.addressLine2 ?? api.address_line2 ?? api.address2,
  city: api.city,
  state: api.state,
  postalCode: api.postalCode ?? api.postal_code,
  country: api.country,
  createdAt: api.createdAt ?? new Date().toISOString(),
});