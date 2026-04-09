import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '@/context/PlayerContext';
import { getContractStatus, getAverageRatings, calculateOverallAverage } from '@/lib/playerUtils';
import { Player, PlayerPosition } from '@/types';
import { inviteUserApi } from '@/services/apiService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { isPlayerRole, isScoutRole } from '@/lib/accessPolicy';
import { StarRating } from '@/components/StarRating';
import { ContractBadge } from '@/components/ContractBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, MapPin, Loader2 } from 'lucide-react';

const Players = () => {
  const { players, reviews, addPlayer, scouts, clubs, playerPositions } = useAppContext();
  const { user } = useAuth();
  const isPlayer = isPlayerRole(user?.role);
  const isScout = isScoutRole(user?.role);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [scoutFilter, setScoutFilter] = useState('all');

  const visiblePlayers = players;

  const filtered = useMemo(() => {
    return visiblePlayers.filter(p => {
      const matchesSearch = p.fullName.toLowerCase().includes(search.toLowerCase()) ||
        (p.currentClub || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.nationality || '').toLowerCase().includes(search.toLowerCase());
      const matchesPos = posFilter === 'all' || p.position === posFilter;
      return matchesSearch && matchesPos;
    });
  }, [visiblePlayers, search, posFilter]);

  // find logged-in scout's own scout record by email match
  const ownScout = isScout
    ? scouts.find(s => (s.email || '').trim().toLowerCase() === (user?.email || '').trim().toLowerCase())
    : undefined;
  const ownScoutId = ownScout?.scoutId;
  const showAllPlayers = ownScout?.isShowPlayer ?? false;

  const myPlayers = useMemo(() => {
    if (!isScout || !ownScoutId) return [] as typeof players;
    return filtered.filter(p => String(p.agent_scout_id || '') === String(ownScoutId));
  }, [filtered, isScout, ownScoutId]);

  const otherPlayers = useMemo(() => {
    if (!isScout || !ownScoutId) {
      // Admin/Player: scout filter applies to all players
      if (scoutFilter === 'all') return filtered;
      return filtered.filter(p => String(p.agent_scout_id || '') === String(scoutFilter));
    }

    if (!showAllPlayers) {
      return [] as typeof players;
    }

    // Scout view: myPlayers are already separated, scout filter applies to Other Players
    if (scoutFilter === 'all') {
      return filtered.filter(p => String(p.agent_scout_id || '') !== String(ownScoutId));
    }

    return filtered.filter(p =>
      String(p.agent_scout_id || '') === String(scoutFilter) &&
      String(p.agent_scout_id || '') !== String(ownScoutId)
    );
  }, [filtered, isScout, ownScoutId, scoutFilter, showAllPlayers, players]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Players</h1>
        {!isPlayer && !isScout && <AddPlayerDialog onAdd={addPlayer} scouts={scouts} clubs={clubs} playerPositions={playerPositions} />}
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
            {playerPositions.map(p => <SelectItem key={p.positionId} value={p.positionCode}>{p.positionName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={scoutFilter} onValueChange={setScoutFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scouts</SelectItem>
            {scouts.map(s => <SelectItem key={s.scoutId} value={String(s.scoutId)}>{s.scoutName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isScout && (
        <div>
          <h2 className="text-lg font-semibold">My Players</h2>
          <p className="text-xs text-muted-foreground mb-3">Players assigned to your scouting profile</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myPlayers.map(player => {
              const playerReviews = reviews.filter(r => String(r.playerId) === String(player.id));
              const overall = playerReviews.length > 0 ? calculateOverallAverage(getAverageRatings(playerReviews)) : 0;
              const status = getContractStatus(player);
              const club = clubs?.find(c => String(c.clubId) === String(player.currentClub));

              return (
                <Link key={player.id} to={`/players/${player.id}`}>
                  <Card className="hover:border-primary/30 transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          <img src={player.profileImage || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?_=20150327203541'} alt={player.fullName} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">{player.fullName}</h3>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin size={10} /> {club ? club.clubName : 'N/A'}</p>
                            </div>
                            <ContractBadge status={status} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium bg-secondary px-2 py-0.5 rounded">{player.position}</span>
                              <span className="text-xs text-muted-foreground">{player.nationality}</span>
                            </div>
                            {playerReviews.length > 0 && (
                              <div className="flex items-center gap-1">
                                <StarRating value={Math.round(overall)} readonly size={12} />
                                <span className="text-xs font-medium">{overall.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
          {myPlayers.length === 0 && <p className="text-xs text-muted-foreground py-4">You have no assigned players.</p>}
        </div>
      )}

      <div className="mt-6">
        {isScout ? (
          <>
            <h2 className="text-lg font-semibold">Other Players</h2>
            <p className="text-xs text-muted-foreground mb-3">
              {showAllPlayers
                ? 'All remaining players'
                : 'Show All Players is OFF. Only assigned players are visible.'}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground mb-3">
            Showing {otherPlayers.length} players
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {otherPlayers.map(player => {
            const playerReviews = reviews.filter(r => String(r.playerId) === String(player.id));
            const overall = playerReviews.length > 0 ? calculateOverallAverage(getAverageRatings(playerReviews)) : 0;
            const status = getContractStatus(player);
            const club = clubs?.find(c => String(c.clubId) === String(player.currentClub));

            return (
              <Link key={player.id} to={`/players/${player.id}`}>
                <Card className="hover:border-primary/30 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        <img src={player.profileImage || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?_=20150327203541'} alt={player.fullName} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{player.fullName}</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin size={10} /> {club ? club.clubName : 'N/A'}</p>
                          </div>
                          <ContractBadge status={status} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium bg-secondary px-2 py-0.5 rounded">{player.position}</span>
                            <span className="text-xs text-muted-foreground">{player.nationality}</span>
                          </div>
                          {playerReviews.length > 0 && (
                            <div className="flex items-center gap-1">
                              <StarRating value={Math.round(overall)} readonly size={12} />
                              <span className="text-xs font-medium">{overall.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No players found</p>
      )}
    </div>
  );
};

const AddPlayerDialog = ({
  onAdd,
  scouts,
  clubs,
  playerPositions
}: {
  onAdd: (player: Player, imageFile?: File) => Promise<void>;
  scouts: any[];
  clubs: any[];
  playerPositions: PlayerPosition[];
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
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
    agentName: '',
    agent_scout_id: '',
    contact_info: '',
    email: '',
    profileImage: null as File | null,
    profileImagePreview: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

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
      agentName: '',
      agent_scout_id: '',
      contact_info: '',
      email: '',
      profileImage: null,
      profileImagePreview: ''
    });
    setErrors({});
    setIsLoading(false);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const update = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};

    const trimmedFullName = form.fullName?.trim() || '';
    const trimmedNationality = form.nationality?.trim() || '';
    const trimmedDateOfBirth = form.dateOfBirth?.trim() || '';
    const trimmedPreferredFoot = form.preferredFoot?.trim() || '';
    // const trimmedHeight = form.height?.trim() || '';
    // const trimmedWeight = form.weight?.trim() || '';
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
          agentName: form.agentName?.trim() || '',
          agent_scout_id: trimmedScoutId || 's1',
          contact_info: trimmedContactInfo,
          contractStatus: null,
          agentContact: null,
          profileImage: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          player_email:trimmedEmail
        },
        form.profileImage
      );

      // Player saved successfully, now try to send invite
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
        // Player was saved but invite failed
        const inviteReason = inviteErr?.message ? ` Reason: ${inviteErr.message}` : '';
        toast({
          title: '⚠ Player Added, Invite Failed',
          description: `Player was added successfully, but the invitation email could not be sent to ${trimmedEmail}. You can retry sending the invite later.${inviteReason}`,
          className: 'bg-yellow-600 text-white border-yellow-700'
        });
      }

      // Reset form
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
        agentName: '',
        agent_scout_id: '',
        contact_info: '',
        email: '',
        profileImage: null,
        profileImagePreview: ''
      });

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add New Player</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">


          {/* <div className="col-span-2">
            <Label>Player Image</Label>
            <Input
              type="file"
              accept="image/*"

              // onChange={async (e) => {
              //   const file = e.target.files?.[0];
              //   if (!file) return;

              //   // const base64 = await fileToBase64(file);
              //   // update('profileImage', base64);
              // }}

              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = () => update('profileImage', reader.result as string);
                reader.readAsDataURL(file);
              }}

            />
          </div> */}
          {/* Image Upload */}
          <div className="col-span-2">
            <Label>Player Image</Label>
            <div className="flex items-center gap-3">
              <img
                src={form.profileImagePreview || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'}
                className="w-16 h-16 rounded-md object-cover bg-muted"
              />
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  // Store the file object
                  update('profileImage', file);
                  
                  // Create preview URL
                  const reader = new FileReader();
                  reader.onload = () => update('profileImagePreview', reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </div>
          </div>


          <div className="col-span-2">
            <Label>Full Name <span className="text-red-500">*</span></Label>
            <Input value={form.fullName} onChange={e => update('fullName', e.target.value)} />
            {errors.fullName ? <p className="text-xs text-destructive mt-1">{errors.fullName}</p> : null}
          </div>

          <div>
            <Label>Date of Birth <span className="text-red-500">*</span></Label>
            <Input type="date" value={form.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)} />
            {errors.dateOfBirth ? <p className="text-xs text-destructive mt-1">{errors.dateOfBirth}</p> : null}
          </div>

          <div>
            <Label>Nationality <span className="text-red-500">*</span></Label>
            <Input value={form.nationality} onChange={e => update('nationality', e.target.value)} />
            {errors.nationality ? <p className="text-xs text-destructive mt-1">{errors.nationality}</p> : null}
          </div>

          <div>
            <Label>Position</Label>
            <Select value={form.position} onValueChange={v => update('position', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{playerPositions.map(p => <SelectItem key={p.positionId} value={p.positionCode}>{p.positionName}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label>Laterality <span className="text-red-500">*</span></Label>
            <Select value={form.preferredFoot} onValueChange={v => update('preferredFoot', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Left">Left</SelectItem>
                <SelectItem value="Right">Right</SelectItem>
                <SelectItem value="Both">Ambidextrous</SelectItem>
              </SelectContent>
            </Select>
            {errors.preferredFoot ? <p className="text-xs text-destructive mt-1">{errors.preferredFoot}</p> : null}
          </div>

          <div>
            <Label>Height <span className="text-[14px] text-gray-500">(cm)</span> <span className="text-red-500">*</span></Label>
            <Input type="number" value={form.height} onChange={e => update('height', e.target.value)} />
            {errors.height ? <p className="text-xs text-destructive mt-1">{errors.height}</p> : null}
          </div>

          <div>
            <Label>Weight <span className="text-[14px] text-gray-500">(kg)</span> <span className="text-red-500">*</span></Label>
            <Input type="number" value={form.weight} onChange={e => update('weight', e.target.value)} />
            {errors.weight ? <p className="text-xs text-destructive mt-1">{errors.weight}</p> : null}
          </div>

          {/* <div className="col-span-2"><Label>Current Club</Label><Input value={form.currentClub} onChange={e => update('currentClub', e.target.value)} /></div> */}

          <div className="col-span-2">
            <Label>Current Club</Label>
            <Select value={form.currentClub} onValueChange={v => update('currentClub', v)}>
              <SelectTrigger><SelectValue placeholder="Select club" /></SelectTrigger>
              <SelectContent>
                {clubs.map(c => (
                  <SelectItem key={c.clubId} value={c.clubId}>
                    {c.clubName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            {/* <Label>Contract Start <span className="text-red-500">*</span></Label> */}
            <Label>Contract Start</Label>
            <Input type="date" value={form.contractStart} onChange={e => update('contractStart', e.target.value)} />
            {/* {errors.contractStart ? <p className="text-xs text-destructive mt-1">{errors.contractStart}</p> : null} */}
          </div>

          <div>
            {/* <Label>Contract End <span className="text-red-500">*</span></Label> */}
             <Label>Contract End</Label>
            <Input type="date" value={form.contractEnd} onChange={e => update('contractEnd', e.target.value)} />
            {/* {errors.contractEnd ? <p className="text-xs text-destructive mt-1">{errors.contractEnd}</p> : null} */}
          </div>

          <div><Label>Agent Name</Label><Input value={form.agentName} onChange={e => update('agentName', e.target.value)} /></div>

          <div>
            <Label>Assigned Coach <span className="text-red-500">*</span></Label>
            <Select value={form.agent_scout_id} onValueChange={v => update('agent_scout_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select Coach" /></SelectTrigger>
              <SelectContent>{scouts.map(s => <SelectItem key={s.scoutId} value={s.scoutId}>{s.scoutName}</SelectItem>)}</SelectContent>
            </Select>
            {errors.agent_scout_id ? <p className="text-xs text-destructive mt-1">{errors.agent_scout_id}</p> : null}
          </div>

          <div className="col-span-2">
            <Label>Email <span className="text-red-500">*</span></Label>
            <Input 
              type="email"
              placeholder="player@example.com"
              value={form.email} 
              onChange={e => update('email', e.target.value)} 
              disabled={isLoading}
            />
            {errors.email ? <p className="text-xs text-destructive mt-1">{errors.email}</p> : null}
          </div>

          <div className="col-span-2">
            <Label>Contact Info </Label>
            <Input 
              value={form.contact_info} 
              onChange={e => update('contact_info', e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
        <Button onClick={handleSubmit} className="w-full mt-4" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding player...
            </>
          ) : (
            'Add Player'
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default Players;
