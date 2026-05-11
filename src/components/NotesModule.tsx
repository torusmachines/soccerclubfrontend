import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/context/PlayerContext';
import { useAuth } from '@/context/AuthContext';
import { isPlayerRole, isScoutRole } from '@/lib/accessPolicy';
import { Note, NoteCategory, NOTE_CATEGORIES, EntityType } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, StickyNote, Calendar, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

interface NotesModuleProps {
  entityType: EntityType;
  entityId: string;
  filterCategory?: NoteCategory;
  readOnly?: boolean;
  apiNotes?: Note[];
  onNotesChanged?: () => void | Promise<void>;
}

const categoryColors: Record<NoteCategory, string> = {
  private: 'bg-purple-100 text-purple-800',
  medical: 'bg-red-100 text-red-800',
  technical: 'bg-blue-100 text-blue-800',
  performance: 'bg-green-100 text-green-800',
  meeting: 'bg-amber-100 text-amber-800',

  announcement: 'bg-indigo-100 text-indigo-800',
  reminder: 'bg-yellow-100 text-yellow-800',
  report: 'bg-slate-100 text-slate-800',
  discussion: 'bg-cyan-100 text-cyan-800',
  decision: 'bg-emerald-100 text-emerald-800',
  issue: 'bg-rose-100 text-rose-800',
  update: 'bg-gray-100 text-gray-800',

  training_session: 'bg-sky-100 text-sky-800',
  match_review: 'bg-teal-100 text-teal-800',
  injury_update: 'bg-red-200 text-red-900',
  transfer_update: 'bg-violet-100 text-violet-800',
  disciplinary: 'bg-orange-100 text-orange-800',

  financial: 'bg-lime-100 text-lime-800',
  sponsorship: 'bg-fuchsia-100 text-fuchsia-800',
  event: 'bg-pink-100 text-pink-800',
  facility: 'bg-stone-100 text-stone-800',
};

