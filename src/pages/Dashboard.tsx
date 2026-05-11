import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getContractStatus, getAverageRatings, calculateOverallAverage } from '@/lib/playerUtils';
import { ContractBadge } from '@/components/ContractBadge';
import { StarRating } from '@/components/StarRating';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, AlertTriangle, Star, ClipboardList, CheckSquare, StickyNote, Mail, Calendar, LogOut } from 'lucide-react';
import { fetchContractAlerts, fetchDashboardApi, fetchTaskConfigration, updateTaskApi } from '@/services/apiService';
import { Link, useNavigate } from 'react-router-dom';
import { format, subWeeks, isAfter, isPast, addDays, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { getContractExpiringMonths } from '@/lib/settingsUtils';
import { useAuth } from '@/context/AuthContext';
import { isScoutRole } from '@/lib/accessPolicy';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';
import { Contract, Task } from '@/types';


const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(true);
  const [agentFilter, setAgentFilter] = useState('all');
  const isPlayerUser = (user?.role || '').toLowerCase() === 'player';
  const isScoutUser = isScoutRole(user?.role);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noteToOpen, setNoteToOpen] = useState<string | null>(null);
  const [contractTab, setContractTab] = useState<'all' | Contract['contractType']>('all');
  const [companyProfile, setCompanyProfile] = useState<any | null>(null);
  const [dashboardContracts, setDashboardContracts] = useState<Contract[]>([]);
  const [contractAlertsLoading, setContractAlertsLoading] = useState(false);
  const [taskPlayersOptions, setTaskPlayersOptions] = useState<any[]>([]);
  const [taskClubsOptions, setTaskClubsOptions] = useState<any[]>([]);
  const [taskScoutsOptions, setTaskScoutsOptions] = useState<any[]>([]);

  const players = dashboardData?.players || [];
  const reviews = dashboardData?.reviews || [];
  const scouts = dashboardData?.scouts || [];
  const tasks = dashboardData?.tasks || [];
  const notes = dashboardData?.notes || [];
  const emails = dashboardData?.emails || [];
  const clubs = dashboardData?.clubs || [];
  const playerPositions = dashboardData?.playerPositions || [];
  const sportActivities = dashboardData?.sportActivities || [];
  const contractTypeLabels: Record<Contract['contractType'], string> = {
    PlayerClub: 'Player ↔ Club',
    ClubCompany: 'Club ↔ Sponsor',
    PlayerCompany: 'Player ↔ Sponsor',
    PlayerCoach: 'Player ↔ Coach',
  };

  useEffect(() => {
    (async () => {
      setDashboardLoading(true);
      try {
        const data = await fetchDashboardApi();
        setDashboardData(data || null);
        setCompanyProfile(data?.companyProfile || null);
      } catch (err) {
        setDashboardData(null);
        setCompanyProfile(null);
      } finally {
        setDashboardLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setContractAlertsLoading(true);
      try {
        const params: { contractType?: string; daysAhead: number } = {
          daysAhead: 60,
        };

        if (contractTab !== 'all') {
          params.contractType = contractTab;
        }

        const data = await fetchContractAlerts(params);
        setDashboardContracts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load contract alerts from dedicated API', err);
        setDashboardContracts([]);
      } finally {
        setContractAlertsLoading(false);
      }
    })();
  }, [contractTab]);

  const ensureTaskConfigLoaded = async () => {
    if (taskPlayersOptions.length > 0 || taskClubsOptions.length > 0 || taskScoutsOptions.length > 0) return;
    try {
      const cfg = await fetchTaskConfigration();
      setTaskPlayersOptions((cfg?.allPlayerForTask || []).map((p: any) => ({ id: p.playerId, fullName: p.playerName, sportId: p.sportId, sportName: p.sportName })));
      setTaskClubsOptions((cfg?.allClubsForTask || []).map((c: any) => ({ clubId: c.clubId, clubName: c.clubName })));
      setTaskScoutsOptions((cfg?.allScoutForTask || []).map((s: any) => ({ scoutId: s.scoutId, scoutName: s.scoutName })));
    } catch (err) {
      setTaskPlayersOptions([]);
      setTaskClubsOptions([]);
      setTaskScoutsOptions([]);
    }
  };

  const handleTaskClick = async (task: Task) => {
    await ensureTaskConfigLoaded();
    // normalize incoming task shape: copy possible assignedToId/assignedById/taskStatus into known fields
    const normalized: Task = {
      ...task,
      // id fields
      assignedById: (task as any).assignedById || (task as any).assigned_to_scout_id || (task as any).assignedToScoutId,
      assignedToId: (task as any).assignedToId || (task as any).assignedToId || (task as any).playerId || (task as any).clubId,
      // human-friendly names
      assignedByName: (task as any).assigned_by || (task as any).assignedByName || undefined,
      assignedToName: (task as any).assigned_to || (task as any).assignedToName || undefined,
      // keep legacy fields for modal
      assignedToScoutId: (task as any).assignedById || (task as any).assignedToScoutId,
      playerId: (task as any).playerId || (task as any).assignedToId || task.playerId,
      clubId: (task as any).clubId || ((task as any).assignedToId && !(players.some(p => String(p.id) === String((task as any).assignedToId))) ? (task as any).assignedToId : task.clubId),
      status: (task as any).taskStatus || task.status,
      taskStatus: (task as any).taskStatus || task.status,
    } as Task;

    setSelectedTask(normalized);
    setIsModalOpen(true);
  };

  const handleUpdateTask = async (updated: Task) => {
    try {
      const payload: any = {
        dueDate: updated.dueDate,
        status: (updated as any).taskStatus || updated.status,
      };

      if ((updated as any).assignedToScoutId) payload.assignedToScoutId = (updated as any).assignedToScoutId;
      if (updated.playerId) payload.playerId = updated.playerId;
      if (updated.clubId) payload.clubId = updated.clubId;

      await updateTaskApi(updated.taskId, payload);

      // update local cached dashboard data if present
      if (dashboardData?.dashboardUpcomingTasks) {
        const newList = (dashboardData.dashboardUpcomingTasks as any[]).map(t => t.taskId === updated.taskId ? ({ ...t, ...updated }) : t);
        setDashboardData({ ...dashboardData, dashboardUpcomingTasks: newList });
      }

      if (dashboardData?.tasks) {
        const newTasks = dashboardData.tasks.map((t: any) => t.taskId === updated.taskId ? ({ ...t, ...updated }) : t);
        setDashboardData({ ...dashboardData, tasks: newTasks });
      }

      setSelectedTask(updated);
    } catch (err) {
      console.error('Failed to update task', err);
    }
  };

  const handleStatClick = (key: string) => {
    if (key === 'total') return navigate('/players');
    if (key === 'expiring') return navigate('/players?filter=expiring');
    if (key === 'openTasks') return navigate('/tasks');
    if (key === 'needsReview') return navigate('/players?filter=needsReview');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const getEntityName = (task: Task) => {
    if (task.playerId) return players.find(p => p.id === String(task.playerId))?.fullName;
    if (task.clubId) return clubs.find(c => c.clubId === task.clubId)?.clubName;
    return undefined;
  };

  const stats = useMemo(() => {
    const fourWeeksAgo = subWeeks(new Date(), 4);
    const now = new Date();

    const isPlayerUser = (user?.role || '').toLowerCase() === 'player';
    const isScoutUser = isScoutRole(user?.role);
    const currentUserEmail = (user?.email || '').trim().toLowerCase();

    // Find the logged-in scout's record by email
    const loggedInScout = isScoutUser && currentUserEmail
      ? scouts.find(s => (s.email || '').trim().toLowerCase() === currentUserEmail)
      : null;

    const showAllPlayers = isScoutUser && loggedInScout
      ? loggedInScout.isShowPlayer ?? false
      : false;

    // Scope players: Player → own email; Scout → assigned players or all players if allowed; Admin → all
    const emailScopedPlayers = isPlayerUser && currentUserEmail
      ? players.filter(p => (p.player_email || '').trim().toLowerCase() === currentUserEmail)
      : isScoutUser && loggedInScout
        ? showAllPlayers
          ? players
          : players.filter(p => String(p.agent_scout_id) === String(loggedInScout.scoutId))
        : players;

    const scopedPlayerIds = new Set(emailScopedPlayers.map(p => String(p.id)));

    const emailScopedReviews = isPlayerUser
      ? reviews.filter(r => scopedPlayerIds.has(String(r.playerId)))
      : isScoutUser && loggedInScout
        ? reviews.filter(r => String(r.scoutId) === String(loggedInScout.scoutId))
        : reviews;

    const emailScopedTasks = isPlayerUser
      ? tasks.filter(t => t.playerId && scopedPlayerIds.has(String(t.playerId)))
      : isScoutUser && loggedInScout
        ? tasks.filter(t => String(t.assignedToScoutId) === String(loggedInScout.scoutId) || (t.playerId && scopedPlayerIds.has(String(t.playerId))))
        : tasks;

    const emailScopedNotes = isPlayerUser
      ? notes.filter(n => n.playerId && scopedPlayerIds.has(String(n.playerId)))
      : isScoutUser && loggedInScout
        ? notes.filter(n => String(n.createdByScoutId) === String(loggedInScout.scoutId) || (n.playerId && scopedPlayerIds.has(String(n.playerId))))
        : notes;

    const emailScopedEmails = isPlayerUser
      ? emails.filter(e => e.playerId && scopedPlayerIds.has(String(e.playerId)))
      : isScoutUser && loggedInScout
        ? emails.filter(e => String(e.sentByScoutId) === String(loggedInScout.scoutId))
        : emails;

    // Agent filter only applies for Admin (Scout/Player have auto-scoped data)
    const filteredPlayers = (isScoutUser || isPlayerUser) || agentFilter === 'all'
      ? emailScopedPlayers
      : emailScopedPlayers.filter(p => String(p.agent_scout_id) === String(agentFilter));

    const filteredReviews = (isScoutUser || isPlayerUser) || agentFilter === 'all'
      ? emailScopedReviews
      : emailScopedReviews.filter(r => String(r.scoutId) === String(agentFilter));

    const filteredTasks = (isScoutUser || isPlayerUser) || agentFilter === 'all'
      ? emailScopedTasks
      : emailScopedTasks.filter(t => String(t.assignedToScoutId) === String(agentFilter));

    const filteredNotes = (isScoutUser || isPlayerUser) || agentFilter === 'all'
      ? emailScopedNotes
      : emailScopedNotes.filter(n => String(n.createdByScoutId) === String(agentFilter));

    const filteredEmails = (isScoutUser || isPlayerUser) || agentFilter === 'all'
      ? emailScopedEmails
      : emailScopedEmails.filter(e => String(e.sentByScoutId) === String(agentFilter));

    const expiringPlayers = filteredPlayers.filter(p => {
      if (getContractStatus(p) === 'Expiring Soon') return true;

      // also include coach contracts that are expiring soon
      const monthsThreshold = getContractExpiringMonths();
      const now = new Date();
      const threshold = addMonths(now, monthsThreshold);

      if (p.contractEndWithCoach) {
        try {
          const coachEnd = new Date(p.contractEndWithCoach);
          if (coachEnd <= threshold) return true;
        } catch (e) {
          // ignore parse errors
        }
      }

      return false;
    });
    const availablePlayers = filteredPlayers.filter(p => getContractStatus(p) === 'Available');
    const recentReviews = filteredReviews.filter(r => isAfter(new Date(r.createdAt), fourWeeksAgo));

    const playersWithoutRecentReview = filteredPlayers.filter(p => {
      const pr = filteredReviews.filter(r => String(r.playerId) === String(p.id));
      if (pr.length === 0) return true;
      const latest = pr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      return !isAfter(new Date(latest.createdAt), fourWeeksAgo);
    });

    // const playersWithoutRecentReview = players.filter(p => {
    //   const hasReview = reviews.some(r => String(r.playerId) === String(p.id));
    //   return !hasReview;
    // });

    const ratingBuckets = [
      { range: '1-2', count: 0 }, { range: '2-3', count: 0 },
      { range: '3-4', count: 0 }, { range: '4-5', count: 0 },
    ];
    filteredPlayers.forEach(p => {
      const pr = filteredReviews.filter(r => String(r.playerId) === String(p.id));
      if (pr.length === 0) return;
      const avg = calculateOverallAverage(getAverageRatings(pr));
      if (avg < 2) ratingBuckets[0].count++;
      else if (avg < 3) ratingBuckets[1].count++;
      else if (avg < 4) ratingBuckets[2].count++;
      else ratingBuckets[3].count++;
    });

    const scoutActivity = scouts.map(s => ({
      ...s, reviewCount: recentReviews.filter(r => r.scoutId === s.scoutId).length,
    }));

    // Tasks
    const openTasks = filteredTasks.filter(t => t.status === 'open');
    const upcomingTasks = openTasks
      .filter(t => !isPast(new Date(t.dueDate)))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
    const overdueTasks = openTasks.filter(t => isPast(new Date(t.dueDate)));

    // Recent notes
    const recentNotes = filteredNotes
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    // Recent emails
    const recentEmails = filteredEmails
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, 5);

    // Recent reviewed players (last 4 weeks)
    const recentReviewedPlayers = filteredPlayers
      .map(p => {
        const allPlayerReviews = filteredReviews.filter(r => String(r.playerId) === String(p.id));
        if (allPlayerReviews.length === 0) return null;

        const playerReviews4Weeks = allPlayerReviews.filter(r => isAfter(new Date(r.createdAt), fourWeeksAgo));
        if (playerReviews4Weeks.length === 0) return null;

        // Get the most recent review within 4 weeks
        const latestReview = playerReviews4Weeks.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

        // Calculate overall rating from all player reviews (same as player profile overall average)
        // const avgRatings = getAverageRatings(allPlayerReviews);
        // const overallRating = calculateOverallAverage(avgRatings);

        const playerActivities = sportActivities.filter(a => a.sportId === p.sportId);

        const avgRatings = getAverageRatings(allPlayerReviews, playerActivities);
        const overallRating = calculateOverallAverage(avgRatings);

        const scout = scouts.find(s => s.scoutId === latestReview.scoutId);

        return {
          player: p,
          scout,
          overallRating: overallRating.toFixed(1),
          reviewDate: latestReview.createdAt,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());

    // Upcoming review alerts (next 4 weeks by matchDate)
    const upcomingReviewAlerts = filteredReviews
      .filter(r => {
        if (!r.matchDate) return false;
        const matchDate = new Date(r.matchDate);
        return matchDate > now && matchDate <= addDays(now, 28);
      });

    return {
      totalPlayers: filteredPlayers.length,
      expiringPlayers,
      availablePlayers,
      recentReviews,
      playersWithoutRecentReview,
      ratingBuckets,
      scoutActivity,
      openTasks,
      upcomingTasks,
      overdueTasks,
      recentNotes,
      recentEmails,
      recentReviewedPlayers,
      upcomingReviewAlerts,
      filteredPlayers,
    };
  }, [players, reviews, scouts, tasks, notes, emails, agentFilter, user?.email, user?.role, isScoutUser]);

  // Use server-provided upcoming tasks when present, otherwise fall back to computed stats
  const displayedUpcomingTasks = ((dashboardData?.dashboardUpcomingTasks as any[]) ?? stats.upcomingTasks) || [];

  const displayedContractAlerts = dashboardContracts;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm font-medium text-foreground/80">
            Welcome back, <span className="font-bold text-primary">{user?.fullName || 'User'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isPlayerUser && !isScoutUser && (
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {scouts.map(s => <SelectItem key={s.scoutId} value={s.scoutId}>{s.scoutName}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {/* <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </Button> */}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {!isPlayerUser && <StatCard title="Total Players" value={dashboardData?.dashboardCounters?.dashboardTotalPlayers ?? stats.totalPlayers} icon={Users} onClick={() => handleStatClick('total')} />}
        <StatCard title="Expiring Contracts" value={dashboardData?.dashboardCounters?.dashboardTotalExpiringContracts ?? stats.expiringPlayers.length} icon={AlertTriangle} warning={(dashboardData?.dashboardCounters?.dashboardTotalExpiringContracts ?? stats.expiringPlayers.length) > 0} onClick={() => handleStatClick('expiring')} />
        <StatCard title="Open Tasks" value={dashboardData?.dashboardCounters?.dashboardTotalOpenTasks ?? stats.openTasks.length} icon={CheckSquare} warning={(dashboardData?.dashboardCounters?.dashboardTotalOpenTasks ?? stats.openTasks.length) > 0} onClick={() => handleStatClick('openTasks')} />
        <StatCard title="Needs Review" value={dashboardData?.dashboardCounters?.dashboardNeedsReview ?? stats.playersWithoutRecentReview.length} icon={Star} warning={(dashboardData?.dashboardCounters?.dashboardNeedsReview ?? stats.playersWithoutRecentReview.length) > 0} onClick={() => handleStatClick('needsReview')} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Tasks</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dashboardLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              displayedUpcomingTasks.map(t => {
              const overdue = isPast(new Date(t.dueDate));
              const assignedByScout = scouts.find(s => s.scoutId === t.assignedToScoutId);
              const taskPlayer = t.playerId ? players.find(p => String(p.id) === String(t.playerId)) : undefined;
              const taskClub = t.clubId ? clubs.find(c => String(c.clubId) === String(t.clubId)) : undefined;
              const assignedToName = (t.assigned_to as string) ?? (taskPlayer ? taskPlayer.fullName : taskClub ? taskClub.clubName : 'Unknown');
              const assignedByName = (t.assigned_by as string) ?? assignedByScout?.scoutName ?? 'Auto-generated';

              return (
                // <div key={t.taskId} className="p-3 rounded-lg hover:bg-secondary transition-colors cursor-pointer border" onClick={() => handleTaskClick(t)}>
                //   <div className="flex items-start justify-between gap-2">
                //     <div className="flex-1 min-w-0">
                //       <div className="flex items-center gap-2 mb-1">
                //         <p className="text-sm font-medium truncate">{t.title}</p>
                //         <Badge variant="secondary" className="text-[10px] shrink-0">
                //           {t.source}
                //         </Badge>
                //         {overdue && <Badge variant="destructive" className="text-[10px] shrink-0">Overdue</Badge>}
                //       </div>
                //       <div className="space-y-1 text-xs text-muted-foreground">
                //         <div className="flex items-center gap-1">
                //           <span className="font-medium">Assigned by:</span>
                //           <span>{assignedByScout?.scoutName || 'Unknown'}</span>
                //         </div>
                //         <div className="flex items-center gap-1">
                //           <span className="font-medium">Assigned to:</span>
                //           <span>{assignedToScout?.scoutName || 'Unknown'}</span>
                //         </div>
                //         <div className="flex items-center gap-1">
                //           <Calendar size={10} />
                //           <span>Due: {format(new Date(t.dueDate), 'MMM d, yyyy')}</span>
                //         </div>
                //       </div>
                //     </div>
                //   </div>
                // </div>

                // <div
                //   key={t.taskId}
                //   className="p-3 rounded-lg border hover:bg-secondary transition-colors cursor-pointer"
                //   onClick={() => handleTaskClick(t)}
                // >
                //   {/* Line 1: Title + Badges */}
                //   <div className="flex items-center justify-between gap-2">
                //     <p className="text-sm font-medium truncate">{t.title}</p>
                //     <div className="flex items-center gap-1 shrink-0">
                //       <Badge variant="secondary" className="text-[10px]">{t.source}</Badge>
                //       {overdue && (
                //         <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                //       )}
                //     </div>
                //   </div>

                //   {/* Line 2: Assigned By + To */}
                //   <div className="text-xs text-muted-foreground mt-1 truncate flex items-center justify-between">
                //     <div>
                //       <span className="font-medium">By :</span> {assignedByScout?.scoutName || 'Unknown'}{" "}
                //       • <span className="font-medium">To:</span> {assignedToScout?.scoutName || 'Unknown'}
                //     </div>

                //     <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                //       <span className="flex items-center gap-1">
                //         <Calendar size={12} />
                //         Due: {format(new Date(t.dueDate), 'MMM d, yyyy')}
                //       </span>
                //     </div>
                //   </div>

                // </div>

                <div
                  key={t.taskId}
                  className="p-3 rounded-lg border hover:bg-secondary transition-colors cursor-pointer"
                  onClick={() => handleTaskClick(t)}
                >
                  {/* Row 1: Title + Badges */}
                  <div className="flex items-start sm:items-center justify-between gap-2">
                    <p className="text-sm font-medium leading-snug line-clamp-1 sm:truncate">
                      {t.title}
                    </p>

                    <div className="flex items-center gap-1 shrink-0 flex-wrap">
                      <Badge variant="secondary" className="text-[11px] flex items-start">
                        {t.source}
                      </Badge>
                      {overdue && (
                        <Badge variant="destructive" className="text-[10px]">
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Fully responsive details */}
                  <div className="mt-1 text-xs text-muted-foreground flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-2">

                    {/* Left side */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                      <span className="truncate max-w-full">
                        <span className="font-medium">Assigned By:</span>{" "}
                        {assignedByName}
                      </span>

                      <span className="hidden md:inline">•</span>

                      <span className="truncate max-w-full">
                        <span className="font-medium">Assigned To:</span>{" "}
                        {assignedToName}
                      </span>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Calendar size={12} />
                      <span className="whitespace-nowrap">
                        <span className="font-medium">Due:</span>{" "}
                        {format(new Date(t.dueDate), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>

              );
            }))}
            {!dashboardLoading && displayedUpcomingTasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No upcoming tasks</p>}
            <Link to="/tasks" className="text-xs text-primary hover:underline block text-center">View all tasks →</Link>
          </CardContent>
        </Card>

        {/* Contract Alerts */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Contract Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(contractAlertsLoading || dashboardLoading) ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <>
              <div className="flex gap-2 mb-2 flex-wrap">
              <button
                onClick={() => setContractTab('all')}
                className={cn(
                  'px-2 py-1 rounded-full text-[12px] font-medium border transition',
                  contractTab === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-foreground border-transparent hover:bg-primary/10 hover:border-primary/30'
                )}
              >
                All
              </button>
              {(Object.keys(contractTypeLabels) as Contract['contractType'][]).map((typeKey) => (
                <button
                  key={typeKey}
                  onClick={() => setContractTab(typeKey)}
                  className={cn(
                    'px-2 py-1 rounded-full text-[12px] font-medium border transition',
                    contractTab === typeKey
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-foreground border-transparent hover:bg-primary/10 hover:border-primary/30'
                  )}
                >
                  {contractTypeLabels[typeKey]}
                </button>
              ))}
              </div>
              <hr />

              {displayedContractAlerts.map((contract) => {
                  const endDate = contract.endDate ? new Date(contract.endDate) : null;
                  const now = new Date();
                  const monthsThreshold = getContractExpiringMonths();
                  const threshold = addMonths(now, monthsThreshold);
                  let status: import('@/types').ContractStatus = 'Available';
                  if (endDate) {
                    if (endDate <= now) status = 'Available';
                    else if (endDate <= threshold) status = 'Expiring Soon';
                    else status = 'Active';
                  }
                  const party1Name = contract.party1Name || contract.party1Type;
                  const party2Name = contract.party2Name || contract.party2Type;

                  return (
                    <Link
                      key={contract.id}
                      to="/contracts"
                      className="block p-3 rounded-lg border hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {party1Name} ↔ {party2Name}
                          <Badge variant="secondary" className="ml-2 pb-[0px] pt-[1px] text-[11px]">
                            {contractTypeLabels[contract.contractType]}
                          </Badge>
                        </p>
                        <div className="shrink-0">
                          <ContractBadge status={status} />
                        </div>
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="truncate">
                            <span className="font-medium">Party 1:</span> {party1Name}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="truncate">
                            <span className="font-medium">Party 2:</span> {party2Name}
                          </span>
                        </div>

                        <div className="shrink-0 space-y-1 text-right">
                          <div>
                            <span className="font-medium">Ends:</span>{' '}
                            {endDate ? format(endDate, 'MMM d, yyyy') : '—'}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {displayedContractAlerts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No contract alerts available</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Recent Notes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dashboardLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              (() => {
              const apiNotes = (dashboardData?.dashboardRecentNotes ?? dashboardData?.recentNotes) as any[] | undefined;
              const source = apiNotes && apiNotes.length > 0
                ? apiNotes.map(a => {
                    const rawForId = a.noteForId ?? a.note_for_id ?? a.note_forid ?? a.note_for ?? a.note_id_for;
                    const rawPlayerOrClub = (a.playerOrClubNote ?? a.player_or_club_note ?? '') as string;
                    const isPlayerNote = String(rawPlayerOrClub || '').toLowerCase() === 'player';
                    return ({
                      noteId: a.note_id ?? a.noteId,
                      topic: a.notesTopic ?? a.noteTopic ?? a.topic,
                      createdAt: a.noteCreatedAt ?? a.createdAt ?? a.note_created_at,
                      playerId: isPlayerNote ? String(rawForId) : undefined,
                      clubId: !isPlayerNote ? String(rawForId) : undefined,
                      entityName: a.noteForName ?? a.note_for_name ?? a.noteFor ?? a.note_for_name,
                      category: a.noteCategory ?? a.note_category ?? a.noteCategoryName
                    });
                  })
                : stats.recentNotes;

              return source.map((n: any) => {
                const entityName = n.entityName || (n.playerId
                  ? players.find(p => String(p.id) === n.playerId)?.fullName || 'Auto-generated Note'
                  : clubs.find(c => c.clubId === n.clubId)?.clubName || 'Auto-generated Note');

                const handleClick = () => {
                  if (n.playerId) {
                    const playerNoteTabs = ['private', 'medical', 'technical', 'performance'];
                    const rawCat = String(n.category || '').toLowerCase();
                    const tab = rawCat === 'commercial' ? 'contracts' : (playerNoteTabs.includes(rawCat) ? rawCat : 'overview');
                    navigate(`/players/${n.playerId}?tab=${tab}&noteId=${encodeURIComponent(n.noteId)}`);
                  } else if (n.clubId) {
                    navigate(`/clubs/${n.clubId}?tab=notes&noteId=${encodeURIComponent(n.noteId)}`);
                  }
                };

                return (
                  <div key={n.noteId} onClick={handleClick} className="block p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{n.topic}</p>
                      <Badge variant="secondary" className="text-[11px]">{n.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{entityName} · {format(new Date(n.createdAt), 'MMM d')}</p>
                  </div>
                );
              });
              })()
            )}
            {!dashboardLoading && ((dashboardData?.dashboardRecentNotes ?? dashboardData?.recentNotes) || stats.recentNotes).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No recent notes</p>}
          </CardContent>
        </Card>

        {/* Recent Emails */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Recent Emails</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dashboardLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              (() => {
              const apiEmails = (dashboardData?.dashboardRecentEmail ?? dashboardData?.recentEmails) as any[] | undefined;
              const source = apiEmails && apiEmails.length > 0
                ? apiEmails.map(a => ({
                    emailId: a.email_id ?? a.emailId,
                    subject: a.subject ?? a.sendEmailForName ?? 'Email',
                    recipientEmail: a.sentTo ?? a.recipientEmail,
                    sentAt: a.sentAt ?? a.sent_at ?? a.sentAt,
                    // prefer explicit API fields when available
                    mailFor: (a.mailForClubOrPlayer ?? a.mail_for_club_or_player ?? a.mailFor ?? a.mail_for) as string | undefined,
                    entityId: a.sendEmailForId ?? a.send_email_for_id ?? a.sendEmailForID ?? undefined,
                    entityName: a.sendEmailForName ?? a.sendEmailForName ?? undefined
                  }))
                : (stats.recentEmails || []).map((ee: any) => ({ ...ee, entityId: ee.playerId ?? ee.clubId }));

              return source.map((e: any) => {
                const explicitType = String((e.mailFor || '')).toLowerCase();
                const explicitId = e.entityId;

                // Prefer explicit mailFor/sendEmailForId values when provided by API
                let toPath: string | undefined;
                if (explicitType === 'player' && explicitId) {
                  toPath = `/players/${explicitId}?tab=emails&emailId=${encodeURIComponent(e.emailId)}`;
                } else if (explicitType === 'club' && explicitId) {
                  toPath = `/clubs/${explicitId}?tab=communication&emailId=${encodeURIComponent(e.emailId)}`;
                } else {
                  // Fallback: try to match against loaded players/clubs lists
                  const relatedPlayer = e.entityId ? players.find(p => String(p.id) === String(e.entityId)) : undefined;
                  const relatedClub = e.entityId ? clubs.find(c => String(c.clubId) === String(e.entityId)) : undefined;
                  toPath = relatedPlayer
                    ? `/players/${relatedPlayer.id}?tab=emails&emailId=${encodeURIComponent(e.emailId)}`
                    : relatedClub
                      ? `/clubs/${relatedClub.clubId}?tab=communication&emailId=${encodeURIComponent(e.emailId)}`
                      : undefined;
                }

                return toPath ? (
                  <Link key={e.emailId} to={toPath} className="p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer block">
                    <p className="text-sm font-medium truncate">{e.subject}</p>
                    <p className="text-xs text-muted-foreground">To: {e.recipientEmail} · {format(new Date(e.sentAt), 'MMM d')}</p>
                  </Link>
                ) : (
                  <div key={e.emailId} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                    <p className="text-sm font-medium truncate">{e.subject}</p>
                    <p className="text-xs text-muted-foreground">To: {e.recipientEmail} · {format(new Date(e.sentAt), 'MMM d')}</p>
                  </div>
                );
              });
              })()
            )}
            {!dashboardLoading && (((dashboardData?.dashboardRecentEmail ?? dashboardData?.recentEmails) || stats.recentEmails) as any[]).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No recent emails</p>}
          </CardContent>
        </Card>

        {/* Recently Reviewed Players */}
        {!isPlayerUser && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Recently Reviewed Players</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-[30vh] overflow-y-auto scrollbar-thin">
              {dashboardLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                // Prefer server-provided recently reviewed players when available
                (() => {
                  const apiList = (dashboardData?.dashboardRecentlyReviewedPlayers ?? dashboardData?.recentlyReviewedPlayers) as any[] | undefined;
                  const source = apiList && apiList.length > 0
                    ? apiList.map(r => ({
                        player: { id: r.playerId, fullName: r.playerName, position: r.playerPosition },
                        scout: { scoutName: r.reviewedByName, scoutId: r.reviewedById },
                        overallRating: r.overallRating ? Number(r.overallRating).toFixed(1) : null,
                        reviewDate: r.createdAt ?? r.matchDate
                      }))
                    : stats.recentReviewedPlayers;

                  return source.length > 0 ? source.map(item => (
                <Link key={item.player.id} to={`/players/${item.player.id}`} className="block p-2 rounded-lg hover:bg-secondary transition-colors border">
                  {/* Row 1: Name + Rating */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{item.player.fullName}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="default" className="text-[11px]">
                        {item.overallRating}/5
                      </Badge>
                    </div>
                  </div>

                  {/* Row 2: Position + Scout + Review Date */}
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="truncate">
                      <span className="font-medium">Position:</span> {playerPositions.find(pos => pos.positionCode === item.player.position)?.positionName || item.player.position}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className="truncate">
                      <span className="font-medium">Reviewed By:</span> {item.scout?.scoutName || 'Auto-generated'}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className="shrink-0">
                      {format(new Date(item.reviewDate), 'MMM d')}
                    </span>
                  </div>
                </Link>
                  )) : <p className="text-sm text-muted-foreground">No players reviewed in last 4 weeks</p>;
                })()
            )}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Review Alerts */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Review Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[30vh] overflow-y-auto scrollbar-thin">
            {dashboardLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              (() => {
                const apiAlerts = (dashboardData?.dashboardUpcomingReviewAlerts ?? dashboardData?.upcomingReviewAlerts) as any[] | undefined;

                const source = apiAlerts && apiAlerts.length > 0
                  ? apiAlerts.map(a => ({
                      playerId: a.reviewToId ?? a.playerId,
                      playerName: a.reviewToName ?? a.fullName,
                      matchDate: a.matchDate,
                      scoutName: a.scoutName,
                      positionName: a.playerPosition ?? a.positionName,
                      clubName: a.clubName,
                      reviewId: a.taskId ?? a.reviewId
                    }))
                  : stats.upcomingReviewAlerts.map((r: any) => ({
                      playerId: r.playerId,
                      playerName: players.find(p => String(p.id) === String(r.playerId))?.fullName,
                      matchDate: r.matchDate,
                      scoutName: scouts.find(s => String(s.scoutId) === String(r.scoutId))?.scoutName,
                      positionName: playerPositions.find(p => p.positionCode === players.find(pl => String(pl.id) === String(r.playerId))?.position)?.positionName,
                      clubName: clubs.find(c => String(c.clubId) === String(players.find(pl => String(pl.id) === String(r.playerId))?.currentClub))?.clubName,
                      reviewId: r.reviewId
                    }));

                if (!source || source.length === 0) return <p className="text-sm text-muted-foreground">No upcoming reviews in next 4 weeks</p>;

                return source.map(r => (
                  <Link key={r.reviewId} to={`/players/${r.playerId}`} className="block">
                    <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{r.playerName || r.playerId}</p>
                        <p className="text-xs text-muted-foreground">{r.matchDate ? format(new Date(r.matchDate), 'MMM d, yyyy') : 'Date TBD'}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {r.scoutName && <span><span className="font-medium">Coach : </span> {r.scoutName}</span>}
                        {r.positionName && <span><span className="font-medium"> • Position :</span> {r.positionName}</span>}
                        {r.clubName && <span><span className="font-medium"> • Club : </span> {r.clubName}</span>}
                      </div>
                    </div>
                  </Link>
                ));
              })()
            )}
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Rating Distribution</CardTitle></CardHeader>
          <CardContent>
            {dashboardLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.ratingBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--card-foreground))' }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Scout Activity */}
        {!isPlayerUser && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Coach Activity (4 weeks)</CardTitle></CardHeader>
            <CardContent className="space-y-3 space-y-3 max-h-[35vh] overflow-y-auto scrollbar-thin">
              {dashboardLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                stats.scoutActivity.map(s => (
                  <div key={s.scoutId} className="flex items-center justify-between p-2">
                    <div>
                      <span className="text-sm font-medium">{s.scoutName}</span>
                      <p className="text-xs text-muted-foreground">{s.roleName}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{s.reviewCount}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        assignedScoutName={selectedTask ? (scouts.find(s => s.scoutId === (selectedTask.assignedToScoutId || (selectedTask as any).assignedById))?.scoutName || 'Auto-generated') : 'Auto-generated'}
        onUpdateTask={handleUpdateTask}
        createdByName={user?.name || 'Admin'}
        getEntityName={getEntityName}
        scouts={taskScoutsOptions.length ? taskScoutsOptions : scouts}
        players={taskPlayersOptions.length ? taskPlayersOptions : players}
        clubs={taskClubsOptions.length ? taskClubsOptions : clubs}
        isScout={isScoutUser}
      />
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, warning = false, onClick }: { title: string; value: number; icon: any; warning?: boolean; onClick?: () => void }) => (
  <Card className={cn(warning ? 'border-accent/30' : '') + (onClick ? ' cursor-pointer' : '')} onClick={onClick}>
    <CardContent className="p-4 flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", warning ? 'bg-accent/15' : 'bg-primary/15')}>
        <Icon size={18} className={warning ? 'text-accent' : 'text-primary'} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
      </div>
    </CardContent>
  </Card>
);

export default Dashboard;
