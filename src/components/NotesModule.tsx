import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/context/PlayerContext';
import { useAuth } from '@/context/AuthContext';
import { isPlayerRole, isScoutRole } from '@/lib/accessPolicy';
import { Note, NoteCategory, NOTE_CATEGORIES, EntityType } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, StickyNote, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface NotesModuleProps {
  entityType: EntityType;
  entityId: string;
  filterCategory?: NoteCategory;
  readOnly?: boolean;
}

const categoryColors: Record<NoteCategory, string> = {
  private: 'bg-purple-100 text-purple-800',
  medical: 'bg-red-100 text-red-800',
  technical: 'bg-blue-100 text-blue-800',
  performance: 'bg-green-100 text-green-800',
  meeting: 'bg-amber-100 text-amber-800',
};

export const NotesModule = ({ entityType, entityId, filterCategory, readOnly = false }: NotesModuleProps) => {
  const { notes, addNote, scouts, updateNote } = useAppContext();
  const { user } = useAuth();
  const isPlayerUser = isPlayerRole(user?.role);
  const isScoutUser = isScoutRole(user?.role);
  const isAdminUser = user?.role === 'Admin';

  const entityNotes = useMemo(() => {
    let filtered = notes.filter(n =>
      (entityType === 'player' && Number(n.playerId) === Number(entityId)) ||
      (entityType === 'club' && n.clubId === entityId)
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
  }, [notes, entityType, entityId, filterCategory, isPlayerUser]);

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end">
          <AddNoteDialog entityType={entityType} entityId={entityId} scouts={scouts} onAdd={addNote} defaultCategory={filterCategory} />
        </div>
      )}
      {entityNotes.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No notes yet</p>
      ) : (
        <div className="space-y-3">
          {entityNotes.map(note => (
            <Card key={note.noteId}>
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
                    <span className="font-medium text-sm">{note.topic}</span>
                    <Badge variant="secondary" className={categoryColors[note.category]}>
                      {NOTE_CATEGORIES.find(c => c.value === note.category)?.label}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(note.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">{note.description}</p>

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  {/* <span>
                    By: {scouts.find(s => s.scoutId === note.createdByScoutId)?.scoutName || note.createdByScoutId}
                  </span> */}

                  {note.followUpDate && (
                    <span className="flex items-center gap-1 text-accent">
                      <Calendar size={10} />
                      Follow-up: {format(new Date(note.followUpDate), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>

                {/* {(isAdminUser || isScoutUser) && (
                  <div className="flex items-center gap-2 mt-3 text-xs">
                    <Switch
                      id={`visible-${note.noteId}`}
                      checked={note.isVisibleToPlayer ?? false}
                      onCheckedChange={async (value) => {
                        await updateNote({ ...note, isVisibleToPlayer: value });
                      }}
                    />
                    <Label htmlFor={`visible-${note.noteId}`}>Show this note to player</Label>
                    <span>{(note.isVisibleToPlayer ?? false) ? 'Yes' : 'No'}</span>
                  </div>
                )} */}

                {/* ✅ Buttons aligned right */}
                {!readOnly && (

                  <div className="flex justify-between gap-2 mt-3">
                    {(isAdminUser || isScoutUser) && (
                      <div className="flex items-center gap-2 mt-3 text-xs">
                        <Switch
                          id={`visible-${note.noteId}`}
                          checked={note.isVisibleToPlayer ?? false}
                          onCheckedChange={async (value) => {
                            await updateNote({ ...note, isVisibleToPlayer: value });
                          }}
                         
                        />
                        <Label htmlFor={`visible-${note.noteId}`}>Show this note to player</Label>
                        {/* <span>{(note.isVisibleToPlayer ?? false) ? 'Yes' : 'No'}</span> */}
                      </div>
                    )}
                    <div className='flex gap-2'>
                      <EditNoteDialog note={note} />
                      <DeleteNoteDialog note={note} />
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


const AddNoteDialog = ({ entityType, entityId, scouts, onAdd, defaultCategory }: {
  entityType: EntityType;
  entityId: string;
  scouts: any[];
  onAdd: (n: Note) => Promise<void>;   // ← was: void
  defaultCategory?: NoteCategory;
}) => {
  const { user } = useAuth();
  const isPlayerUser = isPlayerRole(user?.role);
  const isScoutUser = isScoutRole(user?.role);
  const isAdminUser = user?.role === 'Admin';

  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<NoteCategory>(defaultCategory || 'private');
  const [followUpDate, setFollowUpDate] = useState('');
  const [createdBy, setCreatedBy] = useState(user?.id || '');
  const [isVisibleToPlayer, setIsVisibleToPlayer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setCreatedBy(user?.id || '');
  }, [user]);

  const resetForm = () => {
    setTopic('');
    setDescription('');
    setCategory(defaultCategory || 'private');
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

    if (!topic.trim()) nextErrors.topic = 'Required field';
    if (!category) nextErrors.category = 'Required field';
    if (!description.trim()) nextErrors.description = 'Required field';
    // if (!createdBy.trim()) nextErrors.createdBy = 'Required field';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onAdd({
        noteId: '',                                      // ← no ID, backend assigns it
        playerId: entityType === 'player' ? entityId : undefined,
        clubId: entityType === 'club' ? entityId : undefined,
        topic,
        description,
        category,
        followUpDate: followUpDate || undefined,
        isVisibleToPlayer,
        createdByScoutId: createdBy,
        createdAt: new Date().toISOString(),
      });
      setOpen(false);
      setTopic('');
      setDescription('');
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
          <div>
            <Label>Topic <span className="text-red-500">*</span></Label>
            <Input value={topic} onChange={e => { setTopic(e.target.value); setErrors(prev => ({ ...prev, topic: '' })); }} placeholder="Note topic..." />
            {errors.topic && <p className="text-xs text-destructive mt-1">{errors.topic}</p>}
          </div>
          <div>
            <Label>Category <span className="text-red-500">*</span></Label>
            <Select value={category} onValueChange={v => { setCategory(v as NoteCategory); setErrors(prev => ({ ...prev, category: '' })); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive mt-1">{errors.category}</p>}
          </div>
          <div>
            <Label>Description <span className="text-red-500">*</span></Label>
            <Textarea value={description} onChange={e => { setDescription(e.target.value); setErrors(prev => ({ ...prev, description: '' })); }} placeholder="Details..." />
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

          {/* <div>
            <Label>Created By <span className="text-red-500">*</span></Label>
            <Select value={createdBy} onValueChange={v => { setCreatedBy(v); setErrors(prev => ({ ...prev, createdBy: '' })); }}>
              <SelectTrigger><SelectValue placeholder="Select scout" /></SelectTrigger>
              <SelectContent>
                {scouts.map(s => <SelectItem key={s.scoutId} value={s.scoutId}>{s.scoutName}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.createdBy && <p className="text-xs text-destructive mt-1">{errors.createdBy}</p>}
          </div> */}
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? 'Saving...' : 'Save Note'}   {/* ← loading state */}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EditNoteDialog = ({ note }: { note: Note }) => {
  const { updateNote, scouts } = useAppContext();
  const [open, setOpen] = useState(false);

  const [topic, setTopic] = useState(note.topic);
  const [description, setDescription] = useState(note.description);
  const [category, setCategory] = useState<NoteCategory>(
    (note.category as NoteCategory) || 'private'
  );
  const [followUpDate, setFollowUpDate] = useState(note.followUpDate || '');
  const [isVisibleToPlayer, setIsVisibleToPlayer] = useState(note.isVisibleToPlayer ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setTopic(note.topic);
      setDescription(note.description);
      setCategory((note.category as NoteCategory) || 'private');
      setFollowUpDate(note.followUpDate || '');
      setIsVisibleToPlayer(note.isVisibleToPlayer ?? false);
      setErrors({});
    }
  }, [open, note]);

  const handleUpdate = async () => {
    const nextErrors: Record<string, string> = {};

    if (!topic.trim()) nextErrors.topic = 'Required field';
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
        topic,
        description,
        category,
        followUpDate: followUpDate || undefined,
        isVisibleToPlayer,
      });

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

          {/* Topic */}
          <div>
            <Label>Topic <span className="text-red-500">*</span></Label>
            <Input value={topic} onChange={e => { setTopic(e.target.value); setErrors(prev => ({ ...prev, topic: '' })); }} />
            {errors.topic && <p className="text-xs text-destructive mt-1">{errors.topic}</p>}
          </div>

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

          {/* Description */}
          <div>
            <Label>Description <span className="text-red-500">*</span></Label>
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

          {/* Created By */}
          {/* <div>
            <Label>Created By <span className="text-red-500">*</span></Label>
            <Select value={createdBy} onValueChange={v => { setCreatedBy(v); setErrors(prev => ({ ...prev, createdBy: '' })); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {scouts.map(s => (
                  <SelectItem key={s.scoutId} value={s.scoutId}>
                    {s.scoutName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.createdBy && <p className="text-xs text-destructive mt-1">{errors.createdBy}</p>}
          </div> */}

          {/* Button */}
          <Button onClick={handleUpdate} disabled={submitting} className="w-full">
            {submitting ? 'Updating...' : 'Update Note'}
          </Button>

        </div>
      </DialogContent>
    </Dialog>
  );
};
const DeleteNoteDialog = ({ note }: { note: Note }) => {
  const { deleteNote } = useAppContext();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    await deleteNote(note.noteId);
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