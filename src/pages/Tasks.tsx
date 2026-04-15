import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/context/PlayerContext';
import { Task, TaskStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Plus, Search, Calendar, Filter } from 'lucide-react';
import { format, isPast, isFuture, addDays, startOfDay } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isPlayerRole, isScoutRole } from '@/lib/accessPolicy';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';
import { useSearchParams } from 'react-router-dom';

const sourceColors: Record<string, string> = {
  contract: 'bg-orange-100 text-orange-800',
  review: 'bg-blue-100 text-blue-800',
  note: 'bg-purple-100 text-purple-800',
  manual: 'bg-gray-100 text-gray-800',
};

const Tasks = () => {
  const { user } = useAuth();
  const isPlayer = isPlayerRole(user?.role);
  const isScout = isScoutRole(user?.role);
  const { tasks, updateTask, addTask, players, clubs, scouts } = useAppContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [view, setView] = useState<'all' | 'upcoming'>('all');
  const [upcomingDays, setUpcomingDays] = useState(15); // Default to 15 days
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // const filtered = useMemo(() => {
  //   const currentUserEmail = (user?.email || '').trim().toLowerCase();

  //   // Player: tasks for own player records
  //   const ownPlayerIds = new Set(
  //     players
  //       .filter(p => (p.player_email || '').trim().toLowerCase() === currentUserEmail)
  //       .map(p => String(p.id))
  //   );

  //   // Scout: tasks assigned to them OR tasks for their players
  //   const loggedInScout = isScout
  //     ? scouts.find(s => (s.email || '').trim().toLowerCase() === currentUserEmail)
  //     : null;
  //   const scoutPlayerIds = loggedInScout
  //     ? new Set(players.filter(p => String(p.agent_scout_id) === String(loggedInScout.scoutId)).map(p => String(p.id)))
  //     : new Set<string>();

  //   let result = isPlayer
  //     ? tasks.filter(t => t.playerId && ownPlayerIds.has(String(t.playerId)))
  //     : isScout && loggedInScout
  //       ? tasks.filter(t =>
  //           String(t.assignedToScoutId) === String(loggedInScout.scoutId) ||
  //           (t.playerId && scoutPlayerIds.has(String(t.playerId)))
  //         )
  //       : [...tasks];

  //   if (view === 'upcoming') {
  //     const today = startOfDay(new Date());
  //     const soon = addDays(today, upcomingDays);
  //     result = result.filter(t => {
  //       const due = new Date(t.dueDate);
  //       const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
  //       return due >= today && due <= soon && matchesStatus;
  //     });
  //   } else {
  //     if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
  //   }
  //   if (agentFilter !== 'all') result = result.filter(t => t.assignedToScoutId === agentFilter);
  //   if (search) {
  //     const s = search.toLowerCase();
  //     result = result.filter(t => t.title.toLowerCase().includes(s) || t.description.toLowerCase().includes(s));
  //   }
  //   return result.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  // }, [tasks, players, scouts, user?.email, isPlayer, isScout, search, statusFilter, agentFilter, view]);

  const filtered = useMemo(() => {
    const currentUserEmail = (user?.email || '').trim().toLowerCase();

    const ownPlayerIds = new Set(
      players
        .filter(p => (p.player_email || '').trim().toLowerCase() === currentUserEmail)
        .map(p => String(p.id))
    );

    const loggedInScout = isScout
      ? scouts.find(s => (s.email || '').trim().toLowerCase() === currentUserEmail)
      : null;

    const scoutPlayerIds = loggedInScout
      ? new Set(
        players
          .filter(p => String(p.agent_scout_id) === String(loggedInScout.scoutId))
          .map(p => String(p.id))
      )
      : new Set<string>();

    let result = isPlayer
      ? tasks.filter(t => t.playerId && ownPlayerIds.has(String(t.playerId)))
      : isScout && loggedInScout
        ? tasks.filter(
          t =>
            String(t.assignedToScoutId) === String(loggedInScout.scoutId) ||
            (t.playerId && scoutPlayerIds.has(String(t.playerId)))
        )
        : [...tasks];

    if (view === 'upcoming') {
      const today = startOfDay(new Date());
      const soon = addDays(today, upcomingDays);

      result = result.filter(t => {
        const due = new Date(t.dueDate);
        const matchesStatus = statusFilter === 'all' || t.status === statusFilter;

        return due >= today && due <= soon && matchesStatus;
      });
    } else {
      if (statusFilter !== 'all') {
        result = result.filter(t => t.status === statusFilter);
      }
    }

    if (agentFilter !== 'all') {
      result = result.filter(t => t.assignedToScoutId === agentFilter);
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        t =>
          t.title.toLowerCase().includes(s) ||
          t.description.toLowerCase().includes(s)
      );
    }

    return result.sort(
      (a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }, [
    tasks,
    players,
    scouts,
    user?.email,
    isPlayer,
    isScout,
    search,
    statusFilter,
    agentFilter,

    // ✅ FIX: ADD THESE
    view,
    upcomingDays,
  ]);


  const toggleStatus = (task: Task) => {
    updateTask({ ...task, status: task.status === 'open' ? 'completed' : 'open' });
  };

  const getEntityName = (task: Task) => {
    if (task.playerId) return players.find(p => p.id === String(task.playerId))?.fullName;
    if (task.clubId) return clubs.find(c => c.clubId === task.clubId)?.clubName;
    return undefined;
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    // Remove taskId from URL when modal closes
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('taskId');
    setSearchParams(newSearchParams);
  };

  // Check for taskId in URL params and open modal
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t.taskId === taskId);
      if (task) {
        setSelectedTask(task);
        setIsModalOpen(true);
      }
    }
  }, [searchParams, tasks]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        {!isPlayer && <AddTaskDialog players={players} clubs={clubs} scouts={scouts} onAdd={addTask} />}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {scouts.map(s => <SelectItem key={s.scoutId} value={s.scoutId}>{s.scoutName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={view === 'upcoming' ? `upcoming-${upcomingDays}` : 'all'} onValueChange={(value) => {
          if (value === 'all') {
            setView('all');
          } else if (value.startsWith('upcoming-')) {
            setView('upcoming');
            setUpcomingDays(parseInt(value.split('-')[1]));
          }
        }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="upcoming-7">Upcoming (7 days)</SelectItem>
            <SelectItem value="upcoming-15">Upcoming (15 days)</SelectItem>
            <SelectItem value="upcoming-30">Upcoming (30 days)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        {view === 'upcoming'
          ? `${filtered.length} upcoming${statusFilter !== 'all' ? ` ${statusFilter}` : ''} task${filtered.length !== 1 ? 's' : ''} in ${upcomingDays} day${upcomingDays !== 1 ? 's' : ''}`
          : statusFilter !== 'all'
            ? `${filtered.length} ${statusFilter} task${filtered.length !== 1 ? 's' : ''}`
            : `${filtered.length} task${filtered.length !== 1 ? 's' : ''}`
        }
      </p>

      <div className="space-y-3">
        {filtered.map(task => {
          const overdue = task.status === 'open' && isPast(new Date(task.dueDate));
          return (
            <Card key={task.taskId} className={`cursor-pointer transition-all hover:shadow-md ${task.status === 'completed' ? 'opacity-60' : overdue ? 'border-destructive/40' : ''}`} onClick={() => handleTaskClick(task)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <button onClick={(e) => { e.stopPropagation(); toggleStatus(task); }} className="mt-0.5">
                    {task.status === 'completed' ? <CheckCircle size={18} className="text-green-600" /> : <Circle size={18} className="text-muted-foreground" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>{task.title}</span>
                      <Badge variant="secondary" className={sourceColors[task.source]}>{task.source}</Badge>
                      {overdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Calendar size={10} /> {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
                      <span>Assigned By : {scouts.find(s => s.scoutId === task.assignedToScoutId)?.scoutName || task.assignedToScoutId}</span>
                      {getEntityName(task) && (
                        <Link to={task.playerId ? `/players/${task.playerId}` : `/clubs/${task.clubId}`}
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}>
                          {getEntityName(task)}
                        </Link>
                      )}
                    </div>
                  </div>
                  {!isPlayer && (
                    <div className="flex gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
                      <EditTaskDialog task={task} players={players} clubs={clubs} scouts={scouts} />
                      <DeleteTaskDialog taskId={task.taskId} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No tasks found</p>}
      </div>

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        assignedScoutName={selectedTask ? (scouts.find(s => s.scoutId === selectedTask.assignedToScoutId)?.scoutName || 'Auto-generated') : 'Auto-generated'}
        createdByName={user?.name || 'Admin'}
        getEntityName={getEntityName}
        onUpdateTask={updateTask}
        scouts={scouts}
        players={players}
        clubs={clubs}
        isScout={isScout}
      />
    </div>
  );
};

const AddTaskDialog = ({ players, clubs, scouts, onAdd }: { players: any[]; clubs: any[]; scouts: any[]; onAdd: (t: Task) => void }) => {
  const { user } = useAuth();
  const isScout = isScoutRole(user?.role);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [entityType, setEntityType] = useState<'player' | 'club'>('player');
  const [entityId, setEntityId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isScout && entityType !== 'player') {
      setEntityType('player');
      setEntityId('');
    }
  }, [isScout, entityType]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEntityType('player');
    setEntityId('');
    setAssignedTo('');
    setDueDate('');
    setErrors({});
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};

    if (!title.trim()) nextErrors.title = 'Required field';
    if (!entityId) nextErrors.entityId = 'Required field';
    if (!assignedTo.trim()) nextErrors.assignedTo = 'Required field';
    if (!dueDate.trim()) nextErrors.dueDate = 'Required field';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onAdd({
      taskId: crypto.randomUUID(),
      title,
      description,
      playerId: entityType === 'player' ? entityId : undefined,
      clubId: entityType === 'club' ? entityId : undefined,
      assignedToScoutId: assignedTo,
      dueDate,
      status: 'open',
      createdAt: new Date().toISOString(),
      source: 'manual',
    });

    setOpen(false);
    setTitle(''); setDescription(''); setEntityId(''); setAssignedTo(''); setDueDate('');
    setErrors({});
  };

  const entities = entityType === 'player'
    ? players.map(p => ({ id: p.id, name: p.fullName }))
    : clubs.map(c => ({ id: c.clubId, name: c.clubName }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus size={14} className="mr-1" /> Add Task</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title <span className="text-red-500">*</span></Label><Input value={title} onChange={e => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: '' })); }} />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </div>
          <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
          {!isScout && (
            <div><Label>Related To</Label>
              <Select value={entityType} onValueChange={v => { setEntityType(v as any); setEntityId(''); setErrors(prev => ({ ...prev, entityId: '' })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="club">Club</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div><Label>{entityType === 'player' ? 'Player' : 'Club'} <span className="text-red-500">*</span></Label>
            <Select value={entityId} onValueChange={value => { setEntityId(value); setErrors(prev => ({ ...prev, entityId: '' })); }}>
              <SelectTrigger><SelectValue placeholder={entityType === 'player' ? 'Select player...' : 'Select club...'} /></SelectTrigger>
              <SelectContent>{entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
            {errors.entityId && <p className="text-xs text-destructive mt-1">{errors.entityId}</p>}
          </div>
          <div><Label>Assigned To <span className="text-red-500">*</span></Label>
            <Select value={assignedTo} onValueChange={value => { setAssignedTo(value); setErrors(prev => ({ ...prev, assignedTo: '' })); }}>
              <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
              <SelectContent>{scouts.map(s => <SelectItem key={s.scoutId} value={s.scoutId}>{s.scoutName}</SelectItem>)}</SelectContent>
            </Select>
            {errors.assignedTo && <p className="text-xs text-destructive mt-1">{errors.assignedTo}</p>}
          </div>
          <div><Label>Due Date <span className="text-red-500">*</span></Label><Input type="date" value={dueDate} onChange={e => { setDueDate(e.target.value); setErrors(prev => ({ ...prev, dueDate: '' })); }} />
            {errors.dueDate && <p className="text-xs text-destructive mt-1">{errors.dueDate}</p>}
          </div>
          <Button onClick={handleSubmit} className="w-full">Create Task</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EditTaskDialog = ({ task, players, clubs, scouts }: any) => {
  const { updateTask } = useAppContext();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState(task.status);
  const [dueDate, setDueDate] = useState(task.dueDate);
  const [assignedTo, setAssignedTo] = useState(task.assignedToScoutId);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleUpdate = () => {
    const nextErrors: Record<string, string> = {};

    if (!title.trim()) nextErrors.title = 'Required field';
    if (!assignedTo.trim()) nextErrors.assignedTo = 'Required field';
    if (!dueDate.trim()) nextErrors.dueDate = 'Required field';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    updateTask({
      ...task,
      title,
      description,
      status,
      dueDate,
      assignedToScoutId: assignedTo
    });

    setOpen(false);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Edit</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Title <span className="text-red-500">*</span></Label>
            <Input value={title} onChange={e => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: '' })); }} />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Due Date <span className="text-red-500">*</span></Label>
            <Input type="date" value={dueDate} onChange={e => { setDueDate(e.target.value); setErrors(prev => ({ ...prev, dueDate: '' })); }} />
            {errors.dueDate && <p className="text-xs text-destructive mt-1">{errors.dueDate}</p>}
          </div>

          <div>
            <Label>Assigned To <span className="text-red-500">*</span></Label>
            <Select value={assignedTo} onValueChange={value => { setAssignedTo(value); setErrors(prev => ({ ...prev, assignedTo: '' })); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {scouts.map((s: any) => (
                  <SelectItem key={s.scoutId} value={s.scoutId}>
                    {s.scoutName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assignedTo && <p className="text-xs text-destructive mt-1">{errors.assignedTo}</p>}
          </div>

          <Button onClick={handleUpdate}>Update</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
const DeleteTaskDialog = ({ taskId }: { taskId: string }) => {
  const { deleteTask } = useAppContext();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    await deleteTask(taskId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">Delete</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
        </DialogHeader>

        <p>Are you sure you want to delete this task?</p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Tasks;
