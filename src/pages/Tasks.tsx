import { useState, useMemo, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { CheckCircle, Circle, Plus, Search, Calendar, Filter, Edit, Trash2 } from 'lucide-react';
import { format, isPast, isFuture, addDays, startOfDay } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isPlayerRole, isScoutRole } from '@/lib/accessPolicy';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';
import { useSearchParams } from 'react-router-dom';
import { fetchPlayersSimplified, fetchTaskConfigration, fetchTasksForPage, fetchPlayers } from '@/services/apiService';

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
  const { updateTask, addTask, deleteTask, players } = useAppContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [scoutFilter, setScoutFilter] = useState<string>('all');
  const [view, setView] = useState<'all' | 'upcoming'>('all');
  const [upcomingDays, setUpcomingDays] = useState(15);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: taskConfig } = useQuery({
    queryKey: ['tasks-configration'],
    queryFn: fetchTaskConfigration,
  });

  const { data: simplifiedPlayers = [] } = useQuery({
    queryKey: ['tasks-players-simplified'],
    queryFn: () => fetchPlayersSimplified(),
  });

  const { data: allPlayersFromApi = [] } = useQuery({
    queryKey: ['all-players-fallback'],
    queryFn: fetchPlayers,
    enabled: !!user?.email, // fetch once user is known (handles refresh where context may be empty)
  });

  const scoutsForTask = taskConfig?.allScoutForTask ?? [];
  const clubsForTask = taskConfig?.allClubsForTask ?? [];
  const playersForTask = taskConfig?.allPlayerForTask ?? [];
  const playersForTaskModal = useMemo(
    () => (Array.isArray(simplifiedPlayers)
      ? simplifiedPlayers.map((p: any) => ({
          id: String(p?.playerId ?? ''),
          fullName: String(p?.playerName ?? ''),
        }))
      : []),
    [simplifiedPlayers]
  );

  // Fetch tasks from API with filters
  const { data: apiTasks = [], refetch: refetchTasksPage, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['tasks-page', statusFilter, scoutFilter, upcomingDays, search, view, page, pageSize],
    queryFn: async () => {
      const params: any = {
        status: statusFilter === 'all' ? undefined : (statusFilter || 'open'),
        search: search || undefined,
        page: page,
        pageSize: pageSize,
      };
      
      if (scoutFilter !== 'all') {
        params.scoutId = scoutFilter;
      }
      
      if (view === 'upcoming') {
        params.upcomingDays = upcomingDays;
      }
      
      const response = await fetchTasksForPage(params);
      return response;
    },
  });

  const getEntityName = (task: any) => {
    if (task.assignedTo) {
      return task.assignedTo;
    }
    return 'Unassigned';
  };

  const enrichTask = (task: any) => ({
    ...task,
    playerId: task.assignedToType === 'player' ? String(task.assignedToId ?? '') : undefined,
    clubId: task.assignedToType === 'club' ? String(task.assignedToId ?? '') : undefined,
  });

  const formatStatusLabel = (status?: string) => {
    const value = String(status ?? '').trim().toLowerCase();
    if (!value) return 'Unknown';
    if (value === 'closed' || value === 'completed' || value === 'complete') return 'Completed';
    if (value === 'open') return 'Open';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const getStatusBadgeClass = (status?: string) => {
    const value = String(status ?? '').trim().toLowerCase();
    if (value === 'closed' || value === 'completed') return 'bg-green-100 text-green-800';
    if (value === 'open') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const handleTaskUpdate = async (task: any) => {
    if (!task?.taskId || !updateTask) return;
    const success = await updateTask(task);
    if (success) {
      await refetchTasksPage();
    }
  };

  const handleTaskClick = (task: any) => {
    setSelectedTask(enrichTask(task));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('taskId');
    setSearchParams(newSearchParams);
  };

  // Check for taskId in URL params and open modal
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId && apiTasks.length > 0) {
      const task = apiTasks.find(t => t.taskId === taskId);
      if (task) {
        setSelectedTask(enrichTask(task));
        setIsModalOpen(true);
      }
    }
  }, [searchParams, apiTasks]);

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



  const toggleStatus = async (task: any) => {
    const statusFromTable = String(task?.statusFromTable ?? '').toLowerCase();
    const isCompleted = statusFromTable === 'closed' || task.status === 'Completed';
    await handleTaskUpdate({ ...task, status: isCompleted ? 'open' : 'closed' });
  };

  const visibleTasks = useMemo(() => {
    if (!isPlayer) return apiTasks;
    const currentEmail = (user?.email || '').trim().toLowerCase();
    let foundPlayer = players.find(p => (p.player_email || '').trim().toLowerCase() === currentEmail);
    if (!foundPlayer && Array.isArray(allPlayersFromApi) && allPlayersFromApi.length > 0) {
      foundPlayer = (allPlayersFromApi as any[]).find(p => ((p.playerEmail || p.player_email) || '').trim().toLowerCase() === currentEmail || ((p.email || p.userEmail) || '').trim().toLowerCase() === currentEmail);
    }

    if (!foundPlayer) return [];

    const targetPlayerId = String((foundPlayer.playerId ?? foundPlayer.id ?? (foundPlayer as any).player_id ?? (foundPlayer as any).playerId) ?? '');

    return apiTasks.filter((t: any) => {
      // Normalize possible fields
      const tAssignedType = String(t.assignedToType ?? t.assigned_to_type ?? '').toLowerCase();
      const tAssignedId = String(t.assignedToId ?? t.assigned_to_id ?? t.playerId ?? t.player_id ?? '');
      const tPlayerId = String(t.playerId ?? t.player_id ?? '');

      // Match by direct playerId field, or by assignedToType/assignedToId when type is player
      if (tPlayerId && tPlayerId === targetPlayerId) return true;
      if (tAssignedType === 'player' && tAssignedId === targetPlayerId) return true;

      // Some payloads use numeric ids — compare as numbers when possible
      if (Number.isFinite(Number(tPlayerId)) && Number(tPlayerId) === Number(targetPlayerId)) return true;
      if (Number.isFinite(Number(tAssignedId)) && Number(tAssignedId) === Number(targetPlayerId)) return true;

      return false;
    });
  }, [apiTasks, isPlayer, players, user?.email, allPlayersFromApi]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        {!isPlayer && <AddTaskDialog players={playersForTask} clubs={clubsForTask} scouts={scoutsForTask} onAdd={addTask} />}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
          </SelectContent>
        </Select>
        <Select value={scoutFilter} onValueChange={setScoutFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scouts</SelectItem>
            {scoutsForTask.map(s => <SelectItem key={s.scoutId} value={s.scoutId}>{s.scoutName}</SelectItem>)}
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
          ? `${visibleTasks.length} upcoming${statusFilter !== 'all' ? ` ${statusFilter}` : ''} task${visibleTasks.length !== 1 ? 's' : ''} in ${upcomingDays} day${upcomingDays !== 1 ? 's' : ''}`
          : statusFilter !== 'all'
            ? `${visibleTasks.length} ${statusFilter} task${visibleTasks.length !== 1 ? 's' : ''}`
            : `${visibleTasks.length} task${visibleTasks.length !== 1 ? 's' : ''}`
        }
      </p>

      <div className="space-y-3">
        {isLoadingTasks ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground mt-2">Loading tasks...</p>
          </div>
        ) : (
          <>
            {visibleTasks.map(task => {
              const isCompleted = String(task.statusFromTable ?? '').toLowerCase() === 'closed' || task.status === 'Completed';
              const overdue = task.status === 'Overdue' && !isCompleted;
              return (
                <Card key={task.taskId} className={`cursor-pointer transition-all hover:shadow-md ${isCompleted ? 'opacity-60' : overdue ? 'border-destructive/40' : ''}`} onClick={() => handleTaskClick(task)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button onClick={(e) => { e.stopPropagation(); toggleStatus(task); }} className="mt-0.5">
                        {isCompleted ? <CheckCircle size={18} className="text-green-600" /> : <Circle size={18} className="text-muted-foreground" />}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${isCompleted ? 'line-through' : ''}`}>{task.title}</span>
                          <Badge variant="secondary" className={sourceColors[task.source]}>{task.source}</Badge>
                          <Badge variant="secondary" className={getStatusBadgeClass(task.statusFromTable)}>{formatStatusLabel(task.statusFromTable)}</Badge>
                          {overdue && <Badge variant="destructive" className="text-[10px]">Overdue</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Calendar size={10} /> {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date'}</span>
                          <span>Assigned By: {task.assignedBy}</span>
                          {task.assignedTo && task.assignedTo !== 'Unassigned' && (
                            <span className="text-primary">Assigned To: {task.assignedTo}</span>
                          )}
                        </div>
                      </div>
                      {!isPlayer && (
                        <div className="flex gap-2 ml-auto" onClick={(e) => e.stopPropagation()}>
                          <EditTaskDialog
                            task={enrichTask(task)}
                            players={playersForTaskModal}
                            clubs={clubsForTask}
                            scouts={scoutsForTask}
                            trigger={(
                              <button aria-label="Edit task" className="text-muted-foreground hover:text-primary transition-colors">
                                <Edit size={18} />
                              </button>
                            )}
                            onUpdated={async () => { await refetchTasksPage(); }}
                          />

                          <DeleteTaskDialog
                            taskId={task.taskId}
                            trigger={(
                              <button aria-label="Delete task" className="text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 size={18} />
                              </button>
                            )}
                            onDeleted={async () => { await refetchTasksPage(); }}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
        {!isLoadingTasks && visibleTasks.length === 0 && <p className="text-center text-muted-foreground py-8">Task not found</p>}
      </div>

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        assignedScoutName={selectedTask?.assignedBy || 'Auto-generated'}
        createdByName={user?.name || 'Admin'}
        getEntityName={getEntityName}
        onUpdateTask={handleTaskUpdate}
        scouts={scoutsForTask}
        players={playersForTaskModal}
        clubs={clubsForTask}
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
    ? players.map(p => ({
        id: p.playerId,
        name: p.sportName ? `${p.playerName} (${p.sportName})` : p.playerName,
      }))
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
              <SelectContent>{scouts.map((s: any) => <SelectItem key={s.scoutId} value={String(s.scoutId)}>{s.scoutName}</SelectItem>)}</SelectContent>
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

const EditTaskDialog = ({ task, players, clubs, scouts, trigger, onUpdated }: any & { trigger?: ReactNode; onUpdated?: () => void | Promise<void> }) => {
  const { updateTask } = useAppContext();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [status, setStatus] = useState<string>(() => {
    const s = String((task as any)?.taskStatus ?? (task as any)?.status ?? 'open').toLowerCase();
    return (s === 'closed' || s === 'completed' || s === 'complete') ? 'closed' : 'open';
  });
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [assignedTo, setAssignedTo] = useState<string>(String((task as any)?.assignedById ?? (task as any)?.assignedToScoutId ?? ''));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setTitle(task?.title || '');
    setDescription(task?.description || '');
    const s = String((task as any)?.taskStatus ?? (task as any)?.status ?? 'open').toLowerCase();
    setStatus((s === 'closed' || s === 'completed' || s === 'complete') ? 'closed' : 'open');
    setDueDate(task?.dueDate || '');
    setAssignedTo(String((task as any)?.assignedById ?? (task as any)?.assignedToScoutId ?? (task as any)?.assignedBy ?? ''));
  }, [task]);

  const handleUpdate = async () => {
    const nextErrors: Record<string, string> = {};

    if (!title.trim()) nextErrors.title = 'Required field';
    if (!assignedTo || !String(assignedTo).trim()) nextErrors.assignedTo = 'Required field';
    if (!dueDate.trim()) nextErrors.dueDate = 'Required field';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const result = await updateTask({
      ...task,
      title,
      description,
      status,
      dueDate,
      assignedToScoutId: assignedTo
    });

    setOpen(false);
    setErrors({});
    if (result && onUpdated) await onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : <Button size="sm" variant="outline">Edit</Button>}
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
                    <SelectItem value="closed">Completed</SelectItem>
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
                  <SelectItem key={s.scoutId} value={String(s.scoutId)}>
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


const DeleteTaskDialog = ({ taskId, trigger, onDeleted }: { taskId: string; trigger?: ReactNode; onDeleted?: () => void | Promise<void> }) => {
  const { deleteTask } = useAppContext();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    const ok = await deleteTask(taskId);
    setOpen(false);
    if (ok && onDeleted) await onDeleted();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : <Button size="sm" variant="destructive">Delete</Button>}
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
