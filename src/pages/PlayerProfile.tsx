import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useAppContext } from '@/context/PlayerContext';
import { getContractStatus, getAverageRatings, calculateOverallAverage, generateDevPlan, getRatingCategories, activityNameToKey, buildRatingsFromActivityRows } from '@/lib/playerUtils';
import { NoteCategory, Ratings, DevelopmentPlan, Player, Review, DOCUMENT_TYPES, PlayerPosition, NOTE_CATEGORIES } from '@/types';
import { StarRating } from '@/components';
import { ContractBadge } from '@/components';
import { NotesModule, NoteViewDialog } from '@/components';
import { EmailModule } from '@/components';
import { TaskTimeline } from '@/components';
import { AiPlanModule } from '@/components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, FileText, Brain, Calendar, User, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { uploadPlayerImageApi } from '@/services/apiService';
import { useAuth } from '@/context/AuthContext';
import { isPlayerRole, isScoutRole, hasPermission } from '@/lib/accessPolicy';
import { fetchPlayerById, fetchPlayersSimplified, downloadDocumentApi, fetchProfileContractsByPlayer } from '@/services/apiService';
import type { Contract, Sport } from '@/types';

type OverviewActivityRating = {
  activityId: number;
  activityName: string;
  averageRating: number;
};

type PlayerOverviewData = {
  playerId: string;
  playerName: string;
  dateOfBirth?: string;
  nationality?: string;
  position?: string;
  preferredFoot?: string;
  heightCm?: number;
  weightKg?: number;
  contactInfo?: string;
  agentName?: string;
  scoutId?: string;
  scoutName?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  contractStartWithCoach?: string;
  contractEndWithCoach?: string;
  contractStatus?: string;
  sportId?: number;
  sportName?: string;
  currentClubId?: string;
  currentClubName?: string;
  overallRating?: number;
  activityRatings: OverviewActivityRating[];
};

type PlayerReviewViewModel = Review & {
  scoutName?: string;
  club1Name?: string;
  club2Name?: string;
  averageRating?: number;
  activities?: Array<{
    activityId: number;
    activityName: string;
    rating: number;
    comment?: string;
    ratingFollowupDate?: string;
  }>;
};

type PlayerSportDetailsEntityViewModel = {
  entity_id: number;
  entity_name: string;
};

type PlayerSportDetailsViewModel = {
  sport_name: string;
  sport_id?: number;
  sport_entity: PlayerSportDetailsEntityViewModel[];
};

const PlayerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isPlayer = isPlayerRole(user?.role);
  const isAdmin = user?.role === 'Admin';
  const isScout = isScoutRole(user?.role);
  const { players, reviews, scouts, addReview, addDocument, clubs, notes, updatePlayer, deletePlayer, playerPositions, sports, sportActivities, loadEmailsByPlayer } = useAppContext();

  const [editPlayer, setEditPlayer] = useState<Player | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const prefetchedPlayerDetails = (location.state as any)?.prefetchedPlayerDetails;
  const [shouldOpenEditFromQuery, setShouldOpenEditFromQuery] = useState(false);
  const navigate = useNavigate();

  const [selectedDocType, setSelectedDocType] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [taskTabRemountKey, setTaskTabRemountKey] = useState(0);
  const [playersSimplified, setPlayersSimplified] = useState<any[]>([]);
  const [companyShortName] = useState<string | null>(null);

  const noteIdParam = searchParams.get('noteId');
  // Derive modal open state directly from the URL param to avoid races.
  const openNoteModal = Boolean(noteIdParam);
  const handledNoteIdRef = useRef<string | null>(null);
  const handledReloadDefaultTabRef = useRef(false);
  const closeAllowedRef = useRef(false);
  const closeAllowTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeAllowTimerRef.current) {
        window.clearTimeout(closeAllowTimerRef.current);
        closeAllowTimerRef.current = null;
      }
    };
  }, []);

  const mapOverviewFromApi = (data: any): PlayerOverviewData => ({
    playerId: String(data?.playerId ?? ''),
    playerName: data?.playerName ?? '',
    dateOfBirth: data?.dateOfBirth ?? undefined,
    nationality: data?.nationality ?? undefined,
    position: data?.position ?? undefined,
    preferredFoot: data?.preferredFoot ?? undefined,
    heightCm: data?.heightCm ?? undefined,
    weightKg: data?.weightKg ?? undefined,
    contactInfo: data?.contactInfo ?? data?.contact_info ?? undefined,
    agentName: data?.agentName ?? undefined,
    scoutId: data?.scoutId ?? data?.agentScoutId ?? data?.agent_scout_id ?? undefined,
    scoutName: data?.scoutName ?? undefined,
    contractStartDate: data?.contractStartDate ?? undefined,
    contractEndDate: data?.contractEndDate ?? undefined,
    contractStartWithCoach: data?.contractStartWithCoach ?? undefined,
    contractEndWithCoach: data?.contractEndWithCoach ?? undefined,
    contractStatus: data?.contractStatus ?? undefined,
    sportId: data?.sportId ?? undefined,
    sportName: data?.sportName ?? undefined,
    currentClubId: data?.currentClubId ?? undefined,
    currentClubName: data?.currentClubName ?? undefined,
    overallRating: Number.isFinite(Number(data?.overallRating)) ? Number(data?.overallRating) : 0,
    activityRatings: Array.isArray(data?.activityRatings)
      ? data.activityRatings.map((x: any) => ({
        activityId: Number(x?.activityId ?? 0),
        activityName: x?.activityName ?? '',
        averageRating: Number.isFinite(Number(x?.averageRating)) ? Number(x.averageRating) : 0,
      }))
      : [],
  });

  const mapApiReviews = (data: any, playerId?: string): PlayerReviewViewModel[] => {
    if (!Array.isArray(data?.player_all_review)) return [];

    return data.player_all_review.map((r: any) => {
      const activities = Array.isArray(r?.Activities) ? r.Activities : (r?.activities ?? []);
      const mappedRevRatingActivities = activities.map((a: any) => ({
        reviewActivityRatingId: a?.reviewActivityRatingId ?? undefined,
        reviewId: String(r?.ReviewId ?? r?.reviewId ?? ''),
        activityId: Number(a?.ActivityId ?? a?.activityId ?? 0),
        rating: Number(a?.Rating ?? a?.rating ?? 0),
        comment: a?.Comment ?? a?.comment ?? undefined,
        ratingFollowupDate: a?.ratingFollowupDate ?? a?.ratingFollowupDate ?? undefined,
        createdAt: a?.createdAt ?? a?.createdAt ?? undefined,
        updatedAt: a?.updatedAt ?? a?.updatedAt ?? undefined,
      }));

      return {
        comment: null,
        reviewId: String(r?.ReviewId ?? r?.reviewId ?? ''),
        playerId: String(playerId ?? r?.playerId ?? ''),
        scoutId: r?.ScoutId ?? r?.scoutId ?? '',
        scoutName: r?.ScoutName ?? r?.scoutName ?? undefined,
        matchDate: r?.MatchDate ?? r?.matchDate ?? undefined,
        club1Id: r?.Club1Id ?? r?.club1Id ?? undefined,
        club2Id: r?.Club2Id ?? r?.club2Id ?? undefined,
        club1Name: r?.Club1Name ?? r?.club1Name ?? undefined,
        club2Name: r?.Club2Name ?? r?.club2Name ?? undefined,
        notes: r?.Notes ?? r?.notes ?? '',
        createdAt: r?.CreatedAt ?? r?.createdAt ?? undefined,
        averageRating: Number.isFinite(Number(r?.AverageRating ?? r?.averageRating)) ? Number(r?.AverageRating ?? r?.averageRating) : undefined,
        revRatingActivities: mappedRevRatingActivities,
        activities: activities.map((a: any) => ({
          activityId: Number(a?.ActivityId ?? a?.activityId ?? 0),
          activityName: a?.ActivityName ?? a?.activityName ?? '',
          rating: Number(a?.Rating ?? a?.rating ?? 0),
          comment: a?.Comment ?? a?.comment ?? undefined,
        })),
        revRatings: undefined,
      } as PlayerReviewViewModel;
    });
  };

  const mapApiNotes = (data: any, playerId?: string) => {
    if (!Array.isArray(data?.player_all_notes)) return [] as import('@/types').Note[];

    return (data.player_all_notes as any[]).map(n => ({
      noteId: String(n?.noteId ?? n?.NoteId ?? ''),
      playerId: String(playerId ?? n?.playerId ?? ''),
      clubId: n?.clubId ?? n?.ClubId ?? undefined,
      topic: n?.topic ?? n?.Topic ?? '',
      description: n?.description ?? n?.Description ?? '',
      category: n?.category ?? n?.Category ?? '',
      followUpDate: n?.followUpDate ? String(n.followUpDate) : (n?.FollowUpDate ? String(n.FollowUpDate) : undefined),
      meetingDate: undefined,
      attendees: undefined,
      createdByScoutId: n?.createdByScoutId ?? n?.CreatedByScoutId ?? '',
      createdAt: n?.createdAt ? String(n.createdAt) : (n?.CreatedAt ? String(n.CreatedAt) : ''),
      isVisibleToPlayer: Boolean(n?.isVisibleToPlayer ?? n?.IsVisibleToPlayer ?? false),
    } as import('@/types').Note));
  };

  const mapPlayerSportDetailsFromApi = (details: any): PlayerSportDetailsViewModel | null => {
    if (!details) return null;

    const sportIdValue = Number(details?.sport_id);
    const sportEntity = Array.isArray(details?.sport_entity)
      ? details.sport_entity.map((entity: any) => ({
        entity_id: Number(entity?.entity_id ?? 0),
        entity_name: String(entity?.entity_name ?? ''),
      }))
      : [];

    return {
      sport_name: String(details?.sport_name ?? ''),
      sport_id: Number.isFinite(sportIdValue) ? sportIdValue : undefined,
      sport_entity: sportEntity.filter(entity => entity.entity_id > 0 && entity.entity_name),
    };
  };

  const getDocumentLinks = (documentPath?: string) => {
    if (!documentPath) return [];
    return documentPath
      .split(',,,')
      .map(path => path.trim())
      .filter(path => path)
      .map(path => ({
        path,
        fileName: path.split('/').pop() || path,
      }));
  };


  const hasPrefetchedForCurrentId = Boolean(
    prefetchedPlayerDetails &&
    String(prefetchedPlayerDetails?.playerId ?? '') === String(id ?? '')
  );

  const isBrowserReload = useMemo(() => {
    if (typeof window === 'undefined') return false;

    const navigationEntries = window.performance.getEntriesByType?.('navigation') as PerformanceNavigationTiming[];
    if (navigationEntries && navigationEntries.length > 0) {
      return navigationEntries[0].type === 'reload';
    }

    const legacyNavigation = (window.performance as Performance & {
      navigation?: { type?: number };
    }).navigation;

    return legacyNavigation?.type === 1;
  }, []);

  useEffect(() => {
    if (!isBrowserReload || handledReloadDefaultTabRef.current) return;

    handledReloadDefaultTabRef.current = true;
    setActiveTab('overview');
    handledNoteIdRef.current = null;

    if (noteIdParam) {
      const next = new URLSearchParams(searchParams);
      next.delete('noteId');
      setSearchParams(next, { replace: true });
    }
  }, [isBrowserReload, noteIdParam, searchParams, setSearchParams]);

  const playerDetailsQuery = useQuery({
    queryKey: ['player-details', id],
    queryFn: () => fetchPlayerById(String(id)),
    enabled: Boolean(id) && (!hasPrefetchedForCurrentId || isBrowserReload),
    initialData: hasPrefetchedForCurrentId ? prefetchedPlayerDetails : undefined,
    staleTime: 0,
    refetchOnMount: true,
  });

  const handleNotesMutationSuccess = async () => {
    await playerDetailsQuery.refetch();
  };

  const handleTaskOperationSuccess = async () => {
    await playerDetailsQuery.refetch();
    setTaskTabRemountKey(prev => prev + 1);
  };

  const playerDetailsData = playerDetailsQuery.data;

  const [profileContracts, setProfileContracts] = useState<Contract[]>([]);

  useEffect(() => {
    if (!id) {
      setProfileContracts([]);
      return;
    }

    let cancelled = false;
    const loadContracts = async () => {
      try {
        const rows = await fetchProfileContractsByPlayer(String(id));
        if (cancelled) return;
        setProfileContracts(Array.isArray(rows) ? rows : []);
      } catch (err) {
        console.error('Failed to load player contracts', err);
        if (!cancelled) setProfileContracts([]);
      }
    };

    loadContracts();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const overviewData = useMemo(
    () => (playerDetailsData ? mapOverviewFromApi(playerDetailsData) : null),
    [playerDetailsData]
  );

  const apiPlayerReviews = useMemo(
    () => (playerDetailsData && id ? mapApiReviews(playerDetailsData, id) : []),
    [playerDetailsData, id]
  );

  const mapApiEmails = (data: any, playerId?: string) => {
    if (!Array.isArray(data?.player_all_emails)) return [] as any[];
    return (data.player_all_emails as any[]).map(e => ({
      emailId: String(e?.emailId ?? e?.EmailId ?? ''),
      playerId: String(playerId ?? e?.playerId ?? ''),
      clubId: e?.clubId ?? e?.ClubId ?? undefined,
      recipientEmail: e?.recipientEmail ?? e?.RecipientEmail ?? '',
      subject: e?.subject ?? e?.Subject ?? '',
      body: e?.body ?? e?.Body ?? '',
      sentByScoutId: e?.sentByScoutId ?? e?.SentByScoutId ?? '',
      sentAt: e?.sentAt ? String(e.sentAt) : (e?.SentAt ? String(e.SentAt) : ''),
    }));
  };

  const apiPlayerEmails = useMemo(
    () => (playerDetailsData && id ? mapApiEmails(playerDetailsData, id) : []),
    [playerDetailsData, id]
  );

  const apiNotes = useMemo(
    () => (playerDetailsData && id ? mapApiNotes(playerDetailsData, id) : []),
    [playerDetailsData, id]
  );

  const combinedNotes = useMemo(() => {
    return [...apiNotes, ...notes];
  }, [apiNotes, notes]);

  const apiPlayerSportDetails = useMemo(
    () => {
      if (!playerDetailsData) return null;
      // API returns sport details under `player_sport_details` (snake_case) or `playerSportDetails`.
      const raw = playerDetailsData.player_sport_details ?? playerDetailsData.playerSportDetails ?? playerDetailsData.player_sport_details ?? null;
      return mapPlayerSportDetailsFromApi(raw);
    },
    [playerDetailsData]
  );

  const validTabValues = useMemo(
    () => new Set(['overview', 'contracts', 'reviews', 'private', 'medical', 'technical', 'performance', 'documents', 'tasks', 'emails', 'ai-plan', 'commercial']),
    []
  );

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (!tabParam) return;

    if (tabParam === 'commercial') {
      setActiveTab('contracts');
      return;
    }

    if (tabParam && validTabValues.has(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams, validTabValues]);

  // If URL contains ?edit=true, request the page to open the Edit modal
  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setShouldOpenEditFromQuery(true);
    }
  }, [searchParams]);

  const fullPlayerDetails = useMemo(() => {
    if (!playerDetailsData || !id) return null;
    const base = players.find(p => String(p.id) === id) ?? {} as Player;
    return {
      ...base,
      id: playerDetailsData.playerId ?? base.id ?? id,
      playerId: playerDetailsData.playerId ?? base.playerId ?? id,
      fullName: playerDetailsData.playerName ?? base.fullName ?? '',
      dateOfBirth: playerDetailsData.dateOfBirth ?? '',
      nationality: playerDetailsData.nationality ?? base.nationality ?? '',
      preferredFoot: playerDetailsData.preferredFoot ?? '',
      heightCm: playerDetailsData.heightCm ?? 0,
      weightKg: playerDetailsData.weightKg ?? 0,
      contact_info: playerDetailsData.contactInfo ?? playerDetailsData.contact_info ?? '',
      agentName: playerDetailsData.agentName,
      currentClub: playerDetailsData.currentClubId ?? base.currentClub ?? '',
      currentClubName: playerDetailsData.currentClubName ?? base.clubName ?? '',
      contractStart: playerDetailsData.contractStartDate ?? playerDetailsData.contractStart ?? '',
      contractEnd: playerDetailsData.contractEndDate ?? playerDetailsData.contractEnd ?? '',
      contractStartWithCoach: playerDetailsData.contractStartWithCoach ?? '',
      contractEndWithCoach: playerDetailsData.contractEndWithCoach ?? '',
      position: playerDetailsData.position ?? playerDetailsData.positionCode ?? base.position ?? '',
      sportId: playerDetailsData.sportId ?? base.sportId,
      sportName: playerDetailsData.sportName ?? base.sportName,
      // include extended/profile fields so Edit modal shows current DB values
      player_email: playerDetailsData.playerEmail ?? playerDetailsData.player_email ?? base.player_email ?? '',
      gender: playerDetailsData.gender ?? base.gender ?? '',
      placeOfBirth: playerDetailsData.placeOfBirth ?? playerDetailsData.place_of_birth ?? base.placeOfBirth ?? '',
      primaryLanguage: playerDetailsData.primaryLanguage ?? playerDetailsData.primary_language ?? base.primaryLanguage ?? '',
      secondaryLanguage: playerDetailsData.secondaryLanguage ?? playerDetailsData.secondary_language ?? base.secondaryLanguage ?? '',
      profileVisibility: playerDetailsData.profileVisibility ?? playerDetailsData.profile_visibility ?? base.profileVisibility ?? true,
      phoneNumber: playerDetailsData.phoneNumber ?? playerDetailsData.phone_number ?? base.phoneNumber ?? '',
      alternatePhone: playerDetailsData.alternatePhone ?? playerDetailsData.alternate_phone ?? base.alternatePhone ?? '',
      emergencyContactName: playerDetailsData.emergencyContactName ?? playerDetailsData.emergency_contact_name ?? base.emergencyContactName ?? '',
      emergencyContactNumber: playerDetailsData.emergencyContactNumber ?? playerDetailsData.emergency_contact_number ?? base.emergencyContactNumber ?? '',
      addressLine1: playerDetailsData.addressLine1 ?? playerDetailsData.address_line1 ?? base.addressLine1 ?? '',
      addressLine2: playerDetailsData.addressLine2 ?? playerDetailsData.address_line2 ?? base.addressLine2 ?? '',
      city: playerDetailsData.city ?? base.city ?? '',
      state: playerDetailsData.state ?? base.state ?? '',
      country: playerDetailsData.country ?? base.country ?? '',
      postalCode: playerDetailsData.postalCode ?? playerDetailsData.postal_code ?? base.postalCode ?? '',
      secondaryPosition: playerDetailsData.secondaryPosition ?? playerDetailsData.secondary_position ?? base.secondaryPosition ?? '',
      jerseyNumber: playerDetailsData.jerseyNumber ?? playerDetailsData.jersey_number ?? base.jerseyNumber ?? undefined,
      experienceYears: playerDetailsData.experienceYears ?? playerDetailsData.experience_years ?? base.experienceYears ?? undefined,
      playingLevel: playerDetailsData.playingLevel ?? playerDetailsData.playing_level ?? base.playingLevel ?? '',
      dominantSide: playerDetailsData.dominantSide ?? playerDetailsData.dominant_side ?? base.dominantSide ?? '',
      fitnessLevel: playerDetailsData.fitnessLevel ?? playerDetailsData.fitness_level ?? base.fitnessLevel ?? '',
      injuryStatus: playerDetailsData.injuryStatus ?? playerDetailsData.injury_status ?? base.injuryStatus ?? '',
      coachEmail: playerDetailsData.coachEmail ?? playerDetailsData.coach_email ?? base.coachEmail ?? '',
      coachPhone: playerDetailsData.coachPhone ?? playerDetailsData.coach_phone ?? base.coachPhone ?? '',
      agent_scout_id: playerDetailsData.agentScoutId ?? playerDetailsData.agent_scout_id ?? base.agent_scout_id ?? '',
      scoutId: playerDetailsData.scoutId ?? base.scoutId,
      scoutName: playerDetailsData.scoutName ?? base.scoutName,
      profileImage: playerDetailsData.profileImageUrl ?? playerDetailsData.profile_image_url ?? playerDetailsData.profileImage ?? base.profileImage ?? '',
    } as Player;
  }, [playerDetailsData, players, id]);

  useEffect(() => {
    if (!shouldOpenEditFromQuery) return;
    if (!id) {
      setShouldOpenEditFromQuery(false);
      return;
    }

    // Prefer fully fetched details when available
    if (fullPlayerDetails) {
      setEditPlayer(fullPlayerDetails);
      setShouldOpenEditFromQuery(false);
      return;
    }

    const found = players.find(p => String(p.id) === String(id));
    if (found) {
      setEditPlayer(found as any);
      setShouldOpenEditFromQuery(false);
      return;
    }
  }, [shouldOpenEditFromQuery, id, fullPlayerDetails, players]);

  useEffect(() => {
    if (!noteIdParam) {
      handledNoteIdRef.current = null;
      return;
    }

    if (handledNoteIdRef.current === noteIdParam) return;

    // Try to resolve a preferred tab from the note, but always open the modal
    // when a noteId is present to avoid race conditions while notes load.
    const note = combinedNotes.find(n => n.noteId === noteIdParam);
    const rawTargetTab = String(note?.category ?? '');
    const targetTab = rawTargetTab === 'commercial' ? 'contracts' : rawTargetTab;

    if (targetTab && validTabValues.has(targetTab)) {
      setActiveTab(targetTab);
    } else {
      setActiveTab('notes');
    }

    // Keep handledNoteIdRef to avoid reprocessing the same noteId repeatedly.
    handledNoteIdRef.current = noteIdParam;

    // Prevent immediate close events emitted by the Dialog on mount from
    // being treated as user-initiated closes. Allow closing after a short delay.
    closeAllowedRef.current = false;
    if (closeAllowTimerRef.current) window.clearTimeout(closeAllowTimerRef.current);
    // use window.setTimeout to get a numeric id
    closeAllowTimerRef.current = window.setTimeout(() => { closeAllowedRef.current = true; closeAllowTimerRef.current = null; }, 150) as unknown as number;
  }, [noteIdParam, combinedNotes, validTabValues]);

  const loadPlayersSimplified = useCallback(async (sportId?: number) => {
    try {
      const data = await fetchPlayersSimplified(sportId);
      setPlayersSimplified(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load simplified players', err);
    }
  }, []);

  const handleTabChange = (nextTab: string) => {
    const normalizedTab = nextTab === 'commercial' ? 'contracts' : nextTab;
    setActiveTab(normalizedTab);

    if (normalizedTab === 'emails' && id && !isPlayer) {
      loadEmailsByPlayer(String(id));
    }

    if (normalizedTab === 'tasks' && id && !isPlayer) {
      loadPlayersSimplified();
    }
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);

  const handleReviewAddedSuccess = async () => {
    await playerDetailsQuery.refetch();
    setReviewRefreshKey((prev) => prev + 1);
  };

  const handleDocumentUploadSuccess = async () => {
    await playerDetailsQuery.refetch();
    setReviewRefreshKey((prev) => prev + 1);
  };

  const formatOverviewDate = (value?: string) => {
    if (!value) return 'N/A';
    try {
      return format(new Date(value), 'MMM d, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const generatePdf = async () => {
    const topElement = document.getElementById('player-profile-header');
    const tabElement = document.getElementById(`player-tab-${activeTab}`);
    if (!topElement || !tabElement) {
      console.error('No elements found for PDF generation');
      return;
    }

    // Create a temporary container for PDF content
    const pdfContainer = document.createElement('div');
    pdfContainer.style.width = '800px'; // Fixed width for consistent PDF
    pdfContainer.style.padding = '20px';
    pdfContainer.style.backgroundColor = 'white';
    pdfContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    // Clone and append header
    const headerClone = topElement.cloneNode(true) as HTMLElement;
    // Remove buttons from header
    const buttons = headerClone.querySelector('.no-print');
    if (buttons) buttons.remove();
    pdfContainer.appendChild(headerClone);

    // Add some spacing
    const spacer = document.createElement('div');
    spacer.style.height = '20px';
    pdfContainer.appendChild(spacer);

    // Clone and append tab content
    const tabClone = tabElement.cloneNode(true) as HTMLElement;
    pdfContainer.appendChild(tabClone);

    // Temporarily add to DOM for html2canvas
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
    pdfContainer.style.top = '-9999px';
    document.body.appendChild(pdfContainer);

    try {
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        pdf.addPage();
        position -= pageHeight - margin * 2;
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      pdf.save(`${(player?.fullName || 'player').replace(/\s+/g, '_')}_${activeTab}.pdf`);
    } finally {
      document.body.removeChild(pdfContainer);
    }
  };

  const player = (players.find(p => String(p.id) === id) ?? fullPlayerDetails) as Player | null;
  const isOwnPlayerProfile = Boolean(
    player &&
    user?.email &&
    (player.player_email || '').trim().toLowerCase() === (user.email || '').trim().toLowerCase()
  );
  // Scout can edit/manage players when granted manage permission or when assigned
  const loggedInScout = isScout
    ? scouts.find(s => (s.email || '').trim().toLowerCase() === (user?.email || '').trim().toLowerCase())
    : null;
  const isAssignedPlayer = Boolean(isScout && loggedInScout && String(player?.agent_scout_id) === String(loggedInScout.scoutId));
  const canEditPlayer = hasPermission(user?.role, 'players:manage') || (isPlayer && isOwnPlayerProfile) || isAssignedPlayer;
  const canManagePlayerCrud = hasPermission(user?.role, 'players:manage') || isAssignedPlayer;

  const noteOwnerId = String(overviewData?.playerId || id || '');

  const mergedPlayerNotes = useMemo(() => {
    const noteMap = new Map<string, import('@/types').Note>();
    apiNotes
      .filter(note => String(note.playerId || '') === noteOwnerId)
      .forEach(note => noteMap.set(String(note.noteId), note));
    notes
      .filter(note => String(note.playerId || '') === noteOwnerId)
      .forEach(note => noteMap.set(String(note.noteId), note));
    return Array.from(noteMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [apiNotes, notes, noteOwnerId]);

  const visiblePlayerNoteCounts = useMemo(() => {
    const counts = NOTE_CATEGORIES.reduce((acc, c) => {
      acc[c.value] = 0;
      return acc;
    }, {} as Record<NoteCategory, number>);

    if (!isPlayer) return counts;

    mergedPlayerNotes
      .filter(note => (note.isVisibleToPlayer ?? false))
      .forEach(note => {
        const cat = note.category as NoteCategory;
        if (cat && counts[cat] !== undefined) counts[cat] += 1;
      });

    return counts;
  }, [mergedPlayerNotes, isPlayer]);

  const currentPlayerNotesSignature = useMemo(() => {
    if (!id) return '';
    return notes
      .filter(note => String(note.playerId || '') === String(id))
      .map(note => [
        String(note.noteId || ''),
        String(note.category || ''),
        String(note.topic || ''),
        String(note.description || ''),
        String(note.followUpDate || ''),
        String(note.isVisibleToPlayer ?? false),
        String(note.createdAt || ''),
      ].join('::'))
      .sort()
      .join('|');
  }, [notes, id]);

  const noteSignatureTrackerRef = useRef<{ playerId: string; signature: string } | null>(null);

  useEffect(() => {
    if (!id) return;

    const previous = noteSignatureTrackerRef.current;
    if (!previous || previous.playerId !== id) {
      noteSignatureTrackerRef.current = { playerId: id, signature: currentPlayerNotesSignature };
      return;
    }

    if (previous.signature !== currentPlayerNotesSignature) {
      noteSignatureTrackerRef.current = { playerId: id, signature: currentPlayerNotesSignature };
      void playerDetailsQuery.refetch();
    }
  }, [id, currentPlayerNotesSignature, playerDetailsQuery]);

  const playerDocs = (playerDetailsData?.player_all_documents ?? []) as Array<{
    documentId: string; documentName: string; documentType: string;
    documentDate?: string; fileSizeLabel: string; isVisibleToPlayer: boolean;
  }>;
  const visiblePlayerDocs = isPlayer ? playerDocs.filter(d => d.isVisibleToPlayer) : playerDocs;

  const apiPlayerTasks = useMemo(() =>
    (playerDetailsData?.player_all_tasks ?? []).map((t: any) => ({
      taskId: String(t.taskId ?? ''),
      title: t.title ?? '',
      description: t.description ?? '',
      playerId: String(id),
      clubId: undefined,
      assignedToScoutId: t.assignedToScoutId ?? '',
      assignedToID: t.assignedToID ?? '',
      assignedToName: t.assignedToName ?? '',
      dueDate: t.dueDate ?? '',
      status: t.status ?? 'open',
      source: t.source ?? 'manual',
      createdAt: t.createdAt ?? '',
    })),
    [playerDetailsData, id]
  );

  const visiblePlayerDocumentCount = useMemo(() => {
    if (isPlayer) {
      return playerDocs.filter(d => d.isVisibleToPlayer).length;
    }
    return playerDocs.length;
  }, [playerDocs, isPlayer]);

  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const handleDownloadDocument = async (docId: string, docName: string) => {
    try {
      setDownloadingDocId(docId);
      const result = await downloadDocumentApi(docId);
      if (!result.fileData) return;
      const link = document.createElement('a');
      link.href = `data:application/octet-stream;base64,${result.fileData}`;
      link.download = result.documentName || docName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingDocId(null);
    }
  };
  const assignedScout = (() => {
    if (overviewData?.scoutName) return { scoutName: overviewData.scoutName };
    const scoutIdToFind = overviewData?.scoutId ?? player?.agent_scout_id ?? (player as any)?.scoutId;
    if (!scoutIdToFind) return undefined;
    return scouts.find(s => String(s.scoutId) === String(scoutIdToFind));
  })();


  const resolvedPlayerId = String(player?.id || overviewData?.playerId || id || '');

  const currentClub = clubs?.find(
    c => String(c.clubId) === String(player?.currentClub)
  );

  const contextPlayerReviews = useMemo(() => {
    return reviews.filter(r => String(r.playerId) === String(id)).sort((a, b) => {
      const aTime = a.matchDate ? new Date(a.matchDate).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.matchDate ? new Date(b.matchDate).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [reviews, id]);

  const playerReviews: PlayerReviewViewModel[] = useMemo(() => {
    if (apiPlayerReviews.length > 0) return apiPlayerReviews;
    return contextPlayerReviews as PlayerReviewViewModel[];
  }, [apiPlayerReviews, contextPlayerReviews]);

  const playerSportId = useMemo(() => {
    const sportIdCandidate = fullPlayerDetails?.sportId ?? player?.sportId;
    if (sportIdCandidate === undefined || sportIdCandidate === null) return undefined;
    const parsedSportId = Number(sportIdCandidate);
    return Number.isFinite(parsedSportId) ? parsedSportId : undefined;
  }, [fullPlayerDetails?.sportId, player?.sportId]);

  const avgRatings = getAverageRatings(playerReviews, sportActivities);
  const overallAvg = calculateOverallAverage(avgRatings);
  const contractStatus = overviewData?.contractStatus || (player ? getContractStatus(player) : 'Available');

  const playerRatingCategories = useMemo(() => {
    const playerActivities = sportActivities.filter(a => Number(a.sportId) === playerSportId);
    return playerActivities.length > 0 ? getRatingCategories(playerActivities) : [];
  }, [sportActivities, playerSportId]);

  const playerRatingActivities = useMemo(() => {
    const apiSportEntities = apiPlayerSportDetails?.sport_entity ?? [];
    if (apiSportEntities.length > 0) {
      return apiSportEntities.map(entity => ({
        activityId: entity.entity_id,
        key: activityNameToKey(entity.entity_name),
        label: entity.entity_name,
      }));
    }

    const playerActivities = sportActivities.filter(a => Number(a.sportId) === playerSportId);
    return playerActivities.map(a => ({
      activityId: a.activityId ?? 0,
      key: activityNameToKey(a.activityName),
      label: a.activityName,
    }));
  }, [apiPlayerSportDetails, sportActivities, playerSportId]);

  const playerSportScouts = useMemo(
    () => scouts.filter(s => !s.sportId || Number(s.sportId) === playerSportId),
    [scouts, playerSportId]
  );

  const reviewScoutOptions = useMemo(() => {
    const apiScouts = playerDetailsData?.playerDetailsOtherData?.playerDetailsScoutData;
    if (Array.isArray(apiScouts) && apiScouts.length > 0) {
      return apiScouts.map((s: any) => ({
        scoutId: String(s?.scoutId ?? ''),
        scoutName: String(s?.scoutName ?? ''),
        email: scouts.find(ctx => String(ctx.scoutId) === String(s?.scoutId))?.email,
      }));
    }

    return playerSportScouts.map((s) => ({
      scoutId: String(s.scoutId ?? ''),
      scoutName: String(s.scoutName ?? ''),
      email: s.email,
    }));
  }, [playerDetailsData, playerSportScouts, scouts]);

  const reviewClubOptions = useMemo(() => {
    const apiClubs = playerDetailsData?.playerDetailsOtherData?.playerDetailsClubData;
    if (Array.isArray(apiClubs) && apiClubs.length > 0) {
      return apiClubs.map((c: any) => ({
        clubId: String(c?.clubId ?? ''),
        clubName: String(c?.clubName ?? ''),
      }));
    }

    return clubs.map((c) => ({
      clubId: String(c.clubId ?? ''),
      clubName: String(c.clubName ?? ''),
    }));
  }, [playerDetailsData, clubs]);

  const playerSportPositions = useMemo(
    () => playerPositions.filter(p => !p.sportId || Number(p.sportId) === playerSportId),
    [playerPositions, playerSportId]
  );

  const editScoutOptions = useMemo(() => {
    const apiScouts = playerDetailsData?.playerDetailsOtherData?.playerDetailsScoutData;
    if (Array.isArray(apiScouts) && apiScouts.length > 0) {
      return apiScouts.map((s: any) => ({
        scoutId: String(s?.scoutId ?? ''),
        scoutName: String(s?.scoutName ?? ''),
        email: scouts.find(ctx => String(ctx.scoutId) === String(s?.scoutId))?.email,
      }));
    }
    return playerSportScouts.map((s) => ({
      scoutId: String(s.scoutId ?? ''),
      scoutName: String(s.scoutName ?? ''),
      email: s.email,
    }));
  }, [playerDetailsData, playerSportScouts, scouts]);

  const editPositionOptions = useMemo(() => {
    const apiPositions = playerDetailsData?.playerDetailsOtherData?.playerDetailsPositionData;
    if (Array.isArray(apiPositions) && apiPositions.length > 0) {
      return apiPositions.map((p: any) => ({
        positionId: String(p?.positionId ?? ''),
        positionName: String(p?.positionName ?? ''),
        positionCode: String(p?.positionCode ?? ''),
        sportId: p?.positionForSportId != null ? Number(p.positionForSportId) : undefined,
      } as PlayerPosition));
    }
    return playerSportPositions;
  }, [playerDetailsData, playerSportPositions]);

  const editSportOptions = useMemo(() => {
    const apiSports = playerDetailsData?.playerDetailsOtherData?.playerDetailsSportsData;
    if (Array.isArray(apiSports) && apiSports.length > 0) {
      return apiSports.map((s: any) => ({
        sportId: Number(s?.sportId ?? 0),
        sportName: String(s?.sportName ?? ''),
      } as Sport));
    }
    return sports;
  }, [playerDetailsData, sports]);

  const emailScoutOptions = useMemo(() => {
    const apiScouts = playerDetailsData?.playerDetailsOtherData?.playerDetailsScoutData;
    if (Array.isArray(apiScouts) && apiScouts.length > 0) {
      return apiScouts.map((s: any) => ({
        scoutId: String(s?.scoutId ?? ''),
        scoutName: String(s?.scoutName ?? ''),
        email: scouts.find(ctx => String(ctx.scoutId) === String(s?.scoutId))?.email,
      }));
    }
    return playerSportScouts.map((s) => ({
      scoutId: String(s.scoutId ?? ''),
      scoutName: String(s.scoutName ?? ''),
      email: s.email,
    }));
  }, [playerDetailsData, playerSportScouts, scouts]);

  const emailTemplateOptions = useMemo(() =>
    (playerDetailsData?.playerDetailsOtherData?.playerDetailsTemplate ?? []).map((t: any) => ({
      templateId: String(t.templateId ?? ''),
      templateName: String(t.templateName ?? ''),
      templateType: String(t.templateType ?? ''),
      subject: String(t.subject ?? ''),
      body: String(t.body ?? ''),
    })),
    [playerDetailsData]
  );

  const taskScoutOptions = useMemo(() => {
    const apiScouts = playerDetailsData?.playerDetailsOtherData?.playerDetailsScoutData;
    if (Array.isArray(apiScouts) && apiScouts.length > 0) {
      return apiScouts.map((s: any) => ({
        scoutId: String(s?.scoutId ?? ''),
        scoutName: String(s?.scoutName ?? ''),
        email: scouts.find(ctx => String(ctx.scoutId) === String(s?.scoutId))?.email,
      }));
    }
    return scouts;
  }, [playerDetailsData, scouts]);

  const taskClubOptions = useMemo(() => {
    const apiClubs = playerDetailsData?.playerDetailsOtherData?.playerDetailsClubData;
    if (Array.isArray(apiClubs) && apiClubs.length > 0) {
      return apiClubs.map((c: any) => ({
        clubId: String(c?.clubId ?? ''),
        clubName: String(c?.clubName ?? ''),
      }));
    }
    return clubs;
  }, [playerDetailsData, clubs]);

  if (playerDetailsQuery.isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground mt-2">Loading player profile...</p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Player not found</p>
        <Link to="/players" className="text-primary underline">Back to players</Link>
      </div>
    );
  }

  return (
    <div key={reviewRefreshKey} className="space-y-6 animate-fade-in">
      <div id="player-profile-header" className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <Link to="/players"><Button variant="ghost" size="icon"><ArrowLeft size={18} /></Button></Link>

        {/* Player Profile Image */}
        <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
          {(() => {
            const placeholder = 'https://static.vecteezy.com/system/resources/thumbnails/078/424/696/small/simple-flat-silhouette-user-profile-account-contact-symbol-icon-vector.jpg';
            const src = player?.profileImage || (playerDetailsData?.profileImageUrl ?? playerDetailsData?.profile_image_url ?? playerDetailsData?.profileImage) || placeholder;
            return (
              <img
                src={src}
                alt={overviewData?.playerName || player?.fullName || 'Player'}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = placeholder; }}
              />
            );
          })()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{overviewData?.playerName || player?.fullName || 'Player'}</h1>
              <ContractBadge status={contractStatus as any} />
              <Badge variant="outline">{player?.position}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-1">
              <span className="truncate">{overviewData?.currentClubName || 'N/A'}</span>
              <span className="hidden sm:inline">·</span>
              <span className="truncate">{player?.nationality || 'N/A'}</span>
              {assignedScout && <span className="truncate">· {companyShortName || 'Coach'}: {assignedScout.scoutName}</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-start md:justify-center gap-2 no-print">

          {isAdmin && (
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete Player</DialogTitle>
                </DialogHeader>

                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    Are you sure you want to delete this player?
                  </p>

                  <div className="bg-muted p-3 rounded-md space-y-1">
                    <p><span className="font-medium">Name:</span> {overviewData?.playerName || player?.fullName || 'Player'}</p>
                    <p><span className="font-medium">Club:</span> {overviewData?.currentClubName || 'N/A'}</p>
                    <p><span className="font-medium">Position:</span> {overviewData?.position || player?.position || 'N/A'}</p>
                  </div>

                  <p className="text-xs text-red-500">
                    This action cannot be undone.
                  </p>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                    Cancel
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={async () => {
                      await deletePlayer(player.id);
                      setDeleteOpen(false);
                      navigate('/players');
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={!!editPlayer} onOpenChange={() => setEditPlayer(null)}>
            <DialogContent className="max-w-[60%] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Player</DialogTitle>
              </DialogHeader>

              {editPlayer && (
                <EditPlayerForm
                  player={fullPlayerDetails && String(fullPlayerDetails.id) === String(editPlayer.id) ? fullPlayerDetails : editPlayer}
                  onClose={() => setEditPlayer(null)}
                  onUpdate={async (p) => {
                    const result = await updatePlayer(p);
                    try {
                      await playerDetailsQuery.refetch();
                    } catch (e) {
                      console.error('Failed to refetch player details after update', e);
                    }
                    return result;
                  }}
                  scouts={editScoutOptions}
                  clubs={playerDetailsData?.playerDetailsOtherData?.playerDetailsClubData ?? clubs}
                  isScout={isScout}
                  isPlayer={isPlayer}
                  playerPositions={editPositionOptions}
                  sports={editSportOptions}
                  companyShortName={companyShortName}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* ADD THIS */}
          {canEditPlayer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditPlayer(fullPlayerDetails ?? player)}
            >
              <Pencil size={14} className="mr-1" />
              Edit
            </Button>
          )}

          {isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={14} />
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={generatePdf}>
            <Printer size={14} className="mr-1" /> Export PDF
          </Button>

        </div>
      </div>



      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="no-print flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {(isAdmin || isScout || profileContracts.length > 0) && <TabsTrigger value="contracts">Contracts ({profileContracts.length})</TabsTrigger>}
          {(isPlayer || isAdmin || isScout || apiPlayerReviews.length > 0) && <TabsTrigger value="reviews">Reviews ({apiPlayerReviews.length})</TabsTrigger>}
          {(isAdmin || isScout || mergedPlayerNotes.filter(n => n.category === 'private').length > 0) && <TabsTrigger value="private">Private</TabsTrigger>}
          {(isAdmin || isScout || mergedPlayerNotes.filter(n => n.category === 'medical').length > 0) && <TabsTrigger value="medical">Medical</TabsTrigger>}
          {(isAdmin || isScout || mergedPlayerNotes.filter(n => n.category === 'technical').length > 0) && <TabsTrigger value="technical">Technical</TabsTrigger>}
          {(isAdmin || isScout || mergedPlayerNotes.filter(n => n.category === 'performance').length > 0) && <TabsTrigger value="performance">Performance</TabsTrigger>}
          {(isAdmin || isScout || visiblePlayerDocumentCount > 0) && <TabsTrigger value="documents">Documents</TabsTrigger>}
          {(isAdmin || isScout || apiPlayerTasks.length > 0) && <TabsTrigger value="tasks">Tasks</TabsTrigger>}
          {(isAdmin || isScout || (playerDetailsData?.player_all_emails ?? []).length > 0) && <TabsTrigger value="emails">Email History</TabsTrigger>}
          {/* AI plan tab remains shown only when data exists in AiPlanModule or for admin/scout */}
          {(isAdmin || isScout) && <TabsTrigger value="ai-plan">AI Plan</TabsTrigger>}
        </TabsList>

        <TabsContent id="player-tab-overview" value="overview" className="mt-4">
          <div className="space-y-6">

            {/* ══ PERSONAL DETAILS ══ */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </span>
                  <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                    Personal Details
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  {[
                    { label: 'Full Name', value: overviewData?.playerName || player?.fullName || 'N/A' },
                    { label: 'Player Email', value: (player && ((player as any).player_email || (player as any).playerEmail)) || 'N/A' },
                    { label: 'Date of Birth', value: formatOverviewDate(overviewData?.dateOfBirth) || 'N/A' },
                    { label: 'Gender', value: (player && (player.gender || 'N/A')) || 'N/A' },
                    { label: 'Place of Birth', value: (player && (player.placeOfBirth || 'N/A')) || 'N/A' },
                    { label: 'Nationality', value: overviewData?.nationality || player?.nationality || 'N/A' },
                    { label: 'Primary Language', value: (player && (player.primaryLanguage || 'N/A')) || 'N/A' },
                    { label: 'Secondary Language', value: (player && (player.secondaryLanguage || 'N/A')) || 'N/A' },
                    {
                      label: 'Profile Visible',
                      value: typeof player?.profileVisibility === 'boolean'
                        ? (player!.profileVisibility ? 'Yes' : 'No')
                        : String(player?.profileVisibility ?? 'N/A')
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-0.5 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
                      <span className="text-sm font-medium text-foreground break-words">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ══ CONTACT & ADDRESS ══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Contact */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92V19a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3 4.18 2 2 0 0 1 5 2h2.09a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>
                    <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Contact</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border overflow-hidden divide-y divide-border text-sm">
                    {[
                      { label: 'Phone Number', value: player?.phoneNumber || 'N/A' },
                      { label: 'Alternate Phone', value: player?.alternatePhone || 'N/A' },
                      { label: 'Emergency Contact', value: player?.emergencyContactName ? `${player.emergencyContactName} (${player.emergencyContactNumber || 'N/A'})` : 'N/A' },

                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
                        <span className="text-sm font-medium text-right break-all">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Address */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                    </span>
                    <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Address</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border overflow-hidden divide-y divide-border text-sm">
                    {[
                      { label: 'Address Line 1', value: player?.addressLine1 || 'N/A' },
                      { label: 'Address Line 2', value: player?.addressLine2 || 'N/A' },
                      { label: 'City', value: player?.city || 'N/A' },
                      { label: 'State', value: player?.state || 'N/A' },
                      { label: 'Country', value: player?.country || 'N/A' },
                      { label: 'Postal Code', value: player?.postalCode || 'N/A' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
                        <span className="text-sm font-medium text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ══ CLUB & COACH + ATHLETIC PROFILE ══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Club & Coach */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </span>
                    <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Club & Coach</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border overflow-hidden divide-y divide-border text-sm">
                    {[
                      { label: 'Current Club', value: overviewData?.currentClubName || currentClub?.clubName || player?.currentClub || 'N/A' },
                      { label: 'Coach', value: overviewData?.scoutName || assignedScout?.scoutName || player?.agentName || player?.agent_scout_id || 'N/A' },
                      { label: 'Coach Email', value: player?.coachEmail || 'N/A' },
                      { label: 'Coach Phone', value: player?.coachPhone || 'N/A' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
                        <span className="text-sm font-medium text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Athletic Profile */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="13" cy="4" r="1" />
                        <path d="M9 20l3-6 2 2 3-5" />
                        <path d="M6 12l3-2 2 1" />
                      </svg>
                    </span>
                    <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Athletic Profile</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border overflow-hidden divide-y divide-border text-sm">
                    {[
                      { label: 'Sport', value: overviewData?.sportName || player?.sportName || 'N/A' },
                      { label: 'Position', value: overviewData?.position || player?.position || 'N/A' },
                      { label: 'Secondary Position', value: player?.secondaryPosition || 'N/A' },
                      { label: 'Preferred Foot', value: overviewData?.preferredFoot || player?.preferredFoot || 'N/A' },
                      { label: 'Dominant Side', value: player?.dominantSide || 'N/A' },
                      { label: 'Jersey Number', value: player?.jerseyNumber ? String(player.jerseyNumber) : 'N/A' },
                      { label: 'Height', value: (player?.heightCm ?? overviewData?.heightCm) ? `${player?.heightCm ?? overviewData?.heightCm} cm` : 'N/A' },
                      { label: 'Weight', value: (player?.weightKg ?? overviewData?.weightKg) ? `${player?.weightKg ?? overviewData?.weightKg} kg` : 'N/A' },
                      { label: 'Experience (years)', value: player?.experienceYears ? String(player.experienceYears) : 'N/A' },
                      { label: 'Playing Level', value: player?.playingLevel || 'N/A' },
                      { label: 'Fitness Level', value: player?.fitnessLevel || 'N/A' },
                      { label: 'Injury Status', value: player?.injuryStatus || 'N/A' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
                        <span className="text-sm font-medium text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ══ AVERAGE RATINGS — has data ══ */}
            {(overviewData?.activityRatings?.length ?? 0) > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </span>
                    <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Average Ratings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {overviewData?.activityRatings.map(activity => (
                      <div
                        key={activity.activityId}
                        className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3"
                      >
                        <p className="text-xs font-medium text-muted-foreground truncate">{activity.activityName}</p>
                        <div className="flex items-center gap-2">
                          <StarRating value={Math.round(activity.averageRating ?? 0)} readonly size={14} />
                          <span className="text-sm font-semibold">{(activity.averageRating ?? 0).toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-5" />

                  <div className="flex items-center gap-3 px-1">
                    <span className="text-sm font-medium text-muted-foreground">Overall Rating</span>
                    <div className="flex items-center gap-2">
                      <StarRating value={Math.round(overviewData?.overallRating ?? 0)} readonly size={16} />
                      <span className="text-lg font-bold text-primary">
                        {(overviewData?.overallRating ?? 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ══ AVERAGE RATINGS — empty state ══ */}
            {(overviewData?.activityRatings?.length ?? 0) === 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </span>
                    <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Average Ratings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground">No activity ratings available in overview response.</p>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </TabsContent>

        <TabsContent id="player-tab-reviews" value="reviews" className="mt-4 space-y-4">
          {canManagePlayerCrud && (
            <div className="flex justify-end">
              <AddReviewDialog playerId={resolvedPlayerId} scouts={reviewScoutOptions} clubs={reviewClubOptions} onAdd={addReview} ratingActivities={playerRatingActivities} onSuccess={handleReviewAddedSuccess} />
            </div>
          )}
          {playerReviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No reviews yet. Add a coaching review to get started.</p>
          ) : (
            <div className="space-y-4">
              {playerReviews.map(review => {
                const scout = scouts.find(s => s.scoutId === review.scoutId);
                const scoutName = review.scoutName || scout?.scoutName || review.scoutId || 'Unknown Scout';
                const club1Name = review.club1Name || clubs.find(c => c.clubId === review.club1Id)?.clubName;
                const club2Name = review.club2Name || clubs.find(c => c.clubId === review.club2Id)?.clubName;
                return (
                  <Card key={review.reviewId}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <User size={14} className="text-muted-foreground" />
                          <span className="font-medium">{scoutName}</span>
                          <span className="text-muted-foreground">·</span>
                          <Calendar size={14} className="text-muted-foreground" />
                          <span className="text-muted-foreground">{review.matchDate ? format(new Date(review.matchDate), 'MMM d, yyyy') : 'N/A'}</span>
                          {club1Name && club2Name && (
                            <span className="text-xs text-muted-foreground">({club1Name} vs {club2Name})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {
                            (() => {
                              const reviewRatings = review.revRatings ?? buildRatingsFromActivityRows(review, sportActivities);
                              const displayOverall = Number.isFinite(Number(review.averageRating))
                                ? Number(review.averageRating)
                                : calculateOverallAverage(reviewRatings);
                              return (
                                <>
                                  <StarRating value={Math.round(displayOverall)} readonly size={14} />
                                  <span className="text-sm font-bold">{displayOverall.toFixed(1)}</span>
                                </>
                              );
                            })()
                          }
                        </div>
                      </div>
                      {
                        (() => {
                          const reviewRatings = review.revRatings ?? buildRatingsFromActivityRows(review, sportActivities);
                          const activityLookup = new Map<number, any>(
                            (review.revRatingActivities ?? []).map(activity => [activity.activityId, activity])
                          );
                          const activityNameLookup = new Map<number, string>(
                            (review.activities ?? []).map(activity => [activity.activityId, activity.activityName])
                          );

                          return (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {playerRatingCategories.map(cat => {
                                const activity = sportActivities.find(a => Number(a.sportId) === playerSportId && activityNameToKey(a.activityName) === cat.key);
                                const activityRating = activity ? activityLookup.get(activity.activityId ?? 0) : undefined;
                                const ratingValue = activityRating ? Number(activityRating.rating) : ((reviewRatings as any)[cat.key] ?? 0);
                                const label = activity && activity.activityId !== undefined
                                  ? (activityNameLookup.get(activity.activityId) || cat.label)
                                  : cat.label;

                                return (
                                  <div key={cat.key}>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">{label}</span>
                                      <StarRating value={ratingValue} readonly size={10} />
                                    </div>
                                    {activityRating?.comment && (
                                      <p className="text-[10px] text-muted-foreground mt-0.5 italic">{activityRating.comment}</p>
                                    )}
                                    {activityRating?.ratingFollowupDate && (
                                      <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Follow-up: {format(new Date(activityRating.ratingFollowupDate), 'MMM d, yyyy')}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()
                      }
                      {playerRatingCategories.length === 0 && (review.activities?.length ?? 0) > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                          {(review.activities ?? []).map(activity => (
                            <div key={`${review.reviewId}-${activity.activityId}`}>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{activity.activityName}</span>
                                <StarRating value={Math.round(Number(activity.rating || 0))} readonly size={10} />
                              </div>
                              {activity.comment && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 italic">{activity.comment}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {review.notes && <p className="text-sm text-muted-foreground mt-3 italic">"{review.notes}"</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>


        {(!isPlayer || visiblePlayerNoteCounts.private > 0) && (
          <TabsContent id="player-tab-private" value="private" className="mt-4">
            <NotesModule entityType="player" entityId={resolvedPlayerId} filterCategory="private" readOnly={isPlayer || !canManagePlayerCrud} apiNotes={mergedPlayerNotes} onNotesChanged={handleNotesMutationSuccess} />
          </TabsContent>
        )}

        {(!isPlayer || visiblePlayerNoteCounts.medical > 0) && (
          <TabsContent id="player-tab-medical" value="medical" className="mt-4">
            <NotesModule entityType="player" entityId={resolvedPlayerId} filterCategory="medical" readOnly={isPlayer || !canManagePlayerCrud} apiNotes={mergedPlayerNotes} onNotesChanged={handleNotesMutationSuccess} />
          </TabsContent>
        )}

        {(!isPlayer || visiblePlayerNoteCounts.technical > 0) && (
          <TabsContent id="player-tab-technical" value="technical" className="mt-4">
            <NotesModule entityType="player" entityId={resolvedPlayerId} filterCategory="technical" readOnly={isPlayer || !canManagePlayerCrud} apiNotes={mergedPlayerNotes} onNotesChanged={handleNotesMutationSuccess} />
          </TabsContent>
        )}

        {(!isPlayer || visiblePlayerNoteCounts.performance > 0) && (
          <TabsContent id="player-tab-performance" value="performance" className="mt-4 space-y-6">
            <NotesModule entityType="player" entityId={resolvedPlayerId} filterCategory="performance" readOnly={isPlayer || !canManagePlayerCrud} apiNotes={mergedPlayerNotes} onNotesChanged={handleNotesMutationSuccess} />
            {playerReviews.length > 0 && playerRatingCategories.length > 0 && <DevPlanSection player={player} avgRatings={avgRatings} ratingCategories={playerRatingCategories} />}
          </TabsContent>
        )}

        <TabsContent id="player-tab-tasks" value="tasks" className="mt-4">
          <TaskTimeline key={taskTabRemountKey} entityType="player" entityId={resolvedPlayerId} readOnly={!canManagePlayerCrud} apiTasks={apiPlayerTasks} apiScouts={taskScoutOptions} apiClubs={taskClubOptions} playerOptions={playersSimplified} onTaskOperationSuccess={handleTaskOperationSuccess} />
        </TabsContent>

        {(!isPlayer || visiblePlayerDocumentCount > 0) && (
          <TabsContent id="player-tab-documents" value="documents" className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center gap-3">
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {DOCUMENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {canManagePlayerCrud && <div className="w-full sm:w-auto"><DocumentDialog playerId={resolvedPlayerId} onUpload={addDocument} onSuccess={handleDocumentUploadSuccess} /></div>}
            </div>

            {visiblePlayerDocs.filter(d => selectedDocType === 'ALL' || d.documentType?.toLowerCase() === selectedDocType.toLowerCase()).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {visiblePlayerDocs
                  .filter(d => selectedDocType === 'ALL' || d.documentType?.toLowerCase() === selectedDocType.toLowerCase())
                  .map(doc => (
                    <Card key={doc.documentId}>
                      <CardContent className="p-3 flex flex-col md:flex-row md:items-center gap-3">
                        <FileText size={18} className="text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium break-words">
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(doc.documentId, doc.documentName)}
                              disabled={downloadingDocId === doc.documentId}
                              className="text-sm font-medium text-blue-600 hover:underline cursor-pointer break-words disabled:opacity-50"
                            >
                              {doc.documentName}
                              {downloadingDocId === doc.documentId
                                ? <span className="inline-block ml-2 text-xs">...</span>
                                : <Download size={16} className="inline-block ml-2" />}
                            </button>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc.documentType} · {doc.fileSizeLabel} · {doc.documentDate ? format(new Date(doc.documentDate), 'MMM d, yyyy') : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {canManagePlayerCrud && <DocumentDialog playerId={resolvedPlayerId} onUpload={addDocument} doc={doc} onSuccess={handleDocumentUploadSuccess} />}
                          {canManagePlayerCrud && <DeleteDocumentDialog doc={doc} />}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent id="player-tab-emails" value="emails" className="mt-4">
          <EmailModule entityType="player" entityId={player.id} readOnly={!canManagePlayerCrud} overrideScouts={emailScoutOptions} overrideTemplates={emailTemplateOptions as any} apiEmails={apiPlayerEmails as any} />
        </TabsContent>

        {!isPlayer && (
          <TabsContent id="player-tab-ai-plan" value="ai-plan" className="mt-4">
            <AiPlanModule playerId={player.id} reviews={playerReviews} />
          </TabsContent>
        )}

        <TabsContent id="player-tab-contracts" value="contracts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Contracts</CardTitle>
            </CardHeader>
            <CardContent>
              {profileContracts.length === 0 ? (
                <p className="text-muted-foreground">No contracts found for this player.</p>
              ) : (
                <div className="space-y-4">
                  {profileContracts.map((contract) => (
                    <Card key={contract.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h4 className="font-semibold">
                            {(contract.party1Name || contract.party1Type)} ↔ {(contract.party2Name || contract.party2Type)}
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Start Date:</span>
                              <span className="ml-2">{new Date(contract.startDate).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">End Date:</span>
                              <span className="ml-2">{new Date(contract.endDate).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Contract Type:</span>
                              <Badge variant="secondary" className="ml-2">
                                {contract.contractType}
                              </Badge>
                            </div>
                          </div>
                          {contract.contractDetails && (
                            <div>
                              <span className="text-muted-foreground">Details:</span>
                              <p className="mt-1 text-sm">{contract.contractDetails}</p>
                            </div>
                          )}
                          {getDocumentLinks(contract.documentPath).length > 0 && (
                            <div>
                              <span className="text-muted-foreground">Documents:</span>
                              <div className="mt-1 space-y-1">
                                {getDocumentLinks(contract.documentPath).map((doc) => (
                                  <a
                                    key={doc.path}
                                    href={`https://localhost:7001${doc.path}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={doc.fileName}
                                    className="block ml-2 text-sm text-blue-600 hover:underline"
                                  >
                                    {doc.fileName}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NoteViewDialog
        noteId={noteIdParam || undefined}
        note={noteIdParam ? combinedNotes.find(n => n.noteId === noteIdParam) : undefined}
        open={openNoteModal}
        onNoteChanged={handleNotesMutationSuccess}
        onOpenChange={(v) => {
          if (!v) {
            // Only remove noteId when closing is allowed (avoid spurious mount-close events)
            if (!closeAllowedRef.current) return;
            const next = new URLSearchParams(searchParams);
            next.delete('noteId');
            setSearchParams(next, { replace: true });
          }
        }}
      />
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div><p className="text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>
);

const AddReviewDialog = ({ playerId, scouts, clubs, onAdd, ratingActivities, onSuccess }: { playerId: string | number; scouts: any[]; clubs: any[]; onAdd: (r: any) => void; ratingActivities: { activityId: number; key: string; label: string }[]; onSuccess?: () => Promise<void> | void }) => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const defaultScout = scouts.find(s => (s.email || '').trim().toLowerCase() === (user?.email || '').trim().toLowerCase());
  const [scoutId, setScoutId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [club1Id, setClub1Id] = useState('');
  const [club2Id, setClub2Id] = useState('');
  const [notes, setNotes] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>(() =>
    ratingActivities.reduce((acc, activity) => {
      acc[activity.key] = 0;
      return acc;
    }, {} as Record<string, number>)
  );
  const [skillDetails, setSkillDetails] = useState<Record<string, { comment: string; followUpDate: string }>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setScoutId(defaultScout?.scoutId || '');
      setMatchDate('');
      setClub1Id('');
      setClub2Id('');
      setNotes('');
      setIsTraining(false);
      setRatings(
        ratingActivities.reduce((acc, activity) => {
          acc[activity.key] = 0;
          return acc;
        }, {} as Record<string, number>)
      );
      setSkillDetails({});
      setErrors({});
    }
  }, [open, ratingActivities]);

  // Validate club selection when training toggle changes
  useEffect(() => {
    if (!isTraining && club1Id && club2Id && club1Id === club2Id) {
      setErrors(prev => ({ ...prev, club2Id: 'Same club selected. Enable Training mode or choose different clubs.' }));
    } else {
      setErrors(prev => ({ ...prev, club2Id: '' }));
    }
  }, [isTraining, club1Id, club2Id]);

  const updateSkillDetail = (key: string, field: string, value: string) => {
    setSkillDetails(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const [submitting, setSubmitting] = useState(false);
  const hasRatingCategories = ratingActivities.length > 0;

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};

    if (!scoutId.trim()) nextErrors.scoutId = 'Required field';
    // Club validation now handled by useEffect when training toggle changes
    // matchDate validation intentionally disabled - handled elsewhere
    // if (!matchDate.trim()) nextErrors.matchDate = 'Required field';
    // club1/club2 validations intentionally disabled to allow empty values
    // if (!club1Id.trim()) nextErrors.club1Id = 'Required field';
    // if (!club2Id.trim()) nextErrors.club2Id = 'Required field';

    if (hasRatingCategories) {
      const invalidRating = ratingActivities.some(activity => !(ratings[activity.key] >= 1 && ratings[activity.key] <= 5));
      if (invalidRating) {
        nextErrors.ratings = 'Please rate every sport activity between 1 and 5.';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const details: Record<string, any> = {};
    Object.entries(skillDetails).forEach(([k, v]) => {
      if (v.comment || v.followUpDate) {
        details[k] = {
          rating: ratings[k] ?? 0,
          comment: v.comment || undefined,
          followUpDate: v.followUpDate || undefined,
        };
      }
    });

    const ratingRows = ratingActivities.map(activity => ({
      activityId: activity.activityId,
      rating: ratings[activity.key] ?? 0,
      comment: skillDetails[activity.key]?.comment || undefined,
      ratingFollowupDate: skillDetails[activity.key]?.followUpDate ? new Date(skillDetails[activity.key].followUpDate) : undefined,
    }));

    setSubmitting(true);
    try {
      await onAdd({
        reviewId: crypto.randomUUID(),
        playerId,
        scoutId,
        matchDate,
        club1Id: club1Id || undefined,
        club2Id: club2Id || undefined,
        ...(hasRatingCategories ? { revRatings: ratings, revRatingActivities: ratingRows } : {}),
        revSkillDetails: Object.keys(details).length > 0 ? details : undefined,
        notes,
        createdAt: new Date().toISOString(),
      });
      if (onSuccess) {
        await onSuccess();
      }
      setOpen(false);
      setScoutId(''); setMatchDate(''); setClub1Id(''); setClub2Id(''); setNotes(''); setIsTraining(false);
      setRatings(
        ratingActivities.reduce((acc, activity) => {
          acc[activity.key] = 0;
          return acc;
        }, {} as Record<string, number>)
      );
      setSkillDetails({});
      setErrors({});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus size={14} className="mr-1" /> Add Review</Button></DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Coaching Review</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Coach <span className="text-red-500">*</span></Label>
            <Select value={scoutId} onValueChange={value => { setScoutId(value); setErrors(prev => ({ ...prev, scoutId: '' })); }}>
              <SelectTrigger><SelectValue placeholder="Select Coach" /></SelectTrigger>
              <SelectContent>
                {scouts.map(s => <SelectItem key={s.scoutId} value={s.scoutId}>{s.scoutName}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.scoutId && <p className="text-xs text-destructive mt-1">{errors.scoutId}</p>}
          </div>

          <div>
            <Label>Match Date <span className="text-red-500"></span></Label>
            <Input type="date" value={matchDate} onChange={e => { setMatchDate(e.target.value); setErrors(prev => ({ ...prev, matchDate: '' })); }} />
            {/* {errors.matchDate && <p className="text-xs text-destructive mt-1">{errors.matchDate}</p>} */}
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="training-mode" checked={isTraining} onCheckedChange={setIsTraining} />
            <Label htmlFor="training-mode">Training Review</Label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Club 1</Label>
              <Select value={club1Id} onValueChange={value => { setClub1Id(value); setErrors(prev => ({ ...prev, club1Id: '' })); }}>
                <SelectTrigger><SelectValue placeholder="Select club" /></SelectTrigger>
                <SelectContent>
                  {clubs
                    .filter(c => isTraining || c.clubId !== club2Id)
                    .map(c => (
                      <SelectItem key={c.clubId} value={c.clubId}>
                        {c.clubName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.club1Id && <p className="text-xs text-destructive mt-1">{errors.club1Id}</p>}
            </div>
            <div>
              <Label>Club 2</Label>
              <Select value={club2Id} onValueChange={value => { setClub2Id(value); setErrors(prev => ({ ...prev, club2Id: '' })); }}>
                <SelectTrigger><SelectValue placeholder="Select club" /></SelectTrigger>
                <SelectContent>
                  {clubs
                    .filter(c => isTraining || c.clubId !== club1Id)
                    .map(c => (
                      <SelectItem key={c.clubId} value={c.clubId}>
                        {c.clubName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.club2Id && <p className="text-xs text-destructive mt-1">{errors.club2Id}</p>}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Ratings</Label>
            {hasRatingCategories ? (
              ratingActivities.map(activity => (
                <div key={activity.key} className="space-y-1 border-b border-border pb-2">
                  <div className="flex items-center justify-end">
                    {/* <span className="text-sm">{activity.label}</span> */}

                    <div className="flex items-center gap-9">
                      {/* <Label className="text-xs">follow-up date</Label> */}
                      <StarRating value={(ratings as any)[activity.key] ?? 0} onChange={v => setRatings(prev => ({ ...prev, [activity.key]: v }))} size={18} />
                    </div>

                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-sm">{activity.label}</span>
                      <Input placeholder="Comment..." className="text-xs h-7" value={skillDetails[activity.key]?.comment || ''} onChange={e => updateSkillDetail(activity.key, 'comment', e.target.value)} />
                    </div>
                    <div>
                      <span className="text-xs">Follow-up date</span>
                      <Input type="date" className="text-xs h-7" placeholder="Follow-up" value={skillDetails[activity.key]?.followUpDate || ''} onChange={e => updateSkillDetail(activity.key, 'followUpDate', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-destructive">No rating entity is configured for this player's sport. Ratings cannot be recorded until sport-specific ratings are defined.</p>
            )}
            {errors.ratings && <p className="text-sm text-destructive">{errors.ratings}</p>}
          </div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Match observations..." /></div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DevPlanSection = ({ player, avgRatings, ratingCategories }: { player: any; avgRatings: Ratings; ratingCategories: { key: string; label: string }[] }) => {
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">AI Development Plan</h3>
        <Button size="sm" onClick={() => setPlan(generateDevPlan(player, avgRatings, ratingCategories))}>
          <Brain size={14} className="mr-1" /> {plan ? 'Regenerate' : 'Generate Plan'}
        </Button>
      </div>

      {plan && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-xs text-muted-foreground">Generated: {format(new Date(plan.generatedAt), 'MMM d, yyyy HH:mm')}</p>
          {plan.goals.map((goal, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{goal.category}</h4>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Current: {goal.currentRating}</span>
                    <span>→</span>
                    <span className="text-primary font-medium">Target: {goal.targetRating}</span>
                  </div>
                </div>
                <ul className="space-y-1">
                  {goal.actions.map((action, j) => (
                    <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span> {action}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-sm mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {plan.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span> {r}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

const EditPlayerForm = ({
  player,
  onClose,
  onUpdate,
  scouts,
  clubs,
  isScout,
  isPlayer,
  playerPositions,
  sports
  , companyShortName
}: {
  player: Player;
  onClose: () => void;
  // onUpdate: (p: Player) => Promise<void>;
  onUpdate: (p: Player) => Promise<Player>;
  scouts: any[];
  clubs: any[];
  isScout: boolean;
  isPlayer: boolean;
  playerPositions: PlayerPosition[];
  sports: Sport[];
  companyShortName?: string | null;
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const resolveClubId = (p: Player, clubList: any[]): string => {
    if (p.currentClub && String(p.currentClub) !== '0') return String(p.currentClub);
    const clubName = (p as any).currentClubName ?? (p as any).clubName;
    if (!clubName) return '';
    const matched = clubList.find(c => (c.clubName || '').trim().toLowerCase() === String(clubName).trim().toLowerCase());
    return matched ? String(matched.clubId) : '';
  };

  const resolveScoutId = (p: Player, scoutList: any[]): string => {
    if (p.agent_scout_id && String(p.agent_scout_id) !== '0') return String(p.agent_scout_id);
    const scoutName = (p as any).scoutName;
    if (!scoutName) return '';
    const matched = scoutList.find(s => (s.scoutName || '').trim().toLowerCase() === String(scoutName).trim().toLowerCase());
    return matched ? String(matched.scoutId) : '';
  };

  const [form, setForm] = useState({
    fullName: player.fullName || '',
    dateOfBirth: player.dateOfBirth || '',
    nationality: player.nationality || '',
    position: player.position || 'CF',
    preferredFoot: player.preferredFoot || 'Right',
    height: String(player.heightCm || ''),
    weight: String(player.weightKg || ''),
    currentClub: resolveClubId(player, clubs),
    contractStart: player.contractStart || '',
    contractEnd: player.contractEnd || '',
    agentName: player.agentName || '',
    agent_scout_id: player.agent_scout_id || (player as any).agentScoutId || resolveScoutId(player, scouts),
    contact_info: player.contact_info || '',
    playerEmail: (player as any).player_email ?? (player as any).playerEmail ?? '',
    profileImage: player.profileImage || '',
    sportId: String(player.sportId || ''),
    contractStartWithCoach: player.contractStartWithCoach || '',
    contractEndWithCoach: player.contractEndWithCoach || '',
    // new fields
    gender: player.gender || '',
    placeOfBirth: player.placeOfBirth || '',
    primaryLanguage: player.primaryLanguage || '',
    secondaryLanguage: player.secondaryLanguage || '',
    profileVisibility: player.profileVisibility ?? true,
    phoneNumber: player.phoneNumber || '',
    alternatePhone: player.alternatePhone || '',
    emergencyContactName: player.emergencyContactName || '',
    emergencyContactNumber: player.emergencyContactNumber || '',
    addressLine1: player.addressLine1 || '',
    addressLine2: player.addressLine2 || '',
    city: player.city || '',
    state: player.state || '',
    country: player.country || '',
    postalCode: player.postalCode || '',
    secondaryPosition: player.secondaryPosition || '',
    jerseyNumber: player.jerseyNumber ? String(player.jerseyNumber) : '',
    experienceYears: player.experienceYears ? String(player.experienceYears) : '',
    playingLevel: player.playingLevel || '',
    dominantSide: player.dominantSide || '',
    fitnessLevel: player.fitnessLevel || '',
    injuryStatus: player.injuryStatus || '',
    coachEmail: player.coachEmail || '',
    coachPhone: player.coachPhone || '',
  });

  useEffect(() => {
    setForm({
      fullName: player.fullName || '',
      dateOfBirth: player.dateOfBirth || '',
      nationality: player.nationality || '',
      position: player.position || 'CF',
      preferredFoot: player.preferredFoot || 'Right',
      height: String(player.heightCm || ''),
      weight: String(player.weightKg || ''),
      currentClub: resolveClubId(player, clubs),
      contractStart: player.contractStart || '',
      contractEnd: player.contractEnd || '',
      agentName: player.agentName || '',
      agent_scout_id: player.agent_scout_id || (player as any).agentScoutId || resolveScoutId(player, scouts),
      contact_info: player.contact_info || '',
      playerEmail: (player as any).player_email ?? (player as any).playerEmail ?? '',
      profileImage: player.profileImage || '',
      sportId: String(player.sportId || ''),
      contractStartWithCoach: player.contractStartWithCoach || '',
      contractEndWithCoach: player.contractEndWithCoach || '',
      gender: player.gender || '',
      placeOfBirth: player.placeOfBirth || '',
      primaryLanguage: player.primaryLanguage || '',
      secondaryLanguage: player.secondaryLanguage || '',
      profileVisibility: player.profileVisibility ?? true,
      phoneNumber: player.phoneNumber || '',
      alternatePhone: player.alternatePhone || '',
      emergencyContactName: player.emergencyContactName || '',
      emergencyContactNumber: player.emergencyContactNumber || '',
      addressLine1: player.addressLine1 || '',
      addressLine2: player.addressLine2 || '',
      city: player.city || '',
      state: player.state || '',
      country: player.country || '',
      postalCode: player.postalCode || '',
      secondaryPosition: player.secondaryPosition || '',
      jerseyNumber: player.jerseyNumber ? String(player.jerseyNumber) : '',
      experienceYears: player.experienceYears ? String(player.experienceYears) : '',
      playingLevel: player.playingLevel || '',
      dominantSide: player.dominantSide || '',
      fitnessLevel: player.fitnessLevel || '',
      injuryStatus: player.injuryStatus || '',
      coachEmail: player.coachEmail || '',
      coachPhone: player.coachPhone || '',
    });
  }, [player, clubs, scouts]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const editFilteredPositions = useMemo(
    () => form.sportId
      ? playerPositions.filter(p => !p.sportId || String(p.sportId) === form.sportId)
      : playerPositions,
    [playerPositions, form.sportId]
  );

  const editFilteredScouts = useMemo(
    () => form.sportId
      ? scouts.filter(s => !s.sportId || String(s.sportId) === form.sportId || String(s.scoutId) === form.agent_scout_id)
      : scouts,
    [scouts, form.sportId, form.agent_scout_id]
  );

  const update = (field: string, value: any) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'sportId') {
        next.agent_scout_id = '';
      }
      return next;
    });
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};

    if (!form.fullName.trim()) nextErrors.fullName = 'Required field';
    if (!form.nationality.trim()) nextErrors.nationality = 'Required field';
    if (!form.dateOfBirth.trim()) nextErrors.dateOfBirth = 'Required field';
    if (!form.preferredFoot.trim()) nextErrors.preferredFoot = 'Required field';
    if (!form.height.trim()) nextErrors.height = 'Required field';
    if (!form.weight.trim()) nextErrors.weight = 'Required field';
    // if (!form.contractStart.trim()) nextErrors.contractStart = 'Required field';
    // if (!form.contractEnd.trim()) nextErrors.contractEnd = 'Required field';
    if (isFieldEditable('agent_scout_id') && !form.agent_scout_id.trim()) nextErrors.agent_scout_id = 'Required field';
    // if (!form.contact_info.trim()) nextErrors.contact_info = 'Required field';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    // Update player first
    const updatedPlayer = await onUpdate({
      ...player,
      fullName: form.fullName,
      dateOfBirth: form.dateOfBirth || null,
      nationality: form.nationality,
      position: form.position,
      preferredFoot: form.preferredFoot,
      heightCm: Number(form.height) || 0,
      weightKg: Number(form.weight) || 0,
      currentClub: form.currentClub,
      contractStart: form.contractStart || null,
      contractEnd: form.contractEnd || null,
      contractStartWithCoach: form.contractStartWithCoach || null,
      contractEndWithCoach: form.contractEndWithCoach || null,
      agentName: form.agentName,
      agent_scout_id: form.agent_scout_id || '',
      contact_info: form.contact_info,
      player_email: form.playerEmail || null,
      sportId: form.sportId ? Number(form.sportId) : undefined,
      // new profile/contact fields (camelCase keys)
      gender: form.gender || null,
      placeOfBirth: form.placeOfBirth || null,
      primaryLanguage: form.primaryLanguage || null,
      secondaryLanguage: form.secondaryLanguage || null,
      profileVisibility: !!form.profileVisibility,
      phoneNumber: form.phoneNumber || null,
      alternatePhone: form.alternatePhone || null,
      emergencyContactName: form.emergencyContactName || null,
      emergencyContactNumber: form.emergencyContactNumber || null,
      addressLine1: form.addressLine1 || null,
      addressLine2: form.addressLine2 || null,
      city: form.city || null,
      state: form.state || null,
      country: form.country || null,
      postalCode: form.postalCode || null,
      secondaryPosition: form.secondaryPosition || null,
      jerseyNumber: form.jerseyNumber ? Number(form.jerseyNumber) : null,
      experienceYears: form.experienceYears ? Number(form.experienceYears) : null,
      playingLevel: form.playingLevel || null,
      dominantSide: form.dominantSide || null,
      fitnessLevel: form.fitnessLevel || null,
      injuryStatus: form.injuryStatus || null,
      coachEmail: form.coachEmail || null,
      coachPhone: form.coachPhone || null,
      updatedAt: new Date().toISOString(),
    });

    // Upload image if selected
    if (imageFile) {
      try {
        // const res = await uploadPlayerImageApi(player.id, imageFile);
        const res = await uploadPlayerImageApi(updatedPlayer.id, imageFile);

        const imageUrl = res.imageUrl;
        // const imageUrl = res.data.imageUrl;

        // Save image URL
        // await onUpdate({
        //   ...player,
        //   profileImage: imageUrl,
        // });
        await onUpdate({
          ...updatedPlayer,
          profileImage: imageUrl,
        });
        // parent `onUpdate` triggers refetch; no direct refetch here
      } catch (err) {
        console.error("Image upload failed", err);
      }
    }

    onClose();
  };

  const scoutEditableFields = [
    'currentClub',
    'contractStart',
    'contractEnd',
    'agentName',
    'sportId'
  ];

  const isFieldEditable = (field: string) => {
    if (isScout) return scoutEditableFields.includes(field);
    if (isPlayer) {
      const restricted = ['contractStart', 'contractEnd', 'contractStartWithCoach', 'contractEndWithCoach', 'agent_scout_id', 'currentClub', 'agentName'];
      return !restricted.includes(field);
    }
    return true;
  };

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

  const goNext = () => {
    if (!isLastTab) {
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  return (
    <div className="w-full bg-background rounded-xl border border-border overflow-hidden">
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
                src={form.profileImage || 'https://static.vecteezy.com/system/resources/thumbnails/078/424/696/small/simple-flat-silhouette-user-profile-account-contact-symbol-icon-vector.jpg'}
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
                  setImageFile(file);
                  const previewUrl = URL.createObjectURL(file);
                  update('profileImage', previewUrl);

                  // Immediately upload the selected image
                  (async () => {
                    try {
                      setIsUploadingImage(true);
                      const playerId = String((player as any).id ?? (player as any).playerId ?? '');
                      const res = await uploadPlayerImageApi(playerId, file);
                      const imageUrl = res?.imageUrl ?? (res as any)?.data?.imageUrl ?? '';

                      if (imageUrl) {
                        update('profileImage', imageUrl);
                        try {
                          const payload = {
                            ...player,
                            profileImage: imageUrl,
                            agent_scout_id: form.agent_scout_id || (player as any).agent_scout_id || (player as any).agentScoutId || ''
                          } as any;
                          await onUpdate(payload);
                        } catch (e) { /* ignore */ }
                        // parent `onUpdate` triggers refetch; no direct refetch here
                      }
                    } catch (err) {
                      console.error('Immediate image upload failed', err);
                    } finally {
                      setIsUploadingImage(false);
                    }
                  })();
                }}
                disabled={!isFieldEditable('profileImage')}
              />
            </div>
          </div>

          {/* Identity */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Identity</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3">
                <Label>Full Name <span className="text-destructive">*</span></Label>
                <Input value={form.fullName} onChange={e => update('fullName', e.target.value)} disabled={!isFieldEditable('fullName')} />
                {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <Label>Date of Birth <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.dateOfBirth || ''} onChange={e => update('dateOfBirth', e.target.value)} disabled={!isFieldEditable('dateOfBirth')} />
                {errors.dateOfBirth && <p className="text-xs text-destructive mt-1">{errors.dateOfBirth}</p>}
              </div>

              <div>
                <Label>Nationality <span className="text-destructive">*</span></Label>
                <Input value={form.nationality} onChange={e => update('nationality', e.target.value)} disabled={!isFieldEditable('nationality')} />
                {errors.nationality && <p className="text-xs text-destructive mt-1">{errors.nationality}</p>}
              </div>

              <div>
                <Label>Player Email</Label>
                <Input value={form.playerEmail} onChange={e => update('playerEmail', e.target.value)} disabled={!isFieldEditable('playerEmail')} />
              </div>

              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => update('gender', v)} disabled={!isFieldEditable('gender')}>
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
                <Input value={form.placeOfBirth} onChange={e => update('placeOfBirth', e.target.value)} disabled={!isFieldEditable('placeOfBirth')} />
              </div>

              <div>
                <Label>Primary Language</Label>
                <Input value={form.primaryLanguage} onChange={e => update('primaryLanguage', e.target.value)} disabled={!isFieldEditable('primaryLanguage')} />
              </div>

              <div>
                <Label>Secondary Language</Label>
                <Input value={form.secondaryLanguage} onChange={e => update('secondaryLanguage', e.target.value)} disabled={!isFieldEditable('secondaryLanguage')} />
              </div>

              <div>
                <Label>Height <span className="text-[13px] text-muted-foreground">(cm)</span> <span className="text-destructive">*</span></Label>
                <Input type="number" value={form.height} onChange={e => update('height', e.target.value)} disabled={!isFieldEditable('height')} />
                {errors.height && <p className="text-xs text-destructive mt-1">{errors.height}</p>}
              </div>

              <div>
                <Label>Weight <span className="text-[13px] text-muted-foreground">(kg)</span> <span className="text-destructive">*</span></Label>
                <Input type="number" value={form.weight} onChange={e => update('weight', e.target.value)} disabled={!isFieldEditable('weight')} />
                {errors.weight && <p className="text-xs text-destructive mt-1">{errors.weight}</p>}
              </div>
            </div>
          </div>

          {/* Sport & Position */}
          {/* <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Sport & Position</p>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Sport</Label>
                <Select value={form.sportId} onValueChange={v => update('sportId', v)} disabled={!isFieldEditable('sportId')}>
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
                <Select value={form.position} onValueChange={v => update('position', v)} disabled={!isFieldEditable('position')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {editFilteredPositions.map(p => (
                      <SelectItem key={p.positionId} value={p.positionCode}>{p.positionName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Secondary Position</Label>
                <Select value={form.secondaryPosition} onValueChange={v => update('secondaryPosition', v)} disabled={!isFieldEditable('secondaryPosition')}>
                  <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                  <SelectContent>
                    {editFilteredPositions.map(p => (
                      <SelectItem key={p.positionId} value={p.positionCode}>{p.positionName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Jersey Number</Label>
                <Input type="number" value={form.jerseyNumber} onChange={e => update('jerseyNumber', e.target.value)} disabled={!isFieldEditable('jerseyNumber')} />
              </div>

              <div>
                <Label>Laterality <span className="text-destructive">*</span></Label>
                <Select value={form.preferredFoot} onValueChange={v => update('preferredFoot', v)} disabled={!isFieldEditable('preferredFoot')}>
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
                <Select value={form.dominantSide} onValueChange={v => update('dominantSide', v)} disabled={!isFieldEditable('dominantSide')}>
                  <SelectTrigger><SelectValue placeholder="Select side" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Left">Left</SelectItem>
                    <SelectItem value="Right">Right</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Playing Level</Label>
                <Select value={form.playingLevel} onValueChange={v => update('playingLevel', v)} disabled={!isFieldEditable('playingLevel')}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Amateur">Amateur</SelectItem>
                    <SelectItem value="Semi-Pro">Semi-Pro</SelectItem>
                    <SelectItem value="Professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Experience <span className="text-[13px] text-muted-foreground">(years)</span></Label>
                <Input type="number" value={form.experienceYears} onChange={e => update('experienceYears', e.target.value)} disabled={!isFieldEditable('experienceYears')} />
              </div>
            </div>
          </div> */}

          {/* Visibility */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Visibility</p>
            <div className="flex items-center gap-2">
              <Switch
                id="profile-visibility"
                checked={form.profileVisibility}
                onCheckedChange={(v: boolean) => update('profileVisibility', !!v)}
                disabled={!isFieldEditable('profileVisibility')}
              />
              <Label htmlFor="profile-visibility">Profile Visible</Label>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Sport & Position ── */}
      {activeTab === 'sport' && (
        <div className="p-6 space-y-6">

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Sport & Position
            </p>

            <div className="grid grid-cols-4 gap-4">

              <div>
                <Label>Sport</Label>
                <Select value={form.sportId} onValueChange={v => update('sportId', v)} disabled={!isFieldEditable('sportId')}>
                  <SelectTrigger><SelectValue placeholder="Select sport" /></SelectTrigger>
                  <SelectContent>
                    {sports.map(s => (
                      <SelectItem key={s.sportId} value={String(s.sportId)}>
                        {s.sportName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Position</Label>
                <Select value={form.position} onValueChange={v => update('position', v)} disabled={!isFieldEditable('position')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {editFilteredPositions.length === 0 ? (
                      <SelectItem value="__no_position__" disabled>No position added.</SelectItem>
                    ) : (
                      editFilteredPositions.map(p => (
                        <SelectItem key={p.positionId} value={p.positionCode}>
                          {p.positionName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Secondary Position</Label>
                <Select value={form.secondaryPosition} onValueChange={v => update('secondaryPosition', v)} disabled={!isFieldEditable('secondaryPosition')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {editFilteredPositions.length === 0 ? (
                      <SelectItem value="__no_position__" disabled>No position added.</SelectItem>
                    ) : (
                      editFilteredPositions.map(p => (
                        <SelectItem key={p.positionId} value={p.positionCode}>
                          {p.positionName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Jersey Number</Label>
                <Input type="number" value={form.jerseyNumber} onChange={e => update('jerseyNumber', e.target.value)} disabled={!isFieldEditable('jerseyNumber')} />
              </div>

              <div>
                <Label>Laterality *</Label>
                <Select value={form.preferredFoot} onValueChange={v => update('preferredFoot', v)} disabled={!isFieldEditable('preferredFoot')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Left">Left</SelectItem>
                    <SelectItem value="Right">Right</SelectItem>
                    <SelectItem value="Both">Ambidextrous</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Dominant Side</Label>
                <Select value={form.dominantSide} onValueChange={v => update('dominantSide', v)} disabled={!isFieldEditable('dominantSide')}>
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
                <Select value={form.playingLevel} onValueChange={v => update('playingLevel', v)} disabled={!isFieldEditable('playingLevel')}>
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
                <Input type="number" value={form.experienceYears} onChange={e => update('experienceYears', e.target.value)} disabled={!isFieldEditable('experienceYears')} />
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ── TAB 2: Contract & Club ── */}
      {activeTab === 'contract' && (
        <div className="p-6 space-y-6">

          {/* Club Assignment */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Club Assignment</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3">
                <Label>Current Club</Label>
                <Select value={form.currentClub} onValueChange={v => update('currentClub', v)} disabled={!isFieldEditable('currentClub')}>
                  <SelectTrigger><SelectValue placeholder="Select club" /></SelectTrigger>
                  <SelectContent>
                    {clubs.map(c => (
                      <SelectItem key={c.clubId} value={String(c.clubId)}>{c.clubName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contract Start/End and Agent Name removed per request */}
            </div>
          </div>

          {/* Coach / Scout Agreement */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              {companyShortName || 'Coach'} Details
            </p>
            <div className="grid grid-cols-3 gap-4">
              {/* Contract Start/End with Coach removed per request */}

              <div>
                <Label>{companyShortName ? `${companyShortName} ` : 'Coach '}<span className="text-destructive">*</span></Label>
                <Select value={form.agent_scout_id} onValueChange={v => update('agent_scout_id', v)} disabled={!isFieldEditable('agent_scout_id')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {editFilteredScouts.map(s => (
                      <SelectItem key={s.scoutId} value={String(s.scoutId)}>{s.scoutName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.agent_scout_id && <p className="text-xs text-destructive mt-1">{errors.agent_scout_id}</p>}
              </div>

              <div>
                <Label>Coach Email</Label>
                <Input value={form.coachEmail} onChange={e => update('coachEmail', e.target.value)} disabled={!isFieldEditable('coachEmail')} />
              </div>

              <div>
                <Label>Coach Phone</Label>
                <Input value={form.coachPhone} onChange={e => update('coachPhone', e.target.value)} disabled={!isFieldEditable('coachPhone')} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Contact & Address ── */}
      {activeTab === 'contact' && (
        <div className="p-6 space-y-6">

          {/* Contact Details */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Contact Details</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Phone Number</Label>
                <Input value={form.phoneNumber} onChange={e => update('phoneNumber', e.target.value)} disabled={!isFieldEditable('phoneNumber')} />
              </div>

              <div>
                <Label>Alternate Phone</Label>
                <Input value={form.alternatePhone} onChange={e => update('alternatePhone', e.target.value)} disabled={!isFieldEditable('alternatePhone')} />
              </div>

              <div>
                <Label>Emergency Contact Name</Label>
                <Input value={form.emergencyContactName} onChange={e => update('emergencyContactName', e.target.value)} disabled={!isFieldEditable('emergencyContactName')} />
              </div>

              <div>
                <Label>Emergency Contact Number</Label>
                <Input value={form.emergencyContactNumber} onChange={e => update('emergencyContactNumber', e.target.value)} disabled={!isFieldEditable('emergencyContactNumber')} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Address</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>Address Line 1</Label>
                <Input value={form.addressLine1} onChange={e => update('addressLine1', e.target.value)} disabled={!isFieldEditable('addressLine1')} />
              </div>

              <div>
                <Label>Address Line 2</Label>
                <Input value={form.addressLine2} onChange={e => update('addressLine2', e.target.value)} disabled={!isFieldEditable('addressLine2')} />
              </div>

              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={e => update('city', e.target.value)} disabled={!isFieldEditable('city')} />
              </div>

              <div>
                <Label>State</Label>
                <Input value={form.state} onChange={e => update('state', e.target.value)} disabled={!isFieldEditable('state')} />
              </div>

              <div>
                <Label>Country</Label>
                <Input value={form.country} onChange={e => update('country', e.target.value)} disabled={!isFieldEditable('country')} />
              </div>

              <div>
                <Label>Postal Code</Label>
                <Input value={form.postalCode} onChange={e => update('postalCode', e.target.value)} disabled={!isFieldEditable('postalCode')} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Athletic Profile ── */}
      {activeTab === 'athletic' && (
        <div className="p-6 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Physical & Fitness</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Fitness Level</Label>
                <Select value={form.fitnessLevel} onValueChange={v => update('fitnessLevel', v)} disabled={!isFieldEditable('fitnessLevel')}>
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
                <Select value={form.injuryStatus} onValueChange={v => update('injuryStatus', v)} disabled={!isFieldEditable('injuryStatus')}>
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

        {/* Previous */}
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>

        {/* Next OR Submit */}
        {!isLastTab ? (
          <Button onClick={goNext}>
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmit}>
            Update Player
          </Button>
        )}

      </div>

    </div>
  );
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

const DeleteDocumentDialog = ({ doc }: { doc: any }) => {
  const { deleteDocument, sportActivities } = useAppContext();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    await deleteDocument(doc.documentId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">Delete</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Document</DialogTitle>
        </DialogHeader>

        <p>Are you sure you want to delete <b>{doc.documentName}</b>?</p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DocumentDialog = ({
  playerId,
  onUpload,
  doc,
  onSuccess,
}: {
  playerId: string;
  onUpload: (file: File, clubId?: string, playerId?: string, type?: string, isVisibleToPlayer?: boolean) => void;
  doc?: any;
  onSuccess?: () => Promise<void> | void;
}) => {
  const { updateDocument, sportActivities } = useAppContext();
  const { user } = useAuth();
  const isPlayerUser = isPlayerRole(user?.role);
  const isScoutUser = isScoutRole(user?.role);
  const isAdminUser = user?.role === 'Admin';
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState(doc?.documentType || '');
  const [isVisibleToPlayer, setIsVisibleToPlayer] = useState(doc?.isVisibleToPlayer ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (doc && open) {
      setType(doc.documentType || '');
      setIsVisibleToPlayer(doc.isVisibleToPlayer ?? false);
    } else if (!doc && open) {
      setType('');
      setIsVisibleToPlayer(false);
    }
    if (open) {
      setFile(null);
      setErrors({});
    }
  }, [doc, open]);

  const isEdit = !!doc;

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};

    if (!type.trim()) nextErrors.type = 'Required field';
    if (!isEdit && !file) nextErrors.file = 'Required field';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (isEdit) {
      let payload: any = {
        documentType: type,
        documentName: doc.documentName,
        clubId: doc.clubId,
        // playerId: doc.playerId,
        playerId: doc.playerId ? String(doc.playerId) : null,
        fileData: doc.fileData,
        fileSizeLabel: doc.fileSizeLabel,
        isVisibleToPlayer,
      };

      if (file) {
        const base64 = await fileToBase64(file);

        payload.fileData = base64.split(',')[1];
        payload.documentName = file.name;
        payload.fileSizeLabel = `${(file.size / 1024).toFixed(1)} KB`;
      }

      await updateDocument(doc.documentId, payload);
      if (onSuccess) await onSuccess();
    } else {
      if (!file) return;
      // onUpload(file, undefined, playerId, type);
      onUpload(file, undefined, String(playerId), type, isVisibleToPlayer);
      if (onSuccess) await onSuccess();
    }

    setOpen(false);
    setFile(null);

    if (isEdit) {
      setType(doc.documentType || '');
      setIsVisibleToPlayer(doc.isVisibleToPlayer ?? false);
    } else {
      setType('');
      setIsVisibleToPlayer(false);
    }
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button size="sm" variant="outline">Edit</Button>
        ) : (
          <Button size="sm">
            <Plus size={14} className="mr-1" /> Upload Document
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Document' : 'Upload Document'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Document Type <span className="text-red-500">*</span></Label>
            <Select value={type} onValueChange={value => { setType(value); setErrors(prev => ({ ...prev, type: '' })); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-destructive mt-1">{errors.type}</p>}
          </div>

          {isEdit && (
            <div className="text-sm">
              <p className="font-medium">{doc.documentName}</p>
              <a
                href={`data:application/octet-stream;base64,${doc.fileData}`}
                download={doc.documentName}
                className="text-blue-600 underline"
              >
                Download Current File
              </a>
            </div>
          )}

          <div>
            <Label>{isEdit ? 'Replace File (optional)' : 'File'} {!isEdit && <span className="text-red-500">*</span>}</Label>
            <Input
              type="file"
              onChange={(e) => { setFile(e.target.files?.[0] || null); setErrors(prev => ({ ...prev, file: '' })); }}
            />
            {errors.file && <p className="text-xs text-destructive mt-1">{errors.file}</p>}
          </div>

          {(isAdminUser || isScoutUser) && (
            <div className="flex items-center gap-2">
              <Switch id="isVisibleToPlayer" checked={isVisibleToPlayer} onCheckedChange={setIsVisibleToPlayer} />
              <Label htmlFor="isVisibleToPlayer">Show this document to player: {isVisibleToPlayer ? 'Yes' : 'No'}</Label>
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full">
            {isEdit ? 'Update' : 'Upload'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerProfile;
