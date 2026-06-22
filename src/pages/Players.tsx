import { useState, useMemo, useEffect, useRef } from 'react';
import { fetchCompanyProfile, fetchPlayersForPage, fetchScouts, fetchClubs, fetchPlayerPositions, fetchSportsApi, fetchPlayerById } from '@/services/apiService';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/context/PlayerContext';
import { Player, PlayerForPage, PlayerPosition, Scout, Club, Sport } from '@/types';
import { inviteUserApi, approveRejectUserApi } from '@/services/apiService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { isPlayerRole, isScoutRole, hasPermission } from '@/lib/accessPolicy';
import { StarRating } from '@/components/StarRating';
import { ContractBadge } from '@/components/ContractBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, MapPin, Loader2 } from 'lucide-react';

const Players = () => {
  const { addPlayer } = useAppContext();
  const [playersForPage, setPlayersForPage] = useState<PlayerForPage[]>([]);
  const [scoutOptions, setScoutOptions] = useState<Array<{ scoutId: string; scoutName: string }>>([]);
  const [positionOptions, setPositionOptions] = useState<Array<{ positionId: string; positionName: string; positionCode: string }>>([]);
  const [sportOptions, setSportOptions] = useState<Array<{ sportId: number; sportName: string }>>([]);
  const [loggedInScoutIsShowPlayer, setLoggedInScoutIsShowPlayer] = useState(false);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [approvingPlayerId, setApprovingPlayerId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isPlayer = isPlayerRole(user?.role);
  const isScout = isScoutRole(user?.role);
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [scoutFilter, setScoutFilter] = useState('all');
  const [sportFilter, setSportFilter] = useState('all');
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const latestRequestIdRef = useRef(0);

  const buildPlayersQueryParams = () => {
    const parsedSportId = Number(sportFilter);
    return {
      positionCode: posFilter !== 'all' ? posFilter : undefined,
      scoutId: scoutFilter !== 'all' ? scoutFilter : undefined,
      sportId: sportFilter !== 'all' && Number.isFinite(parsedSportId) ? parsedSportId : undefined,
      search: debouncedSearch || undefined,
    };
  };

  const loadPlayers = async (
    params?: {
      positionCode?: string;
      scoutId?: string;
      sportId?: number;
      search?: string;
    },
    mountedRef?: { value: boolean },
  ) => {
    const requestId = ++latestRequestIdRef.current;
    setIsLoadingPlayers(true);
    try {
      const result = await fetchPlayersForPage(params);

      if ((!mountedRef || mountedRef.value) && requestId === latestRequestIdRef.current) {
        setPlayersForPage(Array.isArray(result?.players) ? result.players : []);
        setScoutOptions(Array.isArray(result?.otherData?.scoutOptions) ? result.otherData.scoutOptions : []);
        setPositionOptions(Array.isArray(result?.otherData?.positionOptions) ? result.otherData.positionOptions : []);
        setSportOptions(Array.isArray(result?.otherData?.sportsOptions) ? result.otherData.sportsOptions : []);
        setLoggedInScoutIsShowPlayer(Boolean(result?.otherData?.loggedInScoutIsShowPlayer));
      }
    } catch {
      if ((!mountedRef || mountedRef.value) && requestId === latestRequestIdRef.current) {
        setPlayersForPage([]);
        setScoutOptions([]);
        setPositionOptions([]);
        setSportOptions([]);
        setLoggedInScoutIsShowPlayer(false);
      }
    } finally {
      if ((!mountedRef || mountedRef.value) && requestId === latestRequestIdRef.current) {
        setIsLoadingPlayers(false);
      }
    }
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    const mounted = { value: true };
    loadPlayers(buildPlayersQueryParams(), mounted);

    return () => {
      mounted.value = false;
    };
  }, [posFilter, scoutFilter, sportFilter, debouncedSearch]);

  const handleApprovePlayer = async (player: PlayerForPage, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (!player.userId) {
      toast({
        title: 'Approval failed',
        description: 'Linked user account was not found for this player.',
        variant: 'destructive'
      });
      return;
    }

    setApprovingPlayerId(player.playerId);
    try {
      const response = await approveRejectUserApi({ userId: player.userId, action: 'Approved' });
      toast({
        title: 'Player approved',
        description: response?.message || 'Player approved and invitation sent.',
        className: 'bg-green-600 text-white border-green-700'
      });
      await loadPlayers(buildPlayersQueryParams());
    } catch (err: any) {
      toast({
        title: 'Approval failed',
        description: err?.message || 'Unable to approve player.',
        variant: 'destructive'
      });
    } finally {
      setApprovingPlayerId(null);
    }
  };

  // `visiblePlayers` starts from API output, then page-specific route filter is applied.
  let visiblePlayers = playersForPage;

  if (filterParam === 'expiring' && !isAdmin) {
    visiblePlayers = playersForPage.filter(p =>
      p.agencyContractStatus === 'Expiring Soon' ||
      !p.contractStartDate ||
      !p.contractEndDate
    );
  }

  const filtered = useMemo(() => visiblePlayers, [visiblePlayers]);

  const ownScoutId = user?.scoutId || '';

  // Section separation logic:
  // - Scout: My Players = assigned to logged-in scout
  // - Admin: My Players section is hidden
  const myPlayers = useMemo(() => {
    if (isScout) {
      if (!loggedInScoutIsShowPlayer) {
        // Backend already restricts to own players when is_show_player is false.
        return filtered;
      }
      if (!ownScoutId) return [] as typeof filtered;
      return filtered.filter(p => String(p.scoutId || '') === String(ownScoutId));
    }

    return [] as typeof filtered;
  }, [filtered, isScout, ownScoutId, loggedInScoutIsShowPlayer]);

  // - Scout with isShowPlayer = false: no Other Players
  // - Scout with isShowPlayer = true: Other Players = everyone except own players
  // - Admin: show all filtered players
  const otherPlayers = useMemo(() => {
    if (isAdmin || isPlayer) {
      return filtered;
    }

    if (isScout) {
      if (!loggedInScoutIsShowPlayer) {
        return [] as typeof filtered;
      }
      if (!ownScoutId) {
        return [] as typeof filtered;
      }

      return filtered.filter(p => String(p.scoutId || '') !== String(ownScoutId));
    }

    return [] as typeof filtered;
  }, [filtered, isScout, isAdmin, ownScoutId, loggedInScoutIsShowPlayer]);

  const handleSelectPlayer = async (playerId: string) => {
    try {
      setIsLoadingPlayers(true);
      const details = await fetchPlayerById(playerId);
      navigate(`/players/${playerId}`, { state: { prefetchedPlayerDetails: details } });
    } catch {
      navigate(`/players/${playerId}`);
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Players</h1>
        {!isPlayer && !isScout && hasPermission(user?.role, 'players:manage') && <AddPlayerDialog onAdd={addPlayer} />}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search players..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={posFilter} onValueChange={setPosFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {positionOptions.map((p) => (
              <SelectItem key={p.positionId} value={p.positionCode}>
                {p.positionName} ({p.positionCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={scoutFilter} onValueChange={setScoutFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Coaches</SelectItem>
            {scoutOptions.map(s => <SelectItem key={s.scoutId} value={String(s.scoutId)}>{s.scoutName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sportFilter} onValueChange={setSportFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            {sportOptions.map(s => <SelectItem key={s.sportId} value={String(s.sportId)}>{s.sportName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isScout && (
        <div>
          <h2 className="text-lg font-semibold">My Players</h2>
          <p className="text-xs text-muted-foreground mb-3">
            {isScout
              ? 'Players assigned to your scouting profile'
              : 'All players'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {myPlayers.map(player => (
              <div
                key={player.playerId}
                className="text-left"
                onClick={() => handleSelectPlayer(player.playerId)}
              >
                <Card className="hover:border-primary/30 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {(() => {
                          const placeholder = 'https://static.vecteezy.com/system/resources/thumbnails/078/424/696/small/simple-flat-silhouette-user-profile-account-contact-symbol-icon-vector.jpg';
                          const src = (player as any).playerProfileImage ?? (player as any).profileImage ?? (player as any).profile_image_url ?? placeholder;
                          return <img src={src} alt={player.playerName} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = placeholder; }} />;
                        })()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div>
                            <h3 className="font-semibold">{player.playerName}</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin size={10} /> {player.clubName || 'N/A'}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <ContractBadge status={player.agencyContractStatus as any} />
                            {player.userStatus && (
                              <span className={`text-[10px] px-2 py-0.5 rounded ${player.userStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                {player.userStatus}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium bg-secondary px-2 py-0.5 rounded">{player.position}</span>
                            <span className="text-xs text-muted-foreground">{player.nationality}</span>
                          </div>
                          {player.overallRating > 0 && (
                            <div className="flex items-center gap-1">
                              <StarRating value={Math.round(player.overallRating)} readonly size={12} />
                              <span className="text-xs font-medium">{player.overallRating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        {isAdmin && player.userStatus === 'Pending' && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <Button
                              size="sm"
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                              disabled={approvingPlayerId === player.playerId}
                              onClick={(e) => handleApprovePlayer(player, e)}
                            >
                              {approvingPlayerId === player.playerId ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Approving...</>
                              ) : (
                                'Approve'
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          {myPlayers.length === 0 && (
            <p className="text-xs text-muted-foreground py-4">
              {isScout ? 'You have no assigned players.' : 'No players found in My Players section.'}
            </p>
          )}
        </div>
      )}

      <div className="mt-6">
        {(isScout && loggedInScoutIsShowPlayer) ? (
          <>
            <h2 className="text-lg font-semibold">Other Players</h2>
            <p className="text-xs text-muted-foreground mb-3">
              {isScout
                ? 'All remaining players'
                : (scoutFilter !== 'all'
                  ? 'Players outside the selected scout'
                  : 'Players without assigned scout.')}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">All Players</h2>
            <p className="text-xs text-muted-foreground mb-3">Showing {otherPlayers.length} players</p>
          </>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoadingPlayers ? (
            <div className="col-span-3 flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            otherPlayers.map(player => (
              <div
                key={player.playerId}
                className="text-left"
                onClick={() => handleSelectPlayer(player.playerId)}
              >
                <Card className="hover:border-primary/30 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {(() => {
                          const placeholder = 'https://static.vecteezy.com/system/resources/thumbnails/078/424/696/small/simple-flat-silhouette-user-profile-account-contact-symbol-icon-vector.jpg';
                          const src = (player as any).playerProfileImage ?? (player as any).profileImage ?? (player as any).profile_image_url ?? placeholder;
                          return <img src={src} alt={player.playerName} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = placeholder; }} />;
                        })()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div>
                            <h3 className="font-semibold">{player.playerName}</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin size={10} /> {player.clubName || 'N/A'}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <ContractBadge status={player.agencyContractStatus as any} />
                            {player.userStatus && (
                              <span className={`text-[10px] px-2 py-0.5 rounded ${player.userStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                {player.userStatus}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium bg-secondary px-2 py-0.5 rounded">{player.position}</span>
                            <span className="text-xs text-muted-foreground">{player.nationality}</span>
                          </div>
                          {player.overallRating > 0 && (
                            <div className="flex items-center gap-1">
                              <StarRating value={Math.round(player.overallRating)} readonly size={12} />
                              <span className="text-xs font-medium">{player.overallRating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        {isAdmin && player.userStatus === 'Pending' && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <Button
                              size="sm"
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                              disabled={approvingPlayerId === player.playerId}
                              onClick={(e) => handleApprovePlayer(player, e)}
                            >
                              {approvingPlayerId === player.playerId ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Approving...</>
                              ) : (
                                'Approve'
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )))}
        </div>
      </div>

      {isLoadingPlayers && (
        <p className="text-center text-muted-foreground py-2">Loading players...</p>
      )}

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No players found</p>
      )}
    </div>
  );
};





// ------------------ Add Player Dialog Component ------------------
type AddPlayerDialogProps = {
  onAdd: (player: Player, imageFile?: File) => Promise<void>;
};

const AddPlayerDialog: React.FC<AddPlayerDialogProps> = ({ onAdd }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [playerPositions, setPlayerPositions] = useState<PlayerPosition[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [companyShortName, setCompanyShortName] = useState<string | null>(null);
  const [isLoadingSupportData, setIsLoadingSupportData] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
    nationality: '',
    position: 'CF',
    preferredFoot: 'Right' as const,
    height: '',
    weight: '',
    currentClub: '',
    contractStart: '',
    contractEnd: '',
    contractStartWithCoach: '',
    contractEndWithCoach: '',
    agentName: '',
    agent_scout_id: '',
    contact_info: '',
    email: '',
    gender: '',
    placeOfBirth: '',
    primaryLanguage: '',
    secondaryLanguage: '',
    profileVisibility: true,
    phoneNumber: '',
    alternatePhone: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    secondaryPosition: '',
    jerseyNumber: '',
    experienceYears: '',
    playingLevel: '',
    dominantSide: '',
    fitnessLevel: '',
    injuryStatus: '',
    coachEmail: '',
    coachPhone: '',
    sportId: '',
    profileImage: null as File | null,
    profileImagePreview: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'sport' | 'contract' | 'contact' | 'athletic'>('basic');

  const tabList: { id: 'basic' | 'sport' | 'contract' | 'contact' | 'athletic'; label: string }[] = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'sport', label: 'Sport & Position' },
    { id: 'contract', label: 'Coach & Club' },
    { id: 'contact', label: 'Contact & Address' },
    { id: 'athletic', label: 'Athletic Profile' },
  ];

  const tabOrder: typeof tabList[number]['id'][] = ['basic', 'sport', 'contract', 'contact', 'athletic'];
  const currentIndex = tabOrder.indexOf(activeTab);
  const isLastTab = currentIndex === tabOrder.length - 1;

  const goNext = () => { if (!isLastTab) setActiveTab(tabOrder[currentIndex + 1]); };
  const goPrev = () => { if (currentIndex > 0) setActiveTab(tabOrder[currentIndex - 1]); };

  const resetForm = () => {
    setForm({
      fullName: '',
      dateOfBirth: '',
      nationality: '',
      position: 'CF',
      preferredFoot: 'Right' as const,
      height: '',
      weight: '',
      currentClub: '',
      contractStart: '',
      contractEnd: '',
      contractStartWithCoach: '',
      contractEndWithCoach: '',
      agentName: '',
      agent_scout_id: '',
      contact_info: '',
      gender: '',
      placeOfBirth: '',
      primaryLanguage: '',
      secondaryLanguage: '',
      profileVisibility: true,
      phoneNumber: '',
      alternatePhone: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      secondaryPosition: '',
      jerseyNumber: '',
      experienceYears: '',
      playingLevel: '',
      dominantSide: '',
      fitnessLevel: '',
      injuryStatus: '',
      coachEmail: '',
      coachPhone: '',
      email: '',
      sportId: '',
      profileImage: null,
      profileImagePreview: ''
    });
    setErrors({});
    setIsLoading(false);
    setActiveTab('basic');
  };

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    let mounted = true;
    setIsLoadingSupportData(true);

    (async () => {
      try {
        const [cp, scoutsData, clubsData, positionsData, sportsData] = await Promise.all([
          fetchCompanyProfile(),
          fetchScouts(),
          fetchClubs(),
          fetchPlayerPositions(),
          fetchSportsApi(),
        ]);

        if (!mounted) return;

        setCompanyShortName(cp?.shortName || null);
        setScouts(Array.isArray(scoutsData) ? scoutsData : []);
        setClubs(Array.isArray(clubsData) ? clubsData : []);
        setPlayerPositions(Array.isArray(positionsData) ? positionsData : []);
        setSports(Array.isArray(sportsData) ? sportsData : []);
      } catch {
        if (!mounted) return;
        setCompanyShortName(null);
        setScouts([]);
        setClubs([]);
        setPlayerPositions([]);
        setSports([]);
      } finally {
        if (mounted) setIsLoadingSupportData(false);
      }
    })();

    return () => { mounted = false; };
  }, [open]);

  const update = (field: string, value: any) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'sportId') {
        next.position = 'CF';
        next.agent_scout_id = '';
      }
      return next;
    });
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const filteredPositions = useMemo(
    () => form.sportId
      ? playerPositions.filter(p => !p.sportId || String(p.sportId) === form.sportId)
      : playerPositions,
    [playerPositions, form.sportId]
  );

  const filteredScouts = useMemo(
    () => form.sportId
      ? scouts.filter(s => !s.sportId || String(s.sportId) === form.sportId)
      : scouts,
    [scouts, form.sportId]
  );

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};

    const trimmedFullName = form.fullName?.trim() || '';
    const trimmedNationality = form.nationality?.trim() || '';
    const trimmedDateOfBirth = form.dateOfBirth?.trim() || '';
    const trimmedPreferredFoot = form.preferredFoot?.trim() || '';
    const trimmedHeight = String(form.height || '').trim();
    const trimmedWeight = String(form.weight || '').trim();
    const trimmedContractStart = form.contractStart?.trim() || '';
    const trimmedContractEnd = form.contractEnd?.trim() || '';
    const trimmedScoutId = form.agent_scout_id?.trim() || '';
    const trimmedContactInfo = form.contact_info?.trim() || '';
    const trimmedEmail = form.email?.trim() || '';

    if (!trimmedFullName) nextErrors.fullName = 'Required field';
    if (!trimmedNationality) nextErrors.nationality = 'Required field';
    if (!trimmedDateOfBirth) nextErrors.dateOfBirth = 'Required field';
    if (!trimmedPreferredFoot) nextErrors.preferredFoot = 'Required field';
    if (!trimmedHeight || isNaN(Number(trimmedHeight)) || Number(trimmedHeight) <= 0)
      nextErrors.height = 'Required field';
    if (!trimmedWeight || isNaN(Number(trimmedWeight)) || Number(trimmedWeight) <= 0)
      nextErrors.weight = 'Required field';
    if (!trimmedScoutId) nextErrors.agent_scout_id = 'Required field';
    if (!trimmedEmail) nextErrors.email = 'Required field';
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      nextErrors.email = 'Invalid email address';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      // Navigate to the first tab that has an error
      const basicFields = ['fullName', 'nationality', 'dateOfBirth', 'height', 'weight'];
      const sportFields = ['preferredFoot'];
      const contractFields = ['agent_scout_id'];
      const contactFields = ['email'];
      if (Object.keys(nextErrors).some(k => basicFields.includes(k))) setActiveTab('basic');
      else if (Object.keys(nextErrors).some(k => sportFields.includes(k))) setActiveTab('sport');
      else if (Object.keys(nextErrors).some(k => contractFields.includes(k))) setActiveTab('contract');
      else if (Object.keys(nextErrors).some(k => contactFields.includes(k))) setActiveTab('contact');
      return;
    }

    setIsLoading(true);

    try {
      const heightNum = Number(trimmedHeight);
      const weightNum = Number(trimmedWeight);

      await onAdd(
        {
          id: crypto.randomUUID(),
          fullName: trimmedFullName,
          dateOfBirth: trimmedDateOfBirth || null,
          nationality: trimmedNationality,
          position: form.position,
          preferredFoot: trimmedPreferredFoot,
          heightCm: isNaN(heightNum) ? 0 : heightNum,
          weightKg: isNaN(weightNum) ? 0 : weightNum,
          currentClub: form.currentClub,
          contractStart: trimmedContractStart || null,
          contractEnd: trimmedContractEnd || null,
          contractStartWithCoach: form.contractStartWithCoach || null,
          contractEndWithCoach: form.contractEndWithCoach || null,
          agentName: form.agentName?.trim() || '',
          agent_scout_id: trimmedScoutId || 's1',
          contact_info: trimmedContactInfo,
          contractStatus: null,
          agentContact: null,
          profileImage: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          playerEmail: trimmedEmail,
          player_email: trimmedEmail,
          sportId: form.sportId ? Number(form.sportId) : undefined,
          gender: form.gender || null,
          placeOfBirth: form.placeOfBirth || null,
          place_of_birth: form.placeOfBirth || null,
          primaryLanguage: form.primaryLanguage || null,
          primary_language: form.primaryLanguage || null,
          secondaryLanguage: form.secondaryLanguage || null,
          secondary_language: form.secondaryLanguage || null,
          profileVisibility: !!form.profileVisibility,
          profile_visibility: !!form.profileVisibility,
          phoneNumber: form.phoneNumber || null,
          phone_number: form.phoneNumber || null,
          alternatePhone: form.alternatePhone || null,
          alternate_phone: form.alternatePhone || null,
          emergencyContactName: form.emergencyContactName || null,
          emergency_contact_name: form.emergencyContactName || null,
          emergencyContactNumber: form.emergencyContactNumber || null,
          emergency_contact_number: form.emergencyContactNumber || null,
          addressLine1: form.addressLine1 || null,
          address_line1: form.addressLine1 || null,
          addressLine2: form.addressLine2 || null,
          address_line2: form.addressLine2 || null,
          city: form.city || null,
          state: form.state || null,
          country: form.country || null,
          postalCode: form.postalCode || null,
          postal_code: form.postalCode || null,
          secondaryPosition: form.secondaryPosition || null,
          secondary_position: form.secondaryPosition || null,
          jerseyNumber: form.jerseyNumber ? Number(form.jerseyNumber) : null,
          jersey_number: form.jerseyNumber ? Number(form.jerseyNumber) : null,
          experienceYears: form.experienceYears ? Number(form.experienceYears) : null,
          experience_years: form.experienceYears ? Number(form.experienceYears) : null,
          playingLevel: form.playingLevel || null,
          playing_level: form.playingLevel || null,
          dominantSide: form.dominantSide || null,
          dominant_side: form.dominantSide || null,
          fitnessLevel: form.fitnessLevel || null,
          fitness_level: form.fitnessLevel || null,
          injuryStatus: form.injuryStatus || null,
          injury_status: form.injuryStatus || null,
          coachEmail: form.coachEmail || null,
          coach_email: form.coachEmail || null,
          coachPhone: form.coachPhone || null,
          coach_phone: form.coachPhone || null
        } as any,
        form.profileImage
      );

      try {
        await inviteUserApi({
          email: trimmedEmail,
          fullName: trimmedFullName,
          role: 'Player'
        });

        toast({
          title: '✓ Player Added',
          description: `Player added successfully and invitation email sent to ${trimmedEmail}.`,
          className: 'bg-green-600 text-white border-green-700'
        });
      } catch (inviteErr: any) {
        const inviteReason = inviteErr?.message ? ` Reason: ${inviteErr.message}` : '';
        toast({
          title: '⚠ Player Added, Invite Failed',
          description: `Player was added successfully, but the invitation email could not be sent to ${trimmedEmail}. You can retry sending the invite later.${inviteReason}`,
          className: 'bg-yellow-600 text-white border-yellow-700'
        });
      }

      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast({
        title: '✗ Error',
        description: err?.message || 'Failed to add player.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus size={14} className="mr-1" /> Add Player</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Add New Player</DialogTitle>
        </DialogHeader>

        <div className="w-full bg-background rounded-xl overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-border bg-muted/40 overflow-x-auto">
            {tabList.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB 1: Basic Info ── */}
          {activeTab === 'basic' && (
            <div className="p-6 space-y-6">

              {/* Player Image */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Player Image</p>
                <div className="flex items-center gap-4">
                  <img
                    src={form.profileImagePreview || 'https://static.vecteezy.com/system/resources/thumbnails/078/424/696/small/simple-flat-silhouette-user-profile-account-contact-symbol-icon-vector.jpg'}
                    className="w-14 h-14 rounded-lg object-cover bg-muted border border-border flex-shrink-0"
                    onError={(e) => { e.currentTarget.src = 'https://static.vecteezy.com/system/resources/thumbnails/078/424/696/small/simple-flat-silhouette-user-profile-account-contact-symbol-icon-vector.jpg'; }}
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    className="max-w-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      update('profileImage', file);
                      const reader = new FileReader();
                      reader.onload = () => update('profileImagePreview', reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
              </div>

              {/* Identity */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Identity</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <Label>Full Name <span className="text-destructive">*</span></Label>
                    <Input value={form.fullName} onChange={e => update('fullName', e.target.value)} />
                    {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <Label>Date of Birth <span className="text-destructive">*</span></Label>
                    <Input type="date" value={form.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} />
                    {errors.dateOfBirth && <p className="text-xs text-destructive mt-1">{errors.dateOfBirth}</p>}
                  </div>

                  <div>
                    <Label>Nationality <span className="text-destructive">*</span></Label>
                    <Input value={form.nationality} onChange={e => update('nationality', e.target.value)} />
                    {errors.nationality && <p className="text-xs text-destructive mt-1">{errors.nationality}</p>}
                  </div>

                  <div>
                    <Label>Player Email <span className="text-destructive">*</span></Label>
                    <Input
                      type="email"
                      placeholder="player@example.com"
                      value={form.email}
                      onChange={e => update('email', e.target.value)}
                    />
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={v => update('gender', v)}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Place of Birth</Label>
                    <Input value={form.placeOfBirth} onChange={e => update('placeOfBirth', e.target.value)} />
                  </div>

                  <div>
                    <Label>Primary Language</Label>
                    <Input value={form.primaryLanguage} onChange={e => update('primaryLanguage', e.target.value)} />
                  </div>

                  <div>
                    <Label>Secondary Language</Label>
                    <Input value={form.secondaryLanguage} onChange={e => update('secondaryLanguage', e.target.value)} />
                  </div>

                  <div>
                    <Label>Height <span className="text-[13px] text-muted-foreground">(cm)</span> <span className="text-destructive">*</span></Label>
                    <Input type="number" value={form.height} onChange={e => update('height', e.target.value)} />
                    {errors.height && <p className="text-xs text-destructive mt-1">{errors.height}</p>}
                  </div>

                  <div>
                    <Label>Weight <span className="text-[13px] text-muted-foreground">(kg)</span> <span className="text-destructive">*</span></Label>
                    <Input type="number" value={form.weight} onChange={e => update('weight', e.target.value)} />
                    {errors.weight && <p className="text-xs text-destructive mt-1">{errors.weight}</p>}
                  </div>
                </div>
              </div>

              {/* Visibility */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Visibility</p>
                <div className="flex items-center gap-2">
                  <Switch
                    id="add-profile-visibility"
                    checked={form.profileVisibility}
                    onCheckedChange={(v: boolean) => update('profileVisibility', !!v)}
                  />
                  <Label htmlFor="add-profile-visibility">Profile Visible</Label>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: Sport & Position ── */}
          {activeTab === 'sport' && (
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Sport & Position</p>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Sport</Label>
                    <Select value={form.sportId} onValueChange={v => update('sportId', v)}>
                      <SelectTrigger><SelectValue placeholder="Select sport" /></SelectTrigger>
                      <SelectContent>
                        {sports.map(s => (
                          <SelectItem key={s.sportId} value={String(s.sportId)}>{s.sportName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Position</Label>
                    <Select value={form.position} onValueChange={v => update('position', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {filteredPositions.length === 0 ? (
                          <SelectItem value="__no_position__" disabled>No position added.</SelectItem>
                        ) : (
                          filteredPositions.map(p => (
                            <SelectItem key={p.positionId} value={p.positionCode}>{p.positionName}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Secondary Position</Label>
                    <Select value={form.secondaryPosition} onValueChange={v => update('secondaryPosition', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {filteredPositions.length === 0 ? (
                          <SelectItem value="__no_position__" disabled>No position added.</SelectItem>
                        ) : (
                          filteredPositions.map(p => (
                            <SelectItem key={p.positionId} value={p.positionCode}>{p.positionName}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Jersey Number</Label>
                    <Input type="number" value={form.jerseyNumber} onChange={e => update('jerseyNumber', e.target.value)} />
                  </div>

                  <div>
                    <Label>Laterality <span className="text-destructive">*</span></Label>
                    <Select value={form.preferredFoot} onValueChange={v => update('preferredFoot', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Left">Left</SelectItem>
                        <SelectItem value="Right">Right</SelectItem>
                        <SelectItem value="Both">Ambidextrous</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.preferredFoot && <p className="text-xs text-destructive mt-1">{errors.preferredFoot}</p>}
                  </div>

                  <div>
                    <Label>Dominant Side</Label>
                    <Select value={form.dominantSide} onValueChange={v => update('dominantSide', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Left">Left</SelectItem>
                        <SelectItem value="Right">Right</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Playing Level</Label>
                    <Select value={form.playingLevel} onValueChange={v => update('playingLevel', v)}>
                      <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Amateur">Amateur</SelectItem>
                        <SelectItem value="Semi-Pro">Semi-Pro</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Experience (years)</Label>
                    <Input type="number" value={form.experienceYears} onChange={e => update('experienceYears', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: Coach & Club ── */}
          {activeTab === 'contract' && (
            <div className="p-6 space-y-6">

              {/* Club Assignment */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Club Assignment</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <Label>Current Club</Label>
                    <Select value={form.currentClub} onValueChange={v => update('currentClub', v)}>
                      <SelectTrigger><SelectValue placeholder="Select club" /></SelectTrigger>
                      <SelectContent>
                        {clubs.map(c => (
                          <SelectItem key={c.clubId} value={c.clubId}>{c.clubName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Coach Details */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  {companyShortName || 'Coach'} Details
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>{companyShortName ? `${companyShortName} ` : 'Coach '}<span className="text-destructive">*</span></Label>
                    <Select value={form.agent_scout_id} onValueChange={v => update('agent_scout_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
                      <SelectContent>
                        {filteredScouts.map(s => (
                          <SelectItem key={s.scoutId} value={s.scoutId}>{s.scoutName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.agent_scout_id && <p className="text-xs text-destructive mt-1">{errors.agent_scout_id}</p>}
                  </div>

                  <div>
                    <Label>Coach Email</Label>
                    <Input value={form.coachEmail} onChange={e => update('coachEmail', e.target.value)} />
                  </div>

                  <div>
                    <Label>Coach Phone</Label>
                    <Input value={form.coachPhone} onChange={e => update('coachPhone', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: Contact & Address ── */}
          {activeTab === 'contact' && (
            <div className="p-6 space-y-6">

              {/* Contact Details */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Contact Details</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Phone Number</Label>
                    <Input value={form.phoneNumber} onChange={e => update('phoneNumber', e.target.value)} />
                  </div>

                  <div>
                    <Label>Alternate Phone</Label>
                    <Input value={form.alternatePhone} onChange={e => update('alternatePhone', e.target.value)} />
                  </div>

                  <div>
                    <Label>Emergency Contact Name</Label>
                    <Input value={form.emergencyContactName} onChange={e => update('emergencyContactName', e.target.value)} />
                  </div>

                  <div>
                    <Label>Emergency Contact Number</Label>
                    <Input value={form.emergencyContactNumber} onChange={e => update('emergencyContactNumber', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Address</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label>Address Line 1</Label>
                    <Input value={form.addressLine1} onChange={e => update('addressLine1', e.target.value)} />
                  </div>

                  <div>
                    <Label>Address Line 2</Label>
                    <Input value={form.addressLine2} onChange={e => update('addressLine2', e.target.value)} />
                  </div>

                  <div>
                    <Label>City</Label>
                    <Input value={form.city} onChange={e => update('city', e.target.value)} />
                  </div>

                  <div>
                    <Label>State</Label>
                    <Input value={form.state} onChange={e => update('state', e.target.value)} />
                  </div>

                  <div>
                    <Label>Country</Label>
                    <Input value={form.country} onChange={e => update('country', e.target.value)} />
                  </div>

                  <div>
                    <Label>Postal Code</Label>
                    <Input value={form.postalCode} onChange={e => update('postalCode', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 5: Athletic Profile ── */}
          {activeTab === 'athletic' && (
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Physical & Fitness</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Fitness Level</Label>
                    <Select value={form.fitnessLevel} onValueChange={v => update('fitnessLevel', v)}>
                      <SelectTrigger><SelectValue placeholder="Select fitness" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label>Injury Status</Label>
                    <Select value={form.injuryStatus} onValueChange={v => update('injuryStatus', v)}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fit">Fit</SelectItem>
                        <SelectItem value="Injured">Injured</SelectItem>
                        <SelectItem value="Recovering">Recovering</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Bar */}
          <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-between">
            <Button variant="outline" onClick={goPrev} disabled={currentIndex === 0}>
              Previous
            </Button>

            {!isLastTab ? (
              <Button onClick={goNext}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isLoading || isLoadingSupportData}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding player...</>
                ) : isLoadingSupportData ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</>
                ) : (
                  'Add Player'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Players;
