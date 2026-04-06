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


const Dashboard = () => {
  const { players, reviews, scouts, tasks, notes, emails } = useAppContext();
  const { user, loadUser, logout } = useAuth();
  const navigate = useNavigate();
  const [agentFilter, setAgentFilter] = useState('all');
  const isPlayerUser = (user?.role || '').toLowerCase() === 'player';
  const isScoutUser = isScoutRole(user?.role);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
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

    // Scope players: Player → own email; Scout → assigned players; Admin → all
    const emailScopedPlayers = isPlayerUser && currentUserEmail
      ? players.filter(p => (p.player_email || '').trim().toLowerCase() === currentUserEmail)
      : isScoutUser && loggedInScout
        ? players.filter(p => String(p.agent_scout_id) === String(loggedInScout.scoutId))
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
        ? notes.filter(n => String(n.createdByScoutId) === String(loggedInScout.scoutId))
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
    const recentReviewedPlayerIds = new Set(filteredReviews
      .filter(r => isAfter(new Date(r.createdAt), fourWeeksAgo))
      .map(r => String(r.playerId))
    );
    const recentReviewedPlayers = filteredPlayers
      .filter(p => recentReviewedPlayerIds.has(String(p.id)));

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
              const entity = t.playerId === 'player'
                ? players.find(p => p.id === t.clubId)?.fullName
                : t.clubId;
              const overdue = isPast(new Date(t.dueDate));
              return (
                <Link key={t.taskId} to="/tasks" className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{scouts.find(s => s.scoutId === t.assignedToScoutId)?.scoutName} · {format(new Date(t.dueDate), 'MMM d')}</p>
                  </div>
                  {overdue && <Badge variant="destructive" className="text-[10px] shrink-0">Overdue</Badge>}
                </Link>
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
            {[...stats.expiringPlayers, ...stats.availablePlayers].slice(0, 5).map(p => (
              <Link key={p.id} to={`/players/${p.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors">
                <span className="text-sm font-medium">{p.fullName}</span>
                <ContractBadge status={getContractStatus(p)} />
              </Link>
            ))}
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
              const entity = n.playerId === 'player'
                ? players.find(p => p.id === n.clubId)?.fullName
                : n.clubId;
              return (
                <div key={n.noteId} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{n.topic}</p>
                    <Badge variant="secondary" className="text-[10px]">{n.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{entity} · {format(new Date(n.createdAt), 'MMM d')}</p>
                </div>
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
            {stats.recentReviewedPlayers.length > 0 ? stats.recentReviewedPlayers.map(p => (
              <Link key={p.id} to={`/players/${p.id}`} className="block text-sm hover:text-primary transition-colors truncate">
                {p.fullName}
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
              return (
                <div key={r.reviewId} className="p-2 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">{player ? player.fullName : r.playerId}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(r.matchDate), 'MMM d, yyyy')}</p>
                </div>
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
          <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Scout Activity (4 weeks)</CardTitle></CardHeader>
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