export const NotesModule = ({ entityType, entityId, filterCategory, readOnly = false, apiNotes, onNotesChanged }: NotesModuleProps) => {
  const { notes, addNote, scouts, updateNote } = useAppContext();
  const { user } = useAuth();
  const isPlayerUser = isPlayerRole(user?.role);
  const isScoutUser = isScoutRole(user?.role);
  const isAdminUser = user?.role === 'Admin';
  const navigate = useNavigate();

  const entityNotes = useMemo(() => {
    // If API notes are provided, use them directly (already filtered by entity)
    if (apiNotes) {
      let filtered = filterCategory
        ? apiNotes.filter(n => n.category === filterCategory)
        : apiNotes;
      if (isPlayerUser) {
        filtered = filtered.filter(n => (n.isVisibleToPlayer ?? false));
      }
      return filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    let filtered = notes.filter(n =>
      (entityType === 'player' && String(n.playerId || '') === String(entityId || '')) ||
      (entityType === 'club' && String(n.clubId || '') === String(entityId || ''))
    );

    if (filterCategory) {
      filtered = filtered.filter(n => n.category === filterCategory);
    }

    if (isPlayerUser) {
      filtered = filtered.filter(n => (n.isVisibleToPlayer ?? false));
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notes, apiNotes, entityType, entityId, filterCategory, isPlayerUser]);

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end">
          <AddNoteDialog entityType={entityType} entityId={entityId} scouts={scouts} onAdd={addNote} defaultCategory={filterCategory} onSuccess={onNotesChanged} />
        </div>
      )}
      {entityNotes.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No notes yet</p>
      ) : (
        <div className="space-y-3">
          {entityNotes.map(note => (
            <Card key={note.noteId} onClick={() => {
              if (entityType === 'player') navigate(`/players/${entityId}?tab=notes&noteId=${encodeURIComponent(note.noteId)}`);
              else navigate(`/clubs/${entityId}?tab=notes&noteId=${encodeURIComponent(note.noteId)}`);
            }}>
              {/* <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StickyNote size={14} className="text-muted-foreground" />
                    <span className="font-medium text-sm">{note.topic}</span>
                    <Badge variant="secondary" className={categoryColors[note.category]}>
                      {NOTE_CATEGORIES.find(c => c.value === note.category)?.label}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(note.createdAt), 'MMM d, yyyy')}</span>
                </div>
                <p className="text-sm text-muted-foreground">{note.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>By: {scouts.find(s => s.scoutId === note.createdByScoutId)?.scoutName || note.createdByScoutId}</span>
                  {note.followUpDate && (
                    <span className="flex items-center gap-1 text-accent">
                      <Calendar size={10} /> Follow-up: {format(new Date(note.followUpDate), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
                <div className="flex-end gap-2 ml-auto ">
                  <EditNoteDialog note={note} />
                  <DeleteNoteDialog note={note} />
                </div>
              </CardContent> */}
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StickyNote size={14} className="text-muted-foreground" />
                    {entityType !== 'club' && (
                      <span className="font-medium text-sm">{note.topic}</span>
                    )}
                    <Badge variant="secondary" className={categoryColors[note.category as NoteCategory]}>
                      {NOTE_CATEGORIES.find(c => c.value === note.category)?.label}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(note.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>

                {entityType === 'club' ? (
                  <div className="space-y-1 text-sm">
                    {note.meetingDate && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar size={12} />
                        <span className="font-medium text-foreground">Meeting Date:</span>
                        {format(new Date(note.meetingDate), 'MMM d, yyyy')}
                      </div>
                    )}
                    {note.attendees && (
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">Attendees:</span> {note.attendees}
                      </div>
                    )}
                    {note.description && (
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">Summary:</span> {note.description}
                      </div>
                    )}
                    {note.followUpDate && (
                      <div className="flex items-center gap-1 text-accent">
                        <Calendar size={10} />
                        <span className="font-medium">Follow-up:</span> {format(new Date(note.followUpDate), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">{note.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {note.followUpDate && (
                        <span className="flex items-center gap-1 text-accent">
                          <Calendar size={10} />
                          Follow-up: {format(new Date(note.followUpDate), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </>
                )}


                {/* Buttons aligned right */}
                {!readOnly && (

                  <div className="flex justify-between gap-2 mt-3">
                    {(isAdminUser || isScoutUser) && (
                      <div className="flex items-center gap-2 mt-3 text-xs">
                        <span onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                          <Switch
                            id={`visible-${note.noteId}`}
                            checked={note.isVisibleToPlayer ?? false}
                            onCheckedChange={async (value) => {
                              await updateNote({ ...note, isVisibleToPlayer: value });
                              await onNotesChanged?.();
                            }}
                          />
                          <Label htmlFor={`visible-${note.noteId}`}>Show this note to player</Label>
                        </span>
                      </div>
                    )}
                        <div className='flex gap-2'>
                          {(isAdminUser || isScoutUser) && (
                            <>
                              <span onClick={(e) => e.stopPropagation()}>
                                <EditNoteDialog note={note} entityType={entityType} onSuccess={onNotesChanged} />
                              </span>
                              <span onClick={(e) => e.stopPropagation()}>
                                <DeleteNoteDialog note={note} onSuccess={onNotesChanged} />
                              </span>
                            </>
                          )}
                        </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};


const AddNoteDialog = ({ entityType, entityId, scouts, onAdd, defaultCategory, onSuccess }: {
  entityType: EntityType;
  entityId: string;
  scouts: any[];
  onAdd: (n: Note) => Promise<void>;   // ← was: void
  defaultCategory?: NoteCategory;
  onSuccess?: () => void | Promise<void>;
}) => {
  const { user } = useAuth();
  const isPlayerUser = isPlayerRole(user?.role);
  const isScoutUser = isScoutRole(user?.role);
  const isAdminUser = user?.role === 'Admin';

  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [attendees, setAttendees] = useState('');
  // limit categories for clubs: only club-relevant categories (e.g., private, meeting)
  // const availableCategories = useMemo(() => {
  //   if (entityType === 'club') {
  //     return NOTE_CATEGORIES.filter(c => c.value === 'Announcement' || c.value === 'meeting');
  //   }
  //   return NOTE_CATEGORIES;
  // }, [entityType]);

  const PLAYER_ALLOWED_CATEGORIES: NoteCategory[] = ['private', 'medical', 'technical', 'performance'];
  const CLUB_ALLOWED_CATEGORIES: NoteCategory[] = ['injury_update','transfer_update','disciplinary','financial','sponsorship','event','facility','meeting'];

  const availableCategories = useMemo(() => {
    if (entityType === 'club') return NOTE_CATEGORIES.filter(c => CLUB_ALLOWED_CATEGORIES.includes(c.value));
    if (entityType === 'player') return NOTE_CATEGORIES.filter(c => PLAYER_ALLOWED_CATEGORIES.includes(c.value));
    return NOTE_CATEGORIES;
  }, [entityType]);

  const defaultCatForEntity: NoteCategory = (defaultCategory && availableCategories.some(c => c.value === defaultCategory))
    ? defaultCategory
    : (availableCategories[0]?.value || 'private');

  const [category, setCategory] = useState<NoteCategory>(defaultCatForEntity as NoteCategory);
  const [followUpDate, setFollowUpDate] = useState('');
  const [createdBy, setCreatedBy] = useState(user?.loginUser?.id ?? user?.id ?? '');
  const [isVisibleToPlayer, setIsVisibleToPlayer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setCreatedBy(user?.loginUser?.id ?? user?.id ?? '');
  }, [user]);

  const resetForm = () => {
    setTopic('');
    setDescription('');
    setMeetingDate('');
    setAttendees('');
    setCategory((defaultCategory && availableCategories.some(c => c.value === defaultCategory)) ? defaultCategory : (availableCategories[0]?.value as NoteCategory || 'private'));
    setFollowUpDate('');
    setCreatedBy('');
    setIsVisibleToPlayer(false);
    setErrors({});
    setSubmitting(false);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, defaultCategory]);

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};

    if (entityType !== 'club' && !topic.trim()) nextErrors.topic = 'Required field';
    if (!category) nextErrors.category = 'Required field';
    if (!description.trim()) nextErrors.description = 'Required field';
    if (entityType === 'player' && !String(entityId || '').trim()) {
      nextErrors.entityId = 'Player ID is missing. Please refresh and try again.';
    }
    if (entityType === 'club' && !String(entityId || '').trim()) {
      nextErrors.entityId = 'Club ID is missing. Please refresh and try again.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const safeEntityId = String(entityId || '').trim();
      await onAdd({
        noteId: '',
        playerId: entityType === 'player' ? safeEntityId : undefined,
        clubId: entityType === 'club' ? safeEntityId : undefined,
        topic: entityType === 'club' ? (meetingDate ? `Meeting - ${meetingDate}` : 'Meeting Note') : topic,
        description,
        category,
        followUpDate: followUpDate || undefined,
        meetingDate: entityType === 'club' ? (meetingDate || undefined) : undefined,
        attendees: entityType === 'club' ? (attendees || undefined) : undefined,
        isVisibleToPlayer,
        createdByScoutId: createdBy,
        createdAt: new Date().toISOString(),
      });
      await onSuccess?.();
      setOpen(false);
      setTopic('');
      setDescription('');
      setMeetingDate('');
      setAttendees('');
      setFollowUpDate('');
      setCreatedBy('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus size={14} className="mr-1" /> Add Note</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Note</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {errors.entityId && <p className="text-xs text-destructive">{errors.entityId}</p>}
          {entityType !== 'club' && (
            <div>
              <Label>Topic <span className="text-red-500">*</span></Label>
              <Input value={topic} onChange={e => { setTopic(e.target.value); setErrors(prev => ({ ...prev, topic: '' })); }} placeholder="Note topic..." />
              {errors.topic && <p className="text-xs text-destructive mt-1">{errors.topic}</p>}
            </div>
          )}
          <div>
            <Label>Category <span className="text-red-500">*</span></Label>
            <Select value={category} onValueChange={v => { setCategory(v as NoteCategory); setErrors(prev => ({ ...prev, category: '' })); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive mt-1">{errors.category}</p>}
          </div>
          {entityType === 'club' && (
            <div>
              <Label>Meeting Date</Label>
              <Input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
            </div>
          )}
          {entityType === 'club' && (
            <div>
              <Label>Attendees</Label>
              <Input value={attendees} onChange={e => setAttendees(e.target.value)} placeholder="Names of attendees..." />
            </div>
          )}
          <div>
            <Label>{entityType === 'club' ? 'Summary' : 'Description'} <span className="text-red-500">*</span></Label>
            <Textarea value={description} onChange={e => { setDescription(e.target.value); setErrors(prev => ({ ...prev, description: '' })); }} placeholder={entityType === 'club' ? 'Meeting summary...' : 'Details...'} />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
          </div>
          <div>
            <Label>Follow-up Date (optional)</Label>
            <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
          </div>

          {(isAdminUser || isScoutUser) && (
            <div className="flex items-center gap-2">
              <Switch id="isVisibleToPlayer" checked={isVisibleToPlayer} onCheckedChange={setIsVisibleToPlayer} />
              <Label htmlFor="isVisibleToPlayer">Show this note to player: {isVisibleToPlayer ? 'Yes' : 'No'}</Label>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? 'Saving...' : 'Save Note'}   {/* ← loading state */}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EditNoteDialog = ({ note, entityType, onSuccess }: { note: Note; entityType: EntityType; onSuccess?: () => void | Promise<void> }) => {
  const { updateNote, scouts } = useAppContext();
  const [open, setOpen] = useState(false);

  const [topic, setTopic] = useState(note.topic);
  const [description, setDescription] = useState(note.description);
  const [category, setCategory] = useState<NoteCategory>(
    (note.category as NoteCategory) || 'private'
  );
  const [followUpDate, setFollowUpDate] = useState(note.followUpDate || '');
  const [meetingDate, setMeetingDate] = useState(note.meetingDate || '');
  const [attendees, setAttendees] = useState(note.attendees || '');
  const [isVisibleToPlayer, setIsVisibleToPlayer] = useState(note.isVisibleToPlayer ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setTopic(note.topic);
      setDescription(note.description);
      setCategory((note.category as NoteCategory) || 'private');
      setFollowUpDate(note.followUpDate || '');
      setMeetingDate(note.meetingDate || '');
      setAttendees(note.attendees || '');
      setIsVisibleToPlayer(note.isVisibleToPlayer ?? false);
      setErrors({});
    }
  }, [open, note]);

  const handleUpdate = async () => {
    const nextErrors: Record<string, string> = {};

    if (entityType !== 'club' && !topic.trim()) nextErrors.topic = 'Required field';
    if (!category) nextErrors.category = 'Required field';
    if (!description.trim()) nextErrors.description = 'Required field';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      await updateNote({
        ...note,
        topic: entityType === 'club' ? (meetingDate ? `Meeting - ${meetingDate}` : 'Meeting Note') : topic,
        description,
        category,
        followUpDate: followUpDate || undefined,
        meetingDate: entityType === 'club' ? (meetingDate || undefined) : undefined,
        attendees: entityType === 'club' ? (attendees || undefined) : undefined,
        isVisibleToPlayer,
      });

      await onSuccess?.();

      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Edit</Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* Topic — hidden for clubs */}
          {entityType !== 'club' && (
            <div>
              <Label>Topic <span className="text-red-500">*</span></Label>
              <Input value={topic} onChange={e => { setTopic(e.target.value); setErrors(prev => ({ ...prev, topic: '' })); }} />
              {errors.topic && <p className="text-xs text-destructive mt-1">{errors.topic}</p>}
            </div>
          )}

          {/* Category */}
          <div>
            <Label>Category <span className="text-red-500">*</span></Label>
            <Select value={category} onValueChange={v => { setCategory(v as NoteCategory); setErrors(prev => ({ ...prev, category: '' })); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTE_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive mt-1">{errors.category}</p>}
          </div>

          {/* Meeting Date — clubs only */}
          {entityType === 'club' && (
            <div>
              <Label>Meeting Date</Label>
              <Input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
            </div>
          )}

          {/* Attendees — clubs only */}
          {entityType === 'club' && (
            <div>
              <Label>Attendees</Label>
              <Input value={attendees} onChange={e => setAttendees(e.target.value)} placeholder="Names of attendees..." />
            </div>
          )}

          {/* Description / Summary */}
          <div>
            <Label>{entityType === 'club' ? 'Summary' : 'Description'} <span className="text-red-500">*</span></Label>
            <Textarea value={description} onChange={e => { setDescription(e.target.value); setErrors(prev => ({ ...prev, description: '' })); }} />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
          </div>

          {/* Follow up */}
          <div>
            <Label>Follow-up Date</Label>
            <Input
              type="date"
              value={followUpDate}
              onChange={e => setFollowUpDate(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch id="edit-visible-player" checked={isVisibleToPlayer} onCheckedChange={setIsVisibleToPlayer} />
            <Label htmlFor="edit-visible-player">Show this note to player: {isVisibleToPlayer ? 'Yes' : 'No'}</Label>
          </div>

          {/* Button */}
          <Button onClick={handleUpdate} disabled={submitting} className="w-full">
            {submitting ? 'Updating...' : 'Update Note'}
          </Button>

        </div>
      </DialogContent>
    </Dialog>
  );
};


const DeleteNoteDialog = ({ note, onSuccess }: { note: Note; onSuccess?: () => void | Promise<void> }) => {
  const { deleteNote } = useAppContext();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    await deleteNote(note.noteId, note.topic);
    await onSuccess?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">Delete</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Note</DialogTitle>
        </DialogHeader>

        <p>
          Are you sure you want to delete <b>{note.topic}</b>?
        </p>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const NoteViewDialog = ({ noteId, note: noteProp, open, onOpenChange, onNoteChanged }: { noteId?: string | null; note?: Note | null; open?: boolean; onOpenChange?: (v: boolean) => void; onNoteChanged?: () => void | Promise<void> }) => {
  const { notes, scouts } = useAppContext();
  const { updateNote } = useAppContext();
  const note = noteProp ?? (noteId ? notes.find(n => n.noteId === noteId) : undefined);
  const { user } = useAuth();
  const isEditable = (isScoutRole(user?.role) || user?.role === 'Admin');

  const [isEditing, setIsEditing] = useState(false);
  const [editTopic, setEditTopic] = useState('');
  const [editCategory, setEditCategory] = useState<NoteCategory>('private');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // no local open state — derive from props or presence of noteId/note

  useEffect(() => {
    if (note) {
      setEditTopic(note.topic);
      setEditCategory(note.category as NoteCategory);
      setEditDescription(note.description);
    }
  }, [note]);

  const availableCategoriesForNote = useMemo(() => {
    if (!note) return NOTE_CATEGORIES;
    if (note.clubId) return NOTE_CATEGORIES.filter(c => ['private', 'meeting'].includes(c.value));
    if (note.playerId) return NOTE_CATEGORIES.filter(c => ['private', 'medical', 'technical', 'performance'].includes(c.value));
    return NOTE_CATEGORIES;
  }, [note]);

  const handleOpenChange = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
  };

  const isOpen = typeof open !== 'undefined' ? open : Boolean(noteId || noteProp);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start justify-between mt-5">
            <DialogTitle>{isEditing ? 'Edit Note' : (note ? note.topic : 'Loading...')}</DialogTitle>
            {isEditable && note && (
              <button onClick={() => setIsEditing(prev => !prev)} className="text-muted-foreground ml-2">
                <div className="ml-2 flex items-center gap-1 text-sm text-muted-foreground bg-red-50 border-none px-2 py-1 rounded hover:bg-red-100 hover:text-foreground transition">
                <Edit2 size={16} />
                <span className='text-sm'>Edit</span>
                </div>
              </button>
            )}
          </div>
        </DialogHeader>
        <div className="space-y-3">
          {note ? (
            <>
              <div>
                <div className="text-sm text-muted-foreground">Category : {isEditing ? (
                  <Select value={editCategory} onValueChange={v => setEditCategory(v as NoteCategory)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableCategoriesForNote.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : note.category}</div>
              </div>

              <div className="text-sm">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input value={editTopic} onChange={e => setEditTopic(e.target.value)} />
                    <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                  </div>
                ) : (
                  note.description
                )}
              </div>

              <div className='flex gap-2'>
               <span className="text-sm text-muted-foreground">Created : </span>
              <div className="text-sm text-muted-foreground"> {format(new Date(note.createdAt), 'MMM d, yyyy')}</div>
              </div>

              {note.followUpDate && <div className="text-xs text-accent">Follow-up: {format(new Date(note.followUpDate), 'MMM d, yyyy')}</div>}
            </>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading note...</div>
          )}
        </div>
        <div className="flex justify-end mt-4 gap-2">
          {note ? (
            isEditing ? (
              <>
                <Button variant="outline" onClick={() => { setIsEditing(false); /* reset fields */ setEditTopic(note.topic); setEditCategory(note.category as NoteCategory); setEditDescription(note.description); }}>Cancel</Button>
                <Button onClick={async () => {
                  // save
                  if (!note) return;
                  setSaving(true);
                  try {
                    await updateNote({ ...note, topic: editTopic, category: editCategory, description: editDescription });
                    await onNoteChanged?.();
                    setIsEditing(false);
                  } finally {
                    setSaving(false);
                  }
                }} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
            )
          ) : (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};