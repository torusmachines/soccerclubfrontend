// src/mappers/noteMapper.ts
import type { Note } from '@/types';

// export const mapNote = (api: any): Note => ({
//   id: api.id,
//   entityType: api.entityType ?? api.entity_type,
//   entityId: api.entityId ?? api.entity_id,
//   topic: api.topic,
//   description: api.description,
//   category: api.category ?? 'general',
//   followUpDate: api.followUpDate ?? api.follow_up_date ?? undefined,
//   createdBy: api.createdBy ?? api.created_by,
//   createdAt: api.createdAt ?? api.created_at,
// });

// ─────────────────────────────────────────────

// src/mappers/taskMapper.ts
import type { Task } from '@/types';

// export const mapTask = (api: any): Task => ({
//   id: api.id,
//   title: api.title,
//   description: api.description,
//   relatedEntityType: api.relatedEntityType ?? api.related_entity_type ?? undefined,
//   relatedEntityId: api.relatedEntityId ?? api.related_entity_id ?? undefined,
//   assignedTo: api.assignedTo ?? api.assigned_to,
//   dueDate: api.dueDate ?? api.due_date,
//   status: api.status ?? 'open',
//   createdAt: api.createdAt ?? api.created_at,
//   source: api.source ?? undefined,
// });

// ─────────────────────────────────────────────

// src/mappers/emailMapper.ts
import type { Email } from '@/types';

// export const mapEmail = (api: any): Email => ({
//   id: api.id,
//   relatedEntityType: api.relatedEntityType ?? api.related_entity_type ?? undefined,
//   relatedEntityId: api.relatedEntityId ?? api.related_entity_id ?? undefined,
//   to: api.to,
//   subject: api.subject,
//   body: api.body,
//   sentBy: api.sentBy ?? api.sent_by,
//   sentAt: api.sentAt ?? api.sent_at,
// });

// ─────────────────────────────────────────────

// src/mappers/templateMapper.ts
import type { Template } from '@/types';

// export const mapTemplate = (api: any): Template => ({
//   id: api.id,
//   name: api.name,
//   type: api.type ?? 'email',
//   subject: api.subject ?? undefined,
//   body: api.body,
//   createdAt: api.createdAt ?? api.created_at,
// });