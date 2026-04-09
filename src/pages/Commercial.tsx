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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { fetchSponsors, createSponsorApi, updateSponsorApi, deleteSponsorApi, fetchCommercialContracts, createCommercialContractApi, updateCommercialContractApi, deleteCommercialContractApi, uploadContractDocumentApi, deleteContractDocumentApi, fetchClubs, fetchPlayers } from '@/services/apiService';
import type { Sponsor, CommercialContract, Club, Player } from '@/types';
import { Plus, Edit, Trash2, Upload, Search, Download } from 'lucide-react';

export const Commercial = () => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [contracts, setContracts] = useState<CommercialContract[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [contractSearch, setContractSearch] = useState('');
  const [sponsorDialogOpen, setSponsorDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [editingContract, setEditingContract] = useState<CommercialContract | null>(null);
  const [sponsorForm, setSponsorForm] = useState<Omit<Sponsor, 'id' | 'createdAt' | 'updatedAt'>>({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    notes: '',
  });
  const [contractForm, setContractForm] = useState<Omit<CommercialContract, 'id' | 'createdAt' | 'updatedAt' | 'sponsor'>>({
    sponsorId: '',
    entityType: 'club',
    clubId: '',
    playerId: '',
    contractStartDate: '',
    contractEndDate: '',
    contractDetails: '',
    documentPath: '',
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sponsorsData, contractsData, clubsData, playersData] = await Promise.all([
        fetchSponsors(),
        fetchCommercialContracts(),
        fetchClubs(),
        fetchPlayers(),
      ]);
      setSponsors(sponsorsData);
      setContracts(contractsData);
      setClubs(clubsData);
      setPlayers(playersData);
    } catch (error) {
      console.error('Failed to load data', error);
    }
  };

  const getEntityName = (contract: CommercialContract) => {
    if (contract.entityType === 'club') {
      return clubs.find((club) => club.clubId === contract.clubId)?.clubName || contract.clubId || 'N/A';
    }

    if (contract.entityType === 'player') {
      const playerdatavalue = players.find((player) => String(player.id) === contract.playerId);
      return playerdatavalue?.fullName ? playerdatavalue.fullName : contract.playerId || 'N/A';
    }

    return 'N/A';
  };

  const getDocumentLinks = (documentPath?: string) => {
    if (!documentPath) return [];
    return documentPath.split(',,,').map(path => {
      const fileName = path.split('/').pop() || path;
      return { path, fileName };
    });
  };

  const filteredContracts = contracts.filter((contract) => {
    const query = contractSearch.trim().toLowerCase();
    if (!query) return true;

    const sponsorName = contract.sponsor?.companyName?.toLowerCase() ?? '';
    const entityName = getEntityName(contract).toLowerCase();
    const details = contract.contractDetails?.toLowerCase() ?? '';

    return (
      sponsorName.includes(query) ||
      contract.entityType.toLowerCase().includes(query) ||
      entityName.includes(query) ||
      details.includes(query) ||
      contract.contractStartDate.toLowerCase().includes(query) ||
      contract.contractEndDate.toLowerCase().includes(query)
    );
  });

  const activeContracts = contracts.filter((contract) => new Date(contract.contractEndDate) > new Date()).length;
  const expiringContracts = contracts.filter((contract) => {
    const endDate = new Date(contract.contractEndDate);
    const today = new Date();
    const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilEnd >= 0 && daysUntilEnd <= 30;
  }).length;

  const handleSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSponsor) {
        await updateSponsorApi(editingSponsor.id, sponsorForm);
        toast({ title: 'Success', description: 'Sponsor updated successfully' });
      } else {
        await createSponsorApi(sponsorForm);
        toast({ title: 'Success', description: 'Sponsor created successfully' });
      }
      setSponsorDialogOpen(false);
      setEditingSponsor(null);
      setSponsorForm({
        companyName: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        notes: '',
      });
      loadData();
    } catch (error) {
      console.error('Failed to save sponsor', error);
      toast({ title: 'Error', description: 'Failed to save sponsor', variant: 'destructive' });
    }
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate all required fields before submission
      if (!contractForm.sponsorId) {
        toast({ title: 'Error', description: 'Please select a sponsor', variant: 'destructive' });
        return;
      }
      if (!contractForm.entityType) {
        toast({ title: 'Error', description: 'Please select an entity type', variant: 'destructive' });
        return;
      }
      if (contractForm.entityType === 'club' && !contractForm.clubId) {
        toast({ title: 'Error', description: 'Please select a club', variant: 'destructive' });
        return;
      }
      if (contractForm.entityType === 'player' && !contractForm.playerId) {
        toast({ title: 'Error', description: 'Please select a player', variant: 'destructive' });
        return;
      }
      if (!contractForm.contractStartDate) {
        toast({ title: 'Error', description: 'Please select a contract start date', variant: 'destructive' });
        return;
      }
      if (!contractForm.contractEndDate) {
        toast({ title: 'Error', description: 'Please select a contract end date', variant: 'destructive' });
        return;
      }

      // Prepare payload with proper formatting
      const payload = {
        sponsorId: contractForm.sponsorId,
        entityType: contractForm.entityType,
        clubId: contractForm.clubId || '',
        playerId: contractForm.playerId || '',
        contractStartDate: contractForm.contractStartDate, // YYYY-MM-DD format from input
        contractEndDate: contractForm.contractEndDate, // YYYY-MM-DD format from input
        contractDetails: contractForm.contractDetails || '',
        documentPath: contractForm.documentPath || '',
      };

      let contract;
      if (editingContract) {
        contract = await updateCommercialContractApi(editingContract.id, payload);
        toast({ title: 'Success', description: 'Contract updated successfully' });
      } else {
        contract = await createCommercialContractApi(payload);
        toast({ title: 'Success', description: 'Contract created successfully' });
      }

      // Upload files if any
      if (uploadedFiles.length > 0) {
        console.log('Uploading files:', uploadedFiles.length, uploadedFiles);
        try {
          await uploadContractDocumentApi(contract.id, uploadedFiles);
          toast({ title: 'Success', description: 'Documents uploaded successfully' });
        } catch (uploadError) {
          console.error('Failed to upload documents', uploadError);
          toast({ title: 'Warning', description: 'Contract saved but document upload failed', variant: 'destructive' });
        }
      } else {
        console.log('No files to upload');
      }
      setContractDialogOpen(false);
      setEditingContract(null);
      setContractForm({
        sponsorId: '',
        entityType: 'club',
        clubId: '',
        playerId: '',
        contractStartDate: '',
        contractEndDate: '',
        contractDetails: '',
        documentPath: '',
      });
      setUploadedFiles([]);

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      loadData();
    } catch (error: any) {
      console.error('Failed to save contract', error);
      const errorMsg = error?.message || 'Failed to save contract';
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    }
  };

  const handleDeleteSponsor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sponsor?')) return;
    try {
      await deleteSponsorApi(id);
      toast({ title: 'Success', description: 'Sponsor deleted successfully' });
      loadData();
    } catch (error) {
      console.error('Failed to delete sponsor', error);
      toast({ title: 'Error', description: 'Failed to delete sponsor', variant: 'destructive' });
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;
    try {
      await deleteCommercialContractApi(id);
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
    if (!confirm('Are you sure you want to delete this attachment?')) return;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Commercial Sponsorship</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage sponsors, contracts and track status with filtered search.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/70 bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Sponsors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{sponsors.length}</p>
            <p className="text-sm text-muted-foreground">Total sponsor profiles</p>
          </CardContent>
        </Card>
        <Card className="border border-border/70 bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{contracts.length}</p>
            <p className="text-sm text-muted-foreground">All active and archived contracts</p>
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
      </div>

      <Tabs defaultValue="sponsors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
        </TabsList>

        <TabsContent value="sponsors" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Sponsors</CardTitle>
            <Dialog open={sponsorDialogOpen} onOpenChange={setSponsorDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingSponsor(null); setSponsorForm({ companyName: '', contactName: '', contactEmail: '', contactPhone: '', address: '', notes: '' }); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Sponsor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSponsor ? 'Edit Sponsor' : 'Add Sponsor'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSponsorSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={sponsorForm.companyName}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, companyName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input
                      id="contactName"
                      value={sponsorForm.contactName || ''}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, contactName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={sponsorForm.contactEmail || ''}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, contactEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      value={sponsorForm.contactPhone || ''}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, contactPhone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={sponsorForm.address || ''}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={sponsorForm.notes || ''}
                      onChange={(e) => setSponsorForm({ ...sponsorForm, notes: e.target.value })}
                    />
                  </div>
                  <Button type="submit">{editingSponsor ? 'Update' : 'Create'}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Contact Name</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Contact Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sponsors.map((sponsor) => (
                <TableRow key={sponsor.id}>
                  <TableCell>{sponsor.companyName}</TableCell>
                  <TableCell>{sponsor.contactName || '-'}</TableCell>
                  <TableCell>{sponsor.contactEmail || '-'}</TableCell>
                  <TableCell>{sponsor.contactPhone || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{sponsor.address || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{sponsor.notes || '-'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSponsor(sponsor);
                        setSponsorForm({
                          companyName: sponsor.companyName,
                          contactName: sponsor.contactName || '',
                          contactEmail: sponsor.contactEmail || '',
                          contactPhone: sponsor.contactPhone || '',
                          address: sponsor.address || '',
                          notes: sponsor.notes || '',
                        });
                        setSponsorDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSponsor(sponsor.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 w-full sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Commercial Contracts</CardTitle>
              <p className="text-sm text-muted-foreground">Search and manage all sponsorship contracts.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={contractSearch}
                  onChange={(e) => setContractSearch(e.target.value)}
                  placeholder="Search sponsor, club, player, entity or dates"
                  className="pl-10"
                />
              </div>
              <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingContract(null); setContractForm({ sponsorId: '', entityType: 'club', clubId: '', playerId: '', contractStartDate: '', contractEndDate: '', contractDetails: '', documentPath: '' }); setUploadedFiles([]); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contract
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingContract ? 'Edit Contract' : 'Add Contract'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleContractSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sponsorId">Sponsor *</Label>
                        <Select value={contractForm.sponsorId} onValueChange={(value) => setContractForm({ ...contractForm, sponsorId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sponsor" />
                          </SelectTrigger>
                          <SelectContent>
                            {sponsors.map((sponsor) => (
                              <SelectItem key={sponsor.id} value={sponsor.id}>
                                {sponsor.companyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="entityType">Entity Type *</Label>
                        <Select value={contractForm.entityType} onValueChange={(value: 'club' | 'player') => setContractForm({ ...contractForm, entityType: value, clubId: '', playerId: '' })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="club">Club</SelectItem>
                            <SelectItem value="player">Player</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {contractForm.entityType === 'club' && (
                      <div>
                        <Label htmlFor="clubId">Club *</Label>
                        <Select value={contractForm.clubId || ''} onValueChange={(value) => setContractForm({ ...contractForm, clubId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select club" />
                          </SelectTrigger>
                          <SelectContent>
                            {clubs.map((club) => (
                              <SelectItem key={club.clubId} value={club.clubId}>
                                {club.clubName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {contractForm.entityType === 'player' && (
                      <div>
                        <Label htmlFor="playerId">Player *</Label>
                        <Select value={contractForm.playerId || ''} onValueChange={(value) => setContractForm({ ...contractForm, playerId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select player" />
                          </SelectTrigger>
                          <SelectContent>
                            {players.map((player) => (
                              <SelectItem key={player.id} value={String(player.id)}>
                                {player.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contractStartDate">Start Date *</Label>
                        <Input
                          id="contractStartDate"
                          type="date"
                          value={contractForm.contractStartDate}
                          onChange={(e) => setContractForm({ ...contractForm, contractStartDate: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="contractEndDate">End Date *</Label>
                        <Input
                          id="contractEndDate"
                          type="date"
                          value={contractForm.contractEndDate}
                          onChange={(e) => setContractForm({ ...contractForm, contractEndDate: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="contractDetails">Contract Details</Label>
                      <Textarea
                        id="contractDetails"
                        value={contractForm.contractDetails || ''}
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
                            const target = e.target as HTMLInputElement;
                            const files = target.files ? Array.from(target.files) : [];
                            console.log('Files selected:', files.length, files);
                            setUploadedFiles(files);
                          }}
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Select Files
                        </Button>
                      </div>
                      {uploadedFiles.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground">Selected files: {uploadedFiles.length}</p>
                          <ul className="text-sm">
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
                                  href={`https://soccerclubbackend.onrender.com${doc.path}`}
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
                    <Button type="submit">{editingContract ? 'Update' : 'Create'}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sponsor</TableHead>
                <TableHead>Entity</TableHead>
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
                  <TableCell>{contract.sponsor?.companyName || 'Unknown Sponsor'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${contract.entityType === 'club' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        {contract.entityType === 'club' ? 'Club' : 'Player'}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{getEntityName(contract)}</p>
                        <p className="truncate text-xs text-muted-foreground">{contract.entityType === 'club' ? 'Club contract' : 'Player contract'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(contract.contractStartDate).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(contract.contractEndDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={new Date(contract.contractEndDate) > new Date() ? 'default' : 'destructive'}>
                      {new Date(contract.contractEndDate) > new Date() ? 'Active' : 'Expired'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getDocumentLinks(contract.documentPath).map((doc, index) => (
                        <a
                          key={index}
                          href={`https://soccerclubbackend.onrender.com${doc.path}`}
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
                          sponsorId: contract.sponsorId,
                          entityType: contract.entityType,
                          clubId: contract.clubId || '',
                          playerId: contract.playerId || '',
                          contractStartDate: contract.contractStartDate.split('T')[0],
                          contractEndDate: contract.contractEndDate.split('T')[0],
                          contractDetails: contract.contractDetails || '',
                          documentPath: contract.documentPath || '',
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
                          if (files.length > 0) {
                            handleDocumentUpload(contract.id, files);
                          }
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
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};