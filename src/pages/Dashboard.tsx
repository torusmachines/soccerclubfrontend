import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/context/PlayerContext';
import { getContractStatus, getAverageRatings, calculateOverallAverage } from '@/lib/playerUtils';
import { ContractBadge } from '@/components/ContractBadge';
import { StarRating } from '@/components/StarRating';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, AlertTriangle, Star, ClipboardList, CheckSquare, StickyNote, Mail, Calendar, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, subWeeks, isAfter, isPast, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { isScoutRole } from '@/lib/accessPolicy';
import { TaskDetailsModal } from '@/components/TaskDetailsModal';
import { Task } from '@/types';


const Dashboard = () => {
  const { players, reviews, scouts, tasks, notes, emails, clubs, playerPositions } = useAppContext();
  const { user, loadUser, logout } = useAuth();
  const navigate = useNavigate();
  const [agentFilter, setAgentFilter] = useState('all');
  const isPlayerUser = (user?.role || '').toLowerCase() === 'player';
  const isScoutUser = isScoutRole(user?.role);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
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

    const expiringPlayers = filteredPlayers.filter(p => getContractStatus(p) === 'Expiring Soon');
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
        const avgRatings = getAverageRatings(allPlayerReviews);
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
    };
  }, [players, reviews, scouts, tasks, notes, emails, agentFilter, user?.email, user?.role, isScoutUser]);

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
        {!isPlayerUser && <StatCard title="Total Players" value={stats.totalPlayers} icon={Users} />}
        <StatCard title="Expiring Contracts" value={stats.expiringPlayers.length} icon={AlertTriangle} warning={stats.expiringPlayers.length > 0} />
        <StatCard title="Open Tasks" value={stats.openTasks.length} icon={CheckSquare} warning={stats.overdueTasks.length > 0} />
        <StatCard title="Needs Review" value={stats.playersWithoutRecentReview.length} icon={Star} warning={stats.playersWithoutRecentReview.length > 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Tasks</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.upcomingTasks.map(t => {
              const overdue = isPast(new Date(t.dueDate));
              const assignedByScout = scouts.find(s => s.scoutId === t.assignedToScoutId); // Assigned by scout or admin placeholder
              const taskPlayer = t.playerId ? players.find(p => String(p.id) === String(t.playerId)) : undefined;
              const taskClub = t.clubId ? clubs.find(c => String(c.clubId) === String(t.clubId)) : undefined;
              const assignedToName = taskPlayer ? taskPlayer.fullName : taskClub ? taskClub.clubName : 'Unknown';

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
                        {assignedByScout?.scoutName || 'Unknown'}
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
            })}
            {stats.upcomingTasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No upcoming tasks</p>}
            <Link to="/tasks" className="text-xs text-primary hover:underline block text-center">View all tasks →</Link>
          </CardContent>
        </Card>

        {/* Contract Alerts */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Contract Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[...stats.expiringPlayers, ...stats.availablePlayers].slice(0, 5).map(p => {
              const scout = scouts.find(s => s.scoutId === p.agent_scout_id);
              const club = clubs.find(c => String(c.clubId) === String(p.currentClub));
              const position = playerPositions.find(pos => pos.positionCode === p.position);
              return (
                // <Link key={p.id} to={`/players/${p.id}`} className="block p-3 rounded-lg hover:bg-secondary transition-colors border">
                //   <div className="flex items-start justify-between gap-2">
                //     <div className="flex-1 min-w-0">
                //       <div className="flex items-center gap-2 mb-1">
                //         <p className="text-sm font-medium truncate">{p.fullName}</p>
                //         <ContractBadge status={getContractStatus(p)} />
                //       </div>
                //       <div className="space-y-1 text-xs text-muted-foreground">
                //         <div className="flex items-center gap-1">
                //           <span className="font-medium">Club:</span>
                //           <span>{p.currentClub || 'Unknown'}</span>
                //         </div>
                //         <div className="flex items-center gap-1">
                //           <span className="font-medium">Scout:</span>
                //           <span>{scout?.scoutName || 'Unknown'}</span>
                //         </div>
                //         <div className="flex items-center gap-1">
                //           <span className="font-medium">Position:</span>
                //           <span>{p.position}</span>
                //         </div>
                //         <div className="flex items-center gap-1">
                //           <span className="font-medium">Contract ends:</span>
                //           <span>{format(new Date(p.contractEnd), 'MMM d, yyyy')}</span>
                //         </div>
                //       </div>
                //     </div>
                //   </div>
                // </Link>

                <Link
                  key={p.id}
                  to={`/players/${p.id}`}
                  className="block p-3 rounded-lg border hover:bg-secondary transition-colors"
                >
                  {/* Row 1: Name + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{p.fullName}</p>
                    <div className="shrink-0">
                      <ContractBadge status={getContractStatus(p)} />
                    </div>
                  </div>

                  {/* Row 2: Fully responsive details */}
                  <div className="mt-1 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">

                    {/* Left side (wraps nicely on small screens) */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate">
                        <span className="font-medium">Club:</span> {club?.clubName || p.currentClub || 'Unknown'}
                      </span>

                      <span className="hidden sm:inline">•</span>

                      <span className="truncate">
                        <span className="font-medium">Coach:</span> {scout?.scoutName || 'Unknown'}
                      </span>

                      <span className="hidden sm:inline">•</span>

                      <span>
                        <span className="font-medium">Position:</span> {position?.positionName || p.position}
                      </span>
                    </div>

                    {/* Right side (date aligned properly) */}
                    <div className="shrink-0">
                      <span className="font-medium">Ends:</span>{" "}
                      {format(new Date(p.contractEnd), 'MMM d, yyyy')}
                    </div>
                  </div>
                </Link>
              );
            })}
            {stats.expiringPlayers.length === 0 && stats.availablePlayers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No contract alerts</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Recent Notes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.recentNotes.map(n => {
              const entityName = n.playerId
                ? players.find(p => String(p.id) === n.playerId)?.fullName || 'Unknown Player'
                : clubs.find(c => c.clubId === n.clubId)?.clubName || 'Unknown Club';
              const entityUrl = n.playerId
                ? `/players/${n.playerId}?tab=notes`
                : `/clubs/${n.clubId}?tab=notes`;

              return (
                <Link key={n.noteId} to={entityUrl} className="block p-2 rounded-lg hover:bg-secondary transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{n.topic}</p>
                    <Badge variant="secondary" className="text-[11px]">{n.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{entityName} · {format(new Date(n.createdAt), 'MMM d')}</p>
                </Link>
              );
            })}
            {stats.recentNotes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No recent notes</p>}
          </CardContent>
        </Card>

        {/* Recent Emails */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Recent Emails</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.recentEmails.map(e => (
              <div key={e.emailId} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <p className="text-sm font-medium truncate">{e.subject}</p>
                <p className="text-xs text-muted-foreground">To: {e.recipientEmail} · {format(new Date(e.sentAt), 'MMM d')}</p>
              </div>
            ))}
            {stats.recentEmails.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No recent emails</p>}
          </CardContent>
        </Card>

        {/* Recently Reviewed Players */}
        {!isPlayerUser && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Recently Reviewed Players</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-[30vh] overflow-y-auto scrollbar-thin">
              {stats.recentReviewedPlayers.length > 0 ? stats.recentReviewedPlayers.map(item => (
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
                      <span className="font-medium">Reviewed By:</span> {item.scout?.scoutName || 'Unknown'}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className="shrink-0">
                      {format(new Date(item.reviewDate), 'MMM d')}
                    </span>
                  </div>
                </Link>
              )) : <p className="text-sm text-muted-foreground">No players reviewed in last 4 weeks</p>}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Review Alerts */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Review Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[30vh] overflow-y-auto scrollbar-thin">
            {stats.upcomingReviewAlerts.length > 0 ? stats.upcomingReviewAlerts.map(r => {
              const player = players.find(p => String(p.id) === String(r.playerId));
              const scout = scouts.find(s => String(s.scoutId) === String(r.scoutId));
              const position = playerPositions.find(p => p.positionCode === player?.position);
              const club = clubs.find(c => String(c.clubId) === String(player?.currentClub));
              
              return (
                <Link key={r.reviewId} to={`/players/${r.playerId}`} className="block">
                  <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{player ? player.fullName : r.playerId}</p>
                      <p className="text-xs text-muted-foreground">{r.matchDate ? format(new Date(r.matchDate), 'MMM d, yyyy') : 'Date TBD'}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {scout && <span><span className="font-medium">Coach : </span> {scout.scoutName}</span>}
                      {position && <span><span className="font-medium"> • Position :</span> {position.positionName}</span>}
                      {club && <span><span className="font-medium"> • Club : </span> {club.clubName}</span>}
                    </div>
                  </div>
                </Link>
              );
            }) : <p className="text-sm text-muted-foreground">No upcoming reviews in next 4 weeks</p>}
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Rating Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.ratingBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--card-foreground))' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Scout Activity */}
        {!isPlayerUser && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Coach Activity (4 weeks)</CardTitle></CardHeader>
            <CardContent className="space-y-3 space-y-3 max-h-[35vh] overflow-y-auto scrollbar-thin">
              {stats.scoutActivity.map(s => (
                <div key={s.scoutId} className="flex items-center justify-between p-2">
                  <div>
                    <span className="text-sm font-medium">{s.scoutName}</span>
                    <p className="text-xs text-muted-foreground">{s.roleName}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{s.reviewCount}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        assignedScoutName={selectedTask ? (scouts.find(s => s.scoutId === selectedTask.assignedToScoutId)?.scoutName || 'Unknown Scout') : 'Unknown Scout'}
        createdByName={user?.name || 'Admin'}
        getEntityName={getEntityName}
        scouts={scouts}
        players={players}
        clubs={clubs}
        isScout={isScoutUser}
      />
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, warning = false }: { title: string; value: number; icon: any; warning?: boolean }) => (
  <Card className={cn(warning ? 'border-accent/30' : '')}>
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
