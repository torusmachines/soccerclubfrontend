import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/context/PlayerContext';
import { getContractStatus, getAverageRatings, calculateOverallAverage, generateDevPlan } from '@/lib/playerUtils';
import { NoteCategory, RATING_CATEGORIES, Ratings, DevelopmentPlan, Player, DOCUMENT_TYPES, PlayerPosition } from '@/types';
import { StarRating } from '@/components/StarRating';
import { ContractBadge } from '@/components/ContractBadge';
import { NotesModule } from '@/components/NotesModule';
import { EmailModule } from '@/components/EmailModule';
import { TaskTimeline } from '@/components/TaskTimeline';
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
import { isPlayerRole, isScoutRole } from '@/lib/accessPolicy';
import { fetchContractsByPlayer } from '@/services/apiService';
import type { CommercialContract } from '@/types';

const PlayerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isPlayer = isPlayerRole(user?.role);
  const isAdmin = user?.role === 'Admin';
  const isScout = isScoutRole(user?.role);
  const { players, reviews, scouts, addReview, documents, addDocument, clubs, notes, updatePlayer, deletePlayer, loadDocuments, playerPositions } = useAppContext();

  const [editPlayer, setEditPlayer] = useState<Player | null>(null);
  const [searchParams] = useSearchParams();
  const [shouldOpenEditFromQuery, setShouldOpenEditFromQuery] = useState(false);
  const navigate = useNavigate();

  const [selectedDocType, setSelectedDocType] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [commercialContracts, setCommercialContracts] = useState<CommercialContract[]>([]);

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

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    const loadCommercialContracts = async () => {
      if (id) {
        try {
          const contracts = await fetchContractsByPlayer(id);
          setCommercialContracts(contracts);
        } catch (error) {
          console.error('Failed to load commercial contracts', error);
        }
      }
    };
    loadCommercialContracts();
  }, [id]);

  const [deleteOpen, setDeleteOpen] = useState(false);

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

  const player = players.find(p => String(p.id) === id);
  const isOwnPlayerProfile = Boolean(
    player &&
    user?.email &&
    (player.player_email || '').trim().toLowerCase() === (user.email || '').trim().toLowerCase()
  );
  // Scout can edit players assigned to them (agent_scout_id matches their scoutId)
  const loggedInScout = isScout
    ? scouts.find(s => (s.email || '').trim().toLowerCase() === (user?.email || '').trim().toLowerCase())
    : null;
  const isAssignedPlayer = Boolean(isScout && loggedInScout && String(player?.agent_scout_id) === String(loggedInScout.scoutId));
  const canEditPlayer = isAdmin || (isPlayer && isOwnPlayerProfile) || isAssignedPlayer;
  const canManagePlayerCrud = isAdmin || isAssignedPlayer;

  const visiblePlayerNoteCounts = useMemo(() => {
    const counts: Record<NoteCategory, number> = {
      private: 0,
      medical: 0,
      technical: 0,
      performance: 0,
      meeting: 0,
    };

    if (!isPlayer) return counts;

    notes
      .filter(note => String(note.playerId) === String(id) && (note.isVisibleToPlayer ?? false))
      .forEach(note => {
        if (note.category === 'private') counts.private += 1;
        if (note.category === 'medical') counts.medical += 1;
        if (note.category === 'technical') counts.technical += 1;
        if (note.category === 'performance') counts.performance += 1;
      });

    return counts;
  }, [notes, id, isPlayer]);

  const playerDocs = documents.filter(d => String(d.playerId) === String(id));
  const visiblePlayerDocs = isPlayer ? playerDocs.filter(d => (d.isVisibleToPlayer ?? false)) : playerDocs;

  const visiblePlayerDocumentCount = useMemo(() => {
    if (!isPlayer) return 0;
    return playerDocs.filter(d => (d.isVisibleToPlayer ?? false)).length;
  }, [playerDocs, isPlayer]);
  const assignedScout = scouts.find(s => String(s.scoutId) === String(player.agent_scout_id));


  const currentClub = clubs?.find(
    c => String(c.clubId) === String(player.currentClub)
  );

  // const playerReviews = reviews.filter(r => r.playerId === id).sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());
  const playerReviews = reviews.filter(r => String(r.playerId) === String(id)).sort((a, b) => {
    const aTime = a.matchDate ? new Date(a.matchDate).getTime() : new Date(a.createdAt).getTime();
    const bTime = b.matchDate ? new Date(b.matchDate).getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
  const avgRatings = getAverageRatings(playerReviews);
  const overallAvg = calculateOverallAverage(avgRatings);
  const contractStatus = getContractStatus(player);

  return (
    <div className="space-y-6 animate-fade-in">
      <div id="player-profile-header" className="flex items-center gap-4">
        <Link to="/players"><Button variant="ghost" size="icon"><ArrowLeft size={18} /></Button></Link>

        {/* Player Profile Image */}
        <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
          <img
            src={player.profileImage || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'}
            alt={player.fullName}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1">
          <div className="flex flex-col justify-center h-20">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{player.fullName}</h1>
              <ContractBadge status={contractStatus} />
              <Badge variant="outline">{player.position}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {/* {player.currentClub} · {player.nationality} */}
              {currentClub?.clubName || 'N/A'} · {player.nationality}
              {assignedScout && <> · Scout: {assignedScout.scoutName}</>}
            </p>
          </div>
        </div>
        {/* <Button variant="outline" size="sm" className="no-print" onClick={() => window.print()}>
          <Printer size={14} className="mr-1" /> Print
        </Button> */}
        <div className="flex justify-center gap-2 h-20 no-print">

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
                    <p><span className="font-medium">Name:</span> {player.fullName}</p>
                    <p><span className="font-medium">Club:</span> {player.currentClub}</p>
                    <p><span className="font-medium">Position:</span> {player.position}</p>
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
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Player</DialogTitle>
              </DialogHeader>

              {editPlayer && (
                <EditPlayerForm
                  player={editPlayer}
                  onClose={() => setEditPlayer(null)}
                  onUpdate={updatePlayer}
                  scouts={scouts}
                  clubs={clubs}
                  isScout={isScout}
                  isPlayer={isPlayer}
                  playerPositions={playerPositions}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* ADD THIS */}
          {canEditPlayer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditPlayer(player)}
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



      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="no-print flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {!isPlayer && <TabsTrigger value="reviews">Reviews ({playerReviews.length})</TabsTrigger>}
          {( !isPlayer || visiblePlayerNoteCounts.private > 0 ) && <TabsTrigger value="private">Private</TabsTrigger>}
          {( !isPlayer || visiblePlayerNoteCounts.medical > 0 ) && <TabsTrigger value="medical">Medical</TabsTrigger>}
          {( !isPlayer || visiblePlayerNoteCounts.technical > 0 ) && <TabsTrigger value="technical">Technical</TabsTrigger>}
          {( !isPlayer || visiblePlayerNoteCounts.performance > 0 ) && <TabsTrigger value="performance">Performance</TabsTrigger>}
          {( !isPlayer || visiblePlayerDocumentCount > 0 ) && <TabsTrigger value="documents">Documents</TabsTrigger>}
          {!isPlayer && <TabsTrigger value="tasks">Tasks</TabsTrigger>}
          {!isPlayer && <TabsTrigger value="emails">Email History</TabsTrigger>}
          <TabsTrigger value="commercial">Commercial ({commercialContracts.length})</TabsTrigger>
        </TabsList>

        <TabsContent id="player-tab-overview" value="overview" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Personal Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow label="Date of Birth" value={format(new Date(player.dateOfBirth), 'MMM d, yyyy')} />
                <InfoRow label="Nationality" value={player.nationality} />
                <InfoRow label="Position" value={player.position} />
                <InfoRow label="Preferred Foot" value={player.preferredFoot} />
                <InfoRow label="Height" value={`${player.heightCm} cm`} />
                <InfoRow label="Weight" value={`${player.weightKg} kg`} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Contract & Agent</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                {/* <InfoRow label="Current Club" value={player.currentClub} /> */}
                <InfoRow label="Current Club" value={currentClub?.clubName || 'N/A'} />
                <InfoRow label="Contract Start" value={format(new Date(player.contractStart), 'MMM yyyy')} />
                <InfoRow label="Contract End" value={format(new Date(player.contractEnd), 'MMM yyyy')} />
                <InfoRow label="Status" value={contractStatus} />
                <InfoRow label="Agent" value={player.agentName} />
                <InfoRow label="Contact" value={player.contact_info || 'N/A'} />
              </CardContent>
            </Card>
            {playerReviews.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-sm">Average Ratings</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {RATING_CATEGORIES.map(cat => (
                      <div key={cat.key} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{cat.label}</p>
                        <div className="flex items-center gap-2">
                          <StarRating value={Math.round(avgRatings[cat.key])} readonly size={14} />
                          <span className="text-sm font-medium">{avgRatings[cat.key].toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Overall:</span>
                    <StarRating value={Math.round(overallAvg)} readonly size={16} />
                    <span className="text-lg font-bold text-primary">{overallAvg.toFixed(1)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {!isPlayer && (
          <TabsContent id="player-tab-reviews" value="reviews" className="mt-4 space-y-4">
            {canManagePlayerCrud && (
              <div className="flex justify-end">
                <AddReviewDialog playerId={player.id} scouts={scouts} clubs={clubs} onAdd={addReview} />
              </div>
            )}
            {playerReviews.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No reviews yet. Add a scouting review to get started.</p>
            ) : (
              <div className="space-y-4">
                {playerReviews.map(review => {
                  const scout = scouts.find(s => s.scoutId === review.scoutId);
                  const club1 = clubs.find(c => c.clubId === review.club1Id);
                  const club2 = clubs.find(c => c.clubId === review.club2Id);
                  return (
                    <Card key={review.reviewId}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <User size={14} className="text-muted-foreground" />
                            <span className="font-medium">{scout?.scoutName}</span>
                            <span className="text-muted-foreground">·</span>
                            <Calendar size={14} className="text-muted-foreground" />
                            <span className="text-muted-foreground">{review.matchDate ? format(new Date(review.matchDate), 'MMM d, yyyy') : 'N/A'}</span>
                            {club1 && club2 && (
                              <span className="text-xs text-muted-foreground">({club1.clubName} vs {club2.clubName})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <StarRating value={Math.round(calculateOverallAverage(review.revRatings))} readonly size={14} />
                            <span className="text-sm font-bold">{calculateOverallAverage(review.revRatings).toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {RATING_CATEGORIES.map(cat => (
                            <div key={cat.key}>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{cat.label}</span>
                                <StarRating value={review.revRatings[cat.key]} readonly size={10} />
                              </div>
                              {review.revSkillDetails?.[cat.key]?.comment && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 italic">{review.revSkillDetails[cat.key].comment}</p>
                              )}
                            </div>
                          ))}
                        </div>
                        {review.notes && <p className="text-sm text-muted-foreground mt-3 italic">"{review.notes}"</p>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}

        {( !isPlayer || visiblePlayerNoteCounts.private > 0 ) && (
          <TabsContent id="player-tab-private" value="private" className="mt-4">
            <NotesModule entityType="player" entityId={player.id} filterCategory="private" readOnly={!canManagePlayerCrud} />
          </TabsContent>
        )}

        {( !isPlayer || visiblePlayerNoteCounts.medical > 0 ) && (
          <TabsContent id="player-tab-medical" value="medical" className="mt-4">
            <NotesModule entityType="player" entityId={player.id} filterCategory="medical" readOnly={!canManagePlayerCrud} />
          </TabsContent>
        )}

        {( !isPlayer || visiblePlayerNoteCounts.technical > 0 ) && (
          <TabsContent id="player-tab-technical" value="technical" className="mt-4">
            <NotesModule entityType="player" entityId={player.id} filterCategory="technical" readOnly={!canManagePlayerCrud} />
          </TabsContent>
        )}

        {( !isPlayer || visiblePlayerNoteCounts.performance > 0 ) && (
          <TabsContent id="player-tab-performance" value="performance" className="mt-4 space-y-6">
            <NotesModule entityType="player" entityId={player.id} filterCategory="performance" readOnly={!canManagePlayerCrud} />
            {playerReviews.length > 0 && <DevPlanSection player={player} avgRatings={avgRatings} />}
          </TabsContent>
        )}

        {!isPlayer && (
          <TabsContent id="player-tab-tasks" value="tasks" className="mt-4">
            <TaskTimeline entityType="player" entityId={player.id} readOnly={!canManagePlayerCrud} />
          </TabsContent>
        )}

        {( !isPlayer || visiblePlayerDocumentCount > 0 ) && (
          <TabsContent id="player-tab-documents" value="documents" className="mt-4 space-y-4">
            <div className="flex justify-end items-center gap-4">
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {DOCUMENT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {canManagePlayerCrud && <DocumentDialog playerId={player.id} onUpload={addDocument} />}
            </div>

            {visiblePlayerDocs.filter(d => selectedDocType === 'ALL' || d.documentType?.toLowerCase() === selectedDocType.toLowerCase()).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {visiblePlayerDocs
                  .filter(d => selectedDocType === 'ALL' || d.documentType?.toLowerCase() === selectedDocType.toLowerCase())
                  .map(doc => (
                    <Card key={doc.documentId}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <FileText size={18} className="text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            <a
                              href={`data:application/octet-stream;base64,${doc.fileData}`}
                              download={doc.documentName}
                              className="text-sm font-medium text-blue-600 hover:underline cursor-pointer"
                            >
                              {doc.documentName}
                              <Download size={16} className="inline-block ml-2" />
                            </a>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc.documentType} · {doc.fileSizeLabel} · {format(new Date(doc.documentDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {canManagePlayerCrud && <DocumentDialog playerId={player.id} onUpload={addDocument} doc={doc} />}
                          {canManagePlayerCrud && <DeleteDocumentDialog doc={doc} />}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        )}

        {!isPlayer && (
          <TabsContent id="player-tab-emails" value="emails" className="mt-4">
            <EmailModule entityType="player" entityId={player.id} readOnly={!canManagePlayerCrud} />
          </TabsContent>
        )}

        <TabsContent id="player-tab-commercial" value="commercial" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Commercial Contracts</CardTitle>
            </CardHeader>
            <CardContent>
              {commercialContracts.length === 0 ? (
                <p className="text-muted-foreground">No commercial contracts found for this player.</p>
              ) : (
                <div className="space-y-4">
                  {commercialContracts.map((contract) => (
                    <Card key={contract.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <h4 className="font-semibold">{contract.sponsor?.companyName}</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Start Date:</span>
                              <span className="ml-2">{new Date(contract.contractStartDate).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">End Date:</span>
                              <span className="ml-2">{new Date(contract.contractEndDate).toLocaleDateString()}</span>
                            </div>
                            {contract.expiryDate && (
                              <div>
                                <span className="text-muted-foreground">Expiry Date:</span>
                                <span className="ml-2">{new Date(contract.expiryDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">Status:</span>
                              <Badge variant={new Date(contract.contractEndDate) > new Date() ? 'default' : 'destructive'} className="ml-2">
                                {new Date(contract.contractEndDate) > new Date() ? 'Active' : 'Expired'}
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
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div><p className="text-muted-foreground">{label}</p><p className="font-medium">{value}</p></div>
);

const AddReviewDialog = ({ playerId, scouts, clubs, onAdd }: { playerId: string | number; scouts: any[]; clubs: any[]; onAdd: (r: any) => void }) => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const defaultScout = scouts.find(s => (s.email || '').trim().toLowerCase() === (user?.email || '').trim().toLowerCase());
  const [scoutId, setScoutId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [club1Id, setClub1Id] = useState('');
  const [club2Id, setClub2Id] = useState('');
  const [notes, setNotes] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [ratings, setRatings] = useState<Ratings>({
    reviewId: '', passing: 0, shooting: 0, dribbling: 0, tacticalAwareness: 0,
    defensiveContribution: 0, physicalStrength: 0, behavior: 0, overallPerformance: 0, review: null,
  });
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
      setRatings({
        reviewId: '', passing: 0, shooting: 0, dribbling: 0, tacticalAwareness: 0,
        defensiveContribution: 0, physicalStrength: 0, behavior: 0, overallPerformance: 0, review: null,
      });
      setSkillDetails({});
      setErrors({});
    }
  }, [open]);

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

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};

    if (!scoutId.trim()) nextErrors.scoutId = 'Required field';
    // Club validation now handled by useEffect when training toggle changes
    // matchDate validation intentionally disabled - handled elsewhere
    // if (!matchDate.trim()) nextErrors.matchDate = 'Required field';
    // club1/club2 validations intentionally disabled to allow empty values
    // if (!club1Id.trim()) nextErrors.club1Id = 'Required field';
    // if (!club2Id.trim()) nextErrors.club2Id = 'Required field';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const details: Record<string, any> = {};
    Object.entries(skillDetails).forEach(([k, v]) => {
      if (v.comment || v.followUpDate) {
        details[k] = {
          rating: ratings[k as keyof Ratings],
          comment: v.comment || undefined,
          followUpDate: v.followUpDate || undefined,
        };
      }
    });

    setSubmitting(true);
    try {
      await onAdd({
        reviewId: crypto.randomUUID(),
        playerId,
        scoutId,
        matchDate,
        club1Id: club1Id || undefined,
        club2Id: club2Id || undefined,
        revRatings: ratings,
        revSkillDetails: Object.keys(details).length > 0 ? details : undefined,
        notes,
        createdAt: new Date().toISOString(),
      });
      setOpen(false);
      setScoutId(''); setMatchDate(''); setClub1Id(''); setClub2Id(''); setNotes(''); setIsTraining(false);
      setRatings({
        reviewId: '', passing: 0, shooting: 0, dribbling: 0, tacticalAwareness: 0,
        defensiveContribution: 0, physicalStrength: 0, behavior: 0, overallPerformance: 0, review: null,
      });
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
        <DialogHeader><DialogTitle>New Scouting Review</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Scout <span className="text-red-500">*</span></Label>
            <Select value={scoutId} onValueChange={value => { setScoutId(value); setErrors(prev => ({ ...prev, scoutId: '' })); }}>
              <SelectTrigger><SelectValue placeholder="Select scout" /></SelectTrigger>
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

          <div className="grid grid-cols-2 gap-4">
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
            {RATING_CATEGORIES.map(cat => (
              <div key={cat.key} className="space-y-1 border-b border-border pb-2">
                <div className="flex items-center justify-end">
                  {/* <span className="text-sm">{cat.label}</span> */}

                 <div className="flex items-center gap-9">
                   {/* <Label className="text-xs">follow-up date</Label> */}
                  <StarRating value={ratings[cat.key]} onChange={v => setRatings(prev => ({ ...prev, [cat.key]: v }))} size={18} />
                 </div>

                </div>
                <div className="grid grid-cols-2 gap-2">
                 <div>
                   <span className="text-sm">{cat.label}</span>
                  <Input placeholder="Comment..." className="text-xs h-7" value={skillDetails[cat.key]?.comment || ''} onChange={e => updateSkillDetail(cat.key, 'comment', e.target.value)} />
                 </div>
                  <div>
                    <span className="text-xs">Follow-up date</span>
                    <Input type="date" className="text-xs h-7" placeholder="Follow-up" value={skillDetails[cat.key]?.followUpDate || ''} onChange={e => updateSkillDetail(cat.key, 'followUpDate', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
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

const DevPlanSection = ({ player, avgRatings }: { player: any; avgRatings: Ratings }) => {
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">AI Development Plan</h3>
        <Button size="sm" onClick={() => setPlan(generateDevPlan(player, avgRatings))}>
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
  playerPositions
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
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    fullName: player.fullName || '',
    dateOfBirth: player.dateOfBirth || '',
    nationality: player.nationality || '',
    position: player.position || 'CF',
    preferredFoot: player.preferredFoot || 'Right',
    height: String(player.heightCm || ''),
    weight: String(player.weightKg || ''),
    currentClub: player.currentClub || '',
    contractStart: player.contractStart || '',
    contractEnd: player.contractEnd || '',
    agentName: player.agentName || '',
    agent_scout_id: player.agent_scout_id || '',
    contact_info: player.contact_info || '',
    profileImage: player.profileImage || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // const handleSubmit = async () => {
  //   const nextErrors: Record<string, string> = {};

  //   if (!form.fullName.trim()) nextErrors.fullName = 'Required field';
  //   if (!form.nationality.trim()) nextErrors.nationality = 'Required field';
  //   if (!form.dateOfBirth.trim()) nextErrors.dateOfBirth = 'Required field';
  //   if (!form.preferredFoot.trim()) nextErrors.preferredFoot = 'Required field';
  //   if (!form.height.trim()) nextErrors.height = 'Required field';
  //   if (!form.weight.trim()) nextErrors.weight = 'Required field';
  //   if (!form.contractStart.trim()) nextErrors.contractStart = 'Required field';
  //   if (!form.contractEnd.trim()) nextErrors.contractEnd = 'Required field';
  //   if (!form.agent_scout_id.trim()) nextErrors.agent_scout_id = 'Required field';
  //   if (!form.contact_info.trim()) nextErrors.contact_info = 'Required field';

  //   if (Object.keys(nextErrors).length > 0) {
  //     setErrors(nextErrors);
  //     return;
  //   }

  //   await onUpdate({
  //     ...player, // ✅ keep id + existing fields
  //     fullName: form.fullName,
  //     dateOfBirth: form.dateOfBirth || null,
  //     nationality: form.nationality,
  //     position: form.position,
  //     preferredFoot: form.preferredFoot,
  //     heightCm: Number(form.height) || 0,
  //     weightKg: Number(form.weight) || 0,
  //     currentClub: form.currentClub,
  //     contractStart: form.contractStart || null,
  //     contractEnd: form.contractEnd || null,
  //     agentName: form.agentName,
  //     agent_scout_id: form.agent_scout_id || '',
  //     contact_info: form.contact_info,
  //     profileImage: form.profileImage || undefined,
  //     updatedAt: new Date().toISOString(),
  //   });

  //   onClose();
  // };

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
    if (!form.agent_scout_id.trim()) nextErrors.agent_scout_id = 'Required field';
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
      agentName: form.agentName,
      agent_scout_id: form.agent_scout_id || '',
      contact_info: form.contact_info,
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
    'agentName'
  ];

  const isFieldEditable = (field: string) => {
    if (isScout) return scoutEditableFields.includes(field);
    if (isPlayer) return field !== 'contractStart' && field !== 'contractEnd';
    return true;
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Image Upload */}
      <div className="col-span-2">
        <Label>Player Image</Label>
        <div className="flex items-center gap-3">
          <img
            src={form.profileImage || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'}
            className="w-16 h-16 rounded-md object-cover bg-muted"
          />
          {/* <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => update('profileImage', reader.result as string);
              reader.readAsDataURL(file);
            }}
          /> */}
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              setImageFile(file);

              // preview only (not base64 storage)
              const previewUrl = URL.createObjectURL(file);
              update('profileImage', previewUrl);
            }}
            disabled={!isFieldEditable('profileImage')}
          />
        </div>
      </div>

      <div className="col-span-2">
        <Label>Full Name <span className="text-red-500">*</span></Label>
        <Input value={form.fullName} onChange={e => update('fullName', e.target.value)} disabled={!isFieldEditable('fullName')} />
        {errors.fullName ? <p className="text-xs text-destructive mt-1">{errors.fullName}</p> : null}
      </div>

      <div>
        <Label>Date of Birth <span className="text-red-500">*</span></Label>
        <Input type="date" value={form.dateOfBirth || ''} onChange={e => update('dateOfBirth', e.target.value)} disabled={!isFieldEditable('dateOfBirth')} />
        {errors.dateOfBirth ? <p className="text-xs text-destructive mt-1">{errors.dateOfBirth}</p> : null}
      </div>

      <div>
        <Label>Nationality <span className="text-red-500">*</span></Label>
        <Input value={form.nationality} onChange={e => update('nationality', e.target.value)}  disabled={!isFieldEditable('nationality')}/>
        {errors.nationality ? <p className="text-xs text-destructive mt-1">{errors.nationality}</p> : null}
      </div>

      <div>
        <Label>Position</Label>
        <Select value={form.position} onValueChange={v => update('position', v)} disabled={!isFieldEditable('position')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {playerPositions.map(p => <SelectItem key={p.positionId} value={p.positionCode}>{p.positionName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Laterality <span className="text-red-500">*</span></Label>
        <Select value={form.preferredFoot} onValueChange={v => update('preferredFoot', v)} disabled={!isFieldEditable('preferredFoot')}>
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
        <Input type="number" value={form.height} onChange={e => update('height', e.target.value)} disabled={!isFieldEditable('height')}/>
        {errors.height ? <p className="text-xs text-destructive mt-1">{errors.height}</p> : null}
      </div>

      <div>
        <Label>Weight <span className="text-[14px] text-gray-500">(kg)</span> <span className="text-red-500">*</span></Label>
        <Input type="number" value={form.weight} onChange={e => update('weight', e.target.value)} disabled={!isFieldEditable('weight')}/>
        {errors.weight ? <p className="text-xs text-destructive mt-1">{errors.weight}</p> : null}
      </div>

      {/* <div className="col-span-2">
        <Label>Current Club</Label>
        <Input value={form.currentClub} onChange={e => update('currentClub', e.target.value)} />
      </div> */}
      <div className="col-span-2">
        <Label>Current Club</Label>
        <Select value={form.currentClub} onValueChange={v => update('currentClub', v)}  disabled={!isFieldEditable('currentClub')}>
          <SelectTrigger>
            <SelectValue placeholder="Select club" />
          </SelectTrigger>
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
        <Input type="date" value={form.contractStart || ''} onChange={e => update('contractStart', e.target.value)} disabled={!isFieldEditable('contractStart')} />
        {/* {errors.contractStart ? <p className="text-xs text-destructive mt-1">{errors.contractStart}</p> : null} */}
      </div>

      <div>
        {/* <Label>Contract End <span className="text-red-500">*</span></Label> */}
        <Label>Contract End</Label>
        <Input type="date" value={form.contractEnd || ''} onChange={e => update('contractEnd', e.target.value)}  disabled={!isFieldEditable('contractEnd')} />
        {/* {errors.contractEnd ? <p className="text-xs text-destructive mt-1">{errors.contractEnd}</p> : null} */}
      </div>

      <div>
        <Label>Agent Name</Label>
        <Input value={form.agentName} onChange={e => update('agentName', e.target.value)}  disabled={!isFieldEditable('agentName')} />
      </div>

      <div>
        <Label>Scout <span className="text-red-500">*</span></Label>
        <Select value={form.agent_scout_id} onValueChange={v => update('agent_scout_id', v)} /*disabled={!isFieldEditable('agent_scout_id')}*/>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {scouts.map(s => (
              <SelectItem key={s.scoutId} value={s.scoutId}>
                {s.scoutName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.agent_scout_id ? <p className="text-xs text-destructive mt-1">{errors.agent_scout_id}</p> : null}
      </div>

      <div className="col-span-2">
        {/* <Label>Contact Info <span className="text-red-500">*</span></Label> */}
        <Label>Contact Info </Label>
        <Input value={form.contact_info} onChange={e => update('contact_info', e.target.value)}  disabled={!isFieldEditable('contact_info')} />
        {/* {errors.contact_info ? <p className="text-xs text-destructive mt-1">{errors.contact_info}</p> : null} */}
      </div>

      <Button onClick={handleSubmit} className="col-span-2 mt-4">
        Update Player
      </Button>
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
  const { deleteDocument } = useAppContext();
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
}: {
  playerId: string;
  onUpload: (file: File, clubId?: string, playerId?: string, type?: string, isVisibleToPlayer?: boolean) => void;
  doc?: any;
}) => {
  const { updateDocument } = useAppContext();
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
    } else {
      if (!file) return;
      // onUpload(file, undefined, playerId, type);
      onUpload(file, undefined, String(playerId), type, isVisibleToPlayer);
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
