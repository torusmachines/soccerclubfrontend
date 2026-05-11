import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { fetchContracts, createContractApi, updateContractApi, deleteContractApi, uploadContractDocumentApi, deleteContractDocumentApi, fetchClubs, fetchPlayers, fetchScouts, fetchSponsors } from '@/services/apiService';
import type { Contract, Club, Player, Scout, Sponsor } from '@/types';
import { Plus, Edit, Trash2, Upload, Search, Download } from 'lucide-react';

const CONTRACT_TYPES = [
  { value: 'PlayerClub', label: 'Player ↔ Club' },
  { value: 'ClubCompany', label: 'Club ↔ Sponsor' },
  { value: 'PlayerCompany', label: 'Player ↔ Sponsor' },
  { value: 'PlayerCoach', label: 'Player ↔ Coach' },
] as const;

const PARTY_TYPE_LABELS: Record<string, string> = {
  Player: 'Player',
  Club: 'Club',
  Company: 'Sponsor',
  Coach: 'Coach',
};

const getPartyTypes = (contractType: Contract['contractType']) => {
  switch (contractType) {
    case 'PlayerClub':
      return ['Player', 'Club'] as const;
    case 'ClubCompany':
      return ['Club', 'Company'] as const;
    case 'PlayerCompany':
      return ['Player', 'Company'] as const;
    case 'PlayerCoach':
      return ['Player', 'Coach'] as const;
    default:
      return ['Player', 'Club'] as const;
  }
};

const formatPartyLabel = (partyType: string, partyName: string | undefined, partyId: string) => {
  if (partyName) return partyName;
  if (partyType === 'Player') return 'Player';
  if (partyType === 'Club') return 'Club';
  if (partyType === 'Company') return 'Sponsor';
  if (partyType === 'Coach') return 'Coach';
  return partyId || 'Unknown';
};

const getPlayerId = (player: Player) => String(player.id || player.playerId || '');

const getPlayerName = (player: Player) => player.fullName || player.playerName || 'Unknown Player';

const REQUIRED_MARK = <span className="text-red-500"> *</span>;

const defaultForm = {
  contractType: 'PlayerClub' as Contract['contractType'],
  party1Type: 'Player' as Contract['party1Type'],
  party1Id: '',
  party1Name: '',
  party2Type: 'Club' as Contract['party2Type'],
  party2Id: '',
  party2Name: '',
  startDate: '',
  endDate: '',
  contractDetails: '',
  documentPath: '',
};

export const Contracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scouts, setScouts] = useState<Scout[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [contractSearch, setContractSearch] = useState('');
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [contractForm, setContractForm] = useState({ ...defaultForm });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contractsData, clubsData, playersData, scoutsData, sponsorsData] = await Promise.all([
        fetchContracts(),
        fetchClubs(),
        fetchPlayers(),
        fetchScouts(),
        fetchSponsors(),
      ]);
      setContracts(Array.isArray(contractsData) ? contractsData : []);
      setClubs(Array.isArray(clubsData) ? clubsData : []);
      setPlayers(Array.isArray(playersData) ? playersData : []);
      setScouts(Array.isArray(scoutsData) ? scoutsData : []);
      setSponsors(Array.isArray(sponsorsData) ? sponsorsData : []);
    } catch (error) {
      console.error('Failed to load contract data', error);
      setContracts([]);
      setClubs([]);
      setPlayers([]);
      setScouts([]);
      setSponsors([]);
    }
  };

  const updateContractType = (value: Contract['contractType']) => {
    const [party1Type, party2Type] = getPartyTypes(value);
    setContractForm((prev) => ({
      ...prev,
      contractType: value,
      party1Type,
      party2Type,
      party1Id: '',
      party1Name: '',
      party2Id: '',
      party2Name: '',
    }));
  };

  const setPartySelection = (party: 'party1' | 'party2', selectedId: string) => {
    const partyType = contractForm[`${party}Type` as const];
    let name = '';

    if (partyType === 'Player') {
      name = players.find((player) => getPlayerId(player) === selectedId)?.fullName
        || players.find((player) => getPlayerId(player) === selectedId)?.playerName
        || '';
    } else if (partyType === 'Club') {
      name = clubs.find((club) => club.clubId === selectedId)?.clubName || '';
    } else if (partyType === 'Company') {
      name = sponsors.find((sponsor) => sponsor.id === selectedId)?.companyName || '';
    } else if (partyType === 'Coach') {
      name = scouts.find((coach) => coach.scoutId === selectedId)?.scoutName || '';
    }

    setContractForm((previous) => ({
      ...previous,
      [`${party}Id`]: selectedId,
      [`${party}Name`]: name,
    }));
  };

  const getPartyFieldOptions = (partyType: string) => {
    switch (partyType) {
      case 'Player':
        return players
          .map((player) => ({ value: getPlayerId(player), label: getPlayerName(player) }))
          .filter((player) => Boolean(player.value));
      case 'Club':
        return clubs.map((club) => ({ value: club.clubId, label: club.clubName || 'Unknown Club' }));
      case 'Company':
        return sponsors.map((sponsor) => ({ value: sponsor.id, label: sponsor.companyName || 'Unknown Sponsor' }));
      case 'Coach':
        return scouts.map((coach) => ({ value: coach.scoutId, label: coach.scoutName || 'Unknown Coach' }));
      default:
        return [];
    }
  };

  const getDocumentLinks = (documentPath?: string) => {
    if (!documentPath) return [];
    return documentPath.split(',,,').map((path) => {
      const fileName = path.split('/').pop() || path;
      return { path, fileName };
    });
  };

  const filteredContracts = contracts.filter((contract) => {
    const query = contractSearch.trim().toLowerCase();
    if (!query) return true;

    const party1Text = `${contract.party1Name || ''} ${contract.party1Type}`.toLowerCase();
    const party2Text = `${contract.party2Name || ''} ${contract.party2Type}`.toLowerCase();
    const typeText = contract.contractType.toLowerCase();
    const detailsText = contract.contractDetails?.toLowerCase() ?? '';
    const dateText = `${contract.startDate} ${contract.endDate}`.toLowerCase();
    const statusText = contract.expiryStatus?.toLowerCase() ?? '';

    return (
      party1Text.includes(query) ||
      party2Text.includes(query) ||
      typeText.includes(query) ||
      detailsText.includes(query) ||
      dateText.includes(query) ||
      statusText.includes(query)
    );
  });

  const activeContracts = contracts.filter((contract) => new Date(contract.endDate) > new Date()).length;
  const expiringContracts = contracts.filter((contract) => {
    const endDate = new Date(contract.endDate);
    const today = new Date();
    const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilEnd >= 0 && daysUntilEnd <= 30;
  }).length;

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contractForm.party1Id || !contractForm.party2Id) {
      toast({ title: 'Error', description: 'Please select or enter both parties.', variant: 'destructive' });
      return;
    }

    if (!contractForm.startDate || !contractForm.endDate) {
      toast({ title: 'Error', description: 'Please provide contract start and end dates.', variant: 'destructive' });
      return;
    }

    const payload = {
      contractType: contractForm.contractType,
      party1Id: contractForm.party1Id,
      party1Type: contractForm.party1Type,
      party1Name: contractForm.party1Name || undefined,
      party2Id: contractForm.party2Id,
      party2Type: contractForm.party2Type,
      party2Name: contractForm.party2Name || undefined,
      startDate: contractForm.startDate,
      endDate: contractForm.endDate,
      contractDetails: contractForm.contractDetails || undefined,
      documentPath: contractForm.documentPath || undefined,
    };

    try {
      let contract: Contract;

      if (editingContract) {
        contract = await updateContractApi(editingContract.id, payload);
        toast({ title: 'Success', description: 'Contract updated successfully' });
      } else {
        contract = await createContractApi(payload);
        toast({ title: 'Success', description: 'Contract created successfully' });
      }

      if (uploadedFiles.length > 0) {
        try {
          await uploadContractDocumentApi(contract.id, uploadedFiles);
          toast({ title: 'Success', description: 'Documents uploaded successfully' });
        } catch (uploadError) {
          console.error('Failed to upload documents', uploadError);
          toast({ title: 'Warning', description: 'Contract saved but document upload failed', variant: 'destructive' });
        }
      }

      setContractDialogOpen(false);
      setEditingContract(null);
      setContractForm({ ...defaultForm });
      setUploadedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadData();
    } catch (error: any) {
      console.error('Failed to save contract', error);
      toast({ title: 'Error', description: error?.message || 'Failed to save contract', variant: 'destructive' });
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;
    try {
      await deleteContractApi(id);
      toast({ title: 'Success', description: 'Contract deleted successfully' });
      loadData();
    } catch (error) {
      console.error('Failed to delete contract', error);
      toast({ title: 'Error', description: 'Failed to delete contract', variant: 'destructive' });
    }
  };

  const handleDocumentUpload = async (contractId: string, files: File[]) => {
    try {
      await uploadContractDocumentApi(contractId, files);
      toast({ title: 'Success', description: 'Documents uploaded successfully' });
      loadData();
    } catch (error) {
      console.error('Failed to upload documents', error);
      toast({ title: 'Error', description: 'Failed to upload documents', variant: 'destructive' });
    }
  };

  const handleDeleteContractDocument = async (contractId: string, documentPath: string) => {
    if (!confirm('Delete this attachment?')) return;
    try {
      const result = await deleteContractDocumentApi(contractId, documentPath);
      toast({ title: 'Success', description: 'Attachment deleted successfully' });
      if (editingContract?.id === contractId) {
        setEditingContract({ ...editingContract, documentPath: result.documentPath });
        setContractForm({ ...contractForm, documentPath: result.documentPath || '' });
      }
      loadData();
    } catch (error) {
      console.error('Failed to delete attachment', error);
      toast({ title: 'Error', description: 'Failed to delete attachment', variant: 'destructive' });
    }
  };

  const renderPartyField = (party: 'party1' | 'party2', displayLabel: string) => {
    const partyType = contractForm[`${party}Type` as const];
    const partyId = contractForm[`${party}Id` as const];
    const partyName = contractForm[`${party}Name` as const];
    const label = PARTY_TYPE_LABELS[partyType] || 'Party';

    const options = getPartyFieldOptions(partyType);
    return (
      <div>
        <Label htmlFor={`${party}Id`}>{displayLabel}{REQUIRED_MARK}</Label>
        <Select value={partyId} onValueChange={(value) => setPartySelection(party, value)}>
          <SelectTrigger>
            <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contracts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage generic party contracts, search by metadata, and attach multiple documents.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/70 bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{contracts.length}</p>
            <p className="text-sm text-muted-foreground">Total contracts</p>
          </CardContent>
        </Card>
        <Card className="border border-border/70 bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeContracts}</p>
            <p className="text-sm text-muted-foreground">Contracts ending in the future</p>
          </CardContent>
        </Card>
        <Card className="border border-border/70 bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{expiringContracts}</p>
            <p className="text-sm text-muted-foreground">Ending in 30 days or less</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 w-full sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Contracts</CardTitle>
              <p className="text-sm text-muted-foreground">Search and manage multi-party contracts.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={contractSearch}
                  onChange={(e) => setContractSearch(e.target.value)}
                  placeholder="Search contract type, parties, status, or dates"
                  className="pl-10"
                />
              </div>
              <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingContract(null);
                    setContractForm({ ...defaultForm });
                    setUploadedFiles([]);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contract
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingContract ? 'Edit Contract' : 'Add Contract'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleContractSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="contractType">Contract Type{REQUIRED_MARK}</Label>
                      <Select value={contractForm.contractType} onValueChange={(value) => updateContractType(value as Contract['contractType'])}>
                        <SelectTrigger id="contractType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTRACT_TYPES.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {renderPartyField('party1', `Party 1 (${PARTY_TYPE_LABELS[contractForm.party1Type] || contractForm.party1Type})`)}
                      {renderPartyField('party2', `Party 2 (${PARTY_TYPE_LABELS[contractForm.party2Type] || contractForm.party2Type})`)}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate">Start Date{REQUIRED_MARK}</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={contractForm.startDate}
                          onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate">End Date{REQUIRED_MARK}</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={contractForm.endDate}
                          onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="contractDetails">Contract Details</Label>
                      <Textarea
                        id="contractDetails"
                        value={contractForm.contractDetails}
                        onChange={(e) => setContractForm({ ...contractForm, contractDetails: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="documents">Upload Documents</Label>
                      <div className="flex gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={(e) => {
                            const files = e.target.files ? Array.from(e.target.files) : [];
                            setUploadedFiles(files);
                          }}
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                          className="hidden"
                        />
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="w-4 h-4 mr-2" />
                          Select Files
                        </Button>
                      </div>
                      {uploadedFiles.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground">Selected files: {uploadedFiles.length}</p>
                          <ul className="text-sm list-disc list-inside">
                            {uploadedFiles.map((file, index) => (
                              <li key={index}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {editingContract && getDocumentLinks(editingContract.documentPath).length > 0 && (
                        <div className="mt-4 rounded-md border border-border/80 bg-muted p-3">
                          <p className="mb-2 text-sm font-semibold">Existing attachments</p>
                          <ul className="space-y-2">
                            {getDocumentLinks(editingContract.documentPath).map((doc) => (
                              <li key={doc.path} className="flex items-center justify-between gap-4 rounded-md bg-background px-3 py-2">
                                <a
                                  href={`https://localhost:7001${doc.path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={doc.fileName}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <Download className="w-3 h-3" />
                                    {doc.fileName}
                                  </span>
                                </a>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteContractDocument(editingContract.id, doc.path)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <Button type="submit">{editingContract ? 'Update Contract' : 'Create Contract'}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract Type</TableHead>
                  <TableHead>Party 1</TableHead>
                  <TableHead>Party 2</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => (
                  <TableRow key={contract.id} className="transition-colors hover:bg-muted/20">
                    <TableCell>{CONTRACT_TYPES.find((option) => option.value === contract.contractType)?.label || contract.contractType}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{formatPartyLabel(contract.party1Type, contract.party1Name, contract.party1Id)}</span>
                        <span className="text-xs text-muted-foreground">{contract.party1Type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{formatPartyLabel(contract.party2Type, contract.party2Name, contract.party2Id)}</span>
                        <span className="text-xs text-muted-foreground">{contract.party2Type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(contract.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(contract.endDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={new Date(contract.endDate) > new Date() ? 'default' : 'destructive'}>
                        {contract.expiryStatus || (new Date(contract.endDate) > new Date() ? 'Active' : 'Expired')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getDocumentLinks(contract.documentPath).map((doc, index) => (
                          <a
                            key={index}
                            href={`https://localhost:7001${doc.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <Download className="w-3 h-3" />
                            {doc.fileName}
                          </a>
                        ))}
                        {(!contract.documentPath || getDocumentLinks(contract.documentPath).length === 0) && (
                          <span className="text-xs text-muted-foreground">No documents</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingContract(contract);
                          setContractForm({
                            contractType: contract.contractType,
                            party1Type: contract.party1Type,
                            party1Id: contract.party1Id,
                            party1Name: contract.party1Name ?? '',
                            party2Type: contract.party2Type,
                            party2Id: contract.party2Id,
                            party2Name: contract.party2Name ?? '',
                            startDate: contract.startDate.split('T')[0],
                            endDate: contract.endDate.split('T')[0],
                            contractDetails: contract.contractDetails ?? '',
                            documentPath: contract.documentPath ?? '',
                          });
                          setUploadedFiles([]);
                          setContractDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteContract(contract.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) handleDocumentUpload(contract.id, files);
                          }}
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                        />
                        <Button variant="ghost" size="sm" asChild>
                          <span><Upload className="w-4 h-4" /></span>
                        </Button>
                      </label>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-4 sm:hidden">
            {filteredContracts.map((contract) => (
              <Card key={contract.id} className="border border-border pt-5">
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{CONTRACT_TYPES.find((option) => option.value === contract.contractType)?.label || contract.contractType}</p>
                      <p className="text-xs text-muted-foreground truncate">{formatPartyLabel(contract.party1Type, contract.party1Name, contract.party1Id)} ↔ {formatPartyLabel(contract.party2Type, contract.party2Name, contract.party2Id)}</p>
                    </div>
                    <Badge variant={new Date(contract.endDate) > new Date() ? 'default' : 'destructive'}>
                      {contract.expiryStatus || (new Date(contract.endDate) > new Date() ? 'Active' : 'Expired')}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div><span className="font-medium">Party 1:</span> {formatPartyLabel(contract.party1Type, contract.party1Name, contract.party1Id)}</div>
                    <div><span className="font-medium">Party 2:</span> {formatPartyLabel(contract.party2Type, contract.party2Name, contract.party2Id)}</div>
                    <div><span className="font-medium">Start:</span> {new Date(contract.startDate).toLocaleDateString()}</div>
                    <div><span className="font-medium">End:</span> {new Date(contract.endDate).toLocaleDateString()}</div>
                    <div className="space-y-1">
                      <span className="font-medium">Documents:</span>
                      {getDocumentLinks(contract.documentPath).length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {getDocumentLinks(contract.documentPath).map((doc, index) => (
                            <a
                              key={index}
                              href={`https://localhost:7001${doc.path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <Download className="w-3 h-3 inline-block mr-1" />
                              {doc.fileName}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No documents</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingContract(contract);
                        setContractForm({
                          contractType: contract.contractType,
                          party1Type: contract.party1Type,
                          party1Id: contract.party1Id,
                          party1Name: contract.party1Name ?? '',
                          party2Type: contract.party2Type,
                          party2Id: contract.party2Id,
                          party2Name: contract.party2Name ?? '',
                          startDate: contract.startDate.split('T')[0],
                          endDate: contract.endDate.split('T')[0],
                          contractDetails: contract.contractDetails ?? '',
                          documentPath: contract.documentPath ?? '',
                        });
                        setUploadedFiles([]);
                        setContractDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteContract(contract.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) handleDocumentUpload(contract.id, files);
                        }}
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                      />
                      <Button variant="ghost" size="sm" asChild>
                        <span><Upload className="w-4 h-4" /></span>
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
