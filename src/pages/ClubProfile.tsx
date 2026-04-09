import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/context/PlayerContext';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/accessPolicy';
import { ClubContact, Club, DOCUMENT_TYPES, ContactRole } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAverageRatings, calculateOverallAverage } from '@/lib/playerUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { NotesModule } from '@/components/NotesModule';
import { EmailModule } from '@/components/EmailModule';
import { ArrowLeft, Plus, MapPin, Building2, User, Phone, Mail, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Download } from "lucide-react";

import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchContractsByClub } from '@/services/apiService';
import type { CommercialContract } from '@/types';



const ClubProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { clubs, clubContacts, addClubContact, deleteClubContact, documents, addDocument, players, notes, reviews, contactRoles } = useAppContext();
  const { loadDocuments } = useAppContext();
  const canManageClubs = hasPermission(user?.role, 'clubs:manage');
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [commercialContracts, setCommercialContracts] = useState<CommercialContract[]>([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    const loadCommercialContracts = async () => {
      if (id) {
        try {
          const contracts = await fetchContractsByClub(id);
          setCommercialContracts(contracts);
        } catch (error) {
          console.error('Failed to load commercial contracts', error);
        }
      }
    };
    loadCommercialContracts();
  }, [id]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'contacts', 'notes', 'documents', 'communication'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const club = clubs.find(c => c.clubId === id);
  if (!club) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground mb-4">Club not found</p>
      <Link to="/clubs" className="text-primary underline">Back to clubs</Link>
    </div>
  );

  const contacts = clubContacts.filter(cc => cc.clubId === id);
  const clubDocs = documents.filter(d => d.clubId === id);
  const clubPlayers = players.filter(p => p.currentClub === club.clubId);

  const [selectedType, setSelectedType] = useState<string>('ALL');

  const filteredDocs =
    selectedType === 'ALL'
      ? clubDocs
      : clubDocs.filter(doc => doc.documentType?.toLowerCase() === selectedType?.toLowerCase());

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <Link to="/clubs"><Button variant="ghost" size="icon"><ArrowLeft size={18} /></Button></Link>
        <div className="flex-1">
          {/* <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{club.clubName}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin size={12} /> {club.country}{club.addressLine && ` · ${club.addressLine}`}</p>
            </div>
          </div> */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
              {club.logoUrl
                ? <img src={club.logoUrl} alt={club.clubName} className="w-full h-full object-cover" />
                : <Building2 size={24} className="text-primary" />}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold">{club.clubName}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin size={12} /> {club.country}
                {club.addressLine && ` · ${club.addressLine}`}
              </p>
            </div>

            {canManageClubs && (
              <div className="flex gap-2">
                <UpdateClubDialog club={club} />
                <DeleteClubDialog club={club} />
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.filter(a => a.clubId === club.clubId).length})</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="commercial">Commercial ({commercialContracts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Club Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><p className="text-muted-foreground">Name</p><p className="font-medium">{club.clubName}</p></div>
                <div><p className="text-muted-foreground">Country</p><p className="font-medium">{club.country}</p></div>
                {club.addressLine && <div><p className="text-muted-foreground">Address</p><p className="font-medium">{club.addressLine}</p></div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Players at Club</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {clubPlayers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tracked players at this club</p>
                ) : clubPlayers.map(p => (
                  <Link key={p.id} to={`/players/${p.id}`} className="group block rounded-lg border border-border p-3 hover:border-primary hover:bg-primary/5 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary">{p.fullName}</span>
                      <Badge variant="outline">{p.position}</Badge>
                    </div>
                    <div className="flex items-start justify-between  mt-2 text-xs text-muted-foreground space-y-1">
                      <div><label className="font-medium text-foreground group-hover:text-primary">Contract : </label> {p.contractStart ? format(new Date(p.contractStart), 'MMM d, yyyy') : 'N/A'} – {p.contractEnd ? format(new Date(p.contractEnd), 'MMM d, yyyy') : 'N/A'}</div>
                      <div><label className="font-medium text-foreground group-hover:text-primary">Overall rating :</label> {(() => {
                        const playerReviews = reviews.filter(r => String(r.playerId) === String(p.id));
                        return playerReviews.length ? `${calculateOverallAverage(getAverageRatings(playerReviews)).toFixed(1)}/5` : 'N/A';
                      })()}
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4 space-y-4">
          {canManageClubs && (
            <div className="flex justify-end">
              <AddContactDialog clubId={club.clubId} onAdd={addClubContact} />
            </div>
          )}
          {contacts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No contacts added</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {contacts.map(contact => (
                <Card key={contact.clubContactId}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-muted-foreground" />
                          <span className="font-medium text-sm">{contact.contactName}</span>
                        </div>
                        <Badge variant="secondary" className="mt-1 text-xs">{contact.roleName}</Badge>
                      </div>
                      {/* <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => deleteClubContact(contact.clubContactId)}>Remove</Button> */}
                      {canManageClubs && (
                        <div className="flex gap-2">
                          <EditContactDialog contact={contact} />
                          <DeleteContactDialog contact={contact} />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      {contact.email && <p className="flex items-center gap-1"><Mail size={10} /> {contact.email}</p>}
                      {contact.phone && <p className="flex items-center gap-1"><Phone size={10} /> {contact.phone}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <NotesModule entityType="club" entityId={club.clubId} readOnly={!canManageClubs} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-4">
          {/* <div className="flex justify-end">
            <DocumentDialog clubId={club.clubId} onUpload={addDocument} />
          </div> */}
          <div className="flex justify-end items-center gap-4">

            {/* FILTER DROPDOWN */}
            <Select value={selectedType} onValueChange={setSelectedType}>
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

            {/* Upload Button */}
            {canManageClubs && <DocumentDialog clubId={club.clubId} onUpload={addDocument} />}
          </div>
          {filteredDocs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No documents uploaded</p>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map(doc => (
                <Card key={doc.documentId}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <FileText size={18} className="text-primary" />

                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        <a
                          href={`data:application/octet-stream;base64,${doc.fileData}`}
                          download={doc.documentName}
                          className="text-sm font-medium text-blue-600 hover:underline cursor-pointer flex items-center gap-2 text-blue-600 hover:underline cursor-pointer"
                        >
                          {doc.documentName}  <Download size={16} />
                        </a></p>

                      <p className="text-xs text-muted-foreground">
                        {doc.documentType} · {doc.fileSizeLabel} · {format(new Date(doc.documentDate), 'MMM d, yyyy')}
                      </p>
                    </div>

                    {canManageClubs && (
                      <div className="flex gap-2">
                        {/* <EditDocumentDialog doc={doc} /> */}
                        <DocumentDialog clubId={club.clubId} onUpload={addDocument} doc={doc} />
                        <DeleteDocumentDialog doc={doc} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="communication" className="mt-4">
          <EmailModule entityType="club" entityId={club.clubId} readOnly={!canManageClubs} />
        </TabsContent>

        <TabsContent value="commercial" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Commercial Contracts</CardTitle>
            </CardHeader>
            <CardContent>
              {commercialContracts.length === 0 ? (
                <p className="text-muted-foreground">No commercial contracts found for this club.</p>
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
                                    href={`https://soccerclubbackend.onrender.com${doc.path}`}
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

const AddContactDialog = ({ clubId, onAdd }: { clubId: string; onAdd: (c: ClubContact) => void }) => {
  const { contactRoles } = useAppContext();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = 'Required field';
    if (!role.trim()) nextErrors.role = 'Required field';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onAdd({
      clubContactId: crypto.randomUUID(), clubId, contactName: name, roleName: role, email: email || undefined, phone: phone || undefined,
      createdAt: ''
    });
    setOpen(false);
    setName(''); setRole(''); setEmail(''); setPhone('');
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus size={14} className="mr-1" /> Add Contact</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name <span className="text-red-500">*</span></Label><Input value={name} onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }} />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div><Label>Role <span className="text-red-500">*</span></Label>
            <Select value={role} onValueChange={value => { setRole(value); setErrors(prev => ({ ...prev, role: '' })); }}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {contactRoles.length > 0 ? contactRoles.map(r => <SelectItem key={r.roleId} value={r.roleName}>{r.roleName}</SelectItem>) : <SelectItem value="loading" disabled>Loading roles...</SelectItem>}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-destructive mt-1">{errors.role}</p>}
          </div>
          <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} type="email" /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <Button onClick={handleSubmit} className="w-full">Add Contact</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
const EditContactDialog = ({ contact }: { contact: ClubContact }) => {
  const { updateClubContact, contactRoles } = useAppContext();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState(contact.contactName);
  const [role, setRole] = useState(contact.roleName);
  const [email, setEmail] = useState(contact.email || '');
  const [phone, setPhone] = useState(contact.phone || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleUpdate = async () => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = 'Required field';
    if (!role.trim()) nextErrors.role = 'Required field';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await updateClubContact({
      ...contact,
      contactName: name,
      roleName: role,
      email,
      phone,
    });

    setOpen(false);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Edit</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Name <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }} />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label>Role <span className="text-red-500">*</span></Label>
            <Select value={role} onValueChange={value => { setRole(value); setErrors(prev => ({ ...prev, role: '' })); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {contactRoles.length > 0 ? contactRoles.map(r => (
                  <SelectItem key={r.roleId} value={r.roleName}>{r.roleName}</SelectItem>
                )) : <SelectItem value="loading" disabled>Loading roles...</SelectItem>}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-destructive mt-1">{errors.role}</p>}
          </div>

          <div>
            <Label>Email</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <Button onClick={handleUpdate}>Update</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DeleteContactDialog = ({ contact }: { contact: ClubContact }) => {
  const { deleteClubContact } = useAppContext();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    await deleteClubContact(contact.clubContactId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">Delete</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Contact</DialogTitle>
        </DialogHeader>

        <p>
          Are you sure you want to delete <b>{contact.contactName}</b>?
        </p>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const UpdateClubDialog = ({ club }: { club: Club }) => {
  const { updateClub } = useAppContext();

  const [open, setOpen] = useState(false);
  const [clubName, setClubName] = useState(club.clubName);
  const [country, setCountry] = useState(club.country);
  const [addressLine, setAddressLine] = useState(club.addressLine || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(club.logoUrl || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};

    if (!clubName.trim()) nextErrors.clubName = 'Required field';
    if (!country.trim()) nextErrors.country = 'Required field';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await updateClub(
      { ...club, clubName, country, addressLine },
      logoFile
    );

    setOpen(false);
    setLogoFile(null);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) {
        setClubName(club.clubName);
        setCountry(club.country);
        setAddressLine(club.addressLine || '');
        setLogoPreview(club.logoUrl || '');
        setLogoFile(null);
      }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Update Club</Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Club</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Club Logo</Label>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                  : <Building2 size={20} className="text-muted-foreground" />}
              </div>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLogoFile(file);
                  const reader = new FileReader();
                  reader.onload = () => setLogoPreview(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </div>
          </div>

          <div>
            <Label>Club Name <span className="text-red-500">*</span></Label>
            <Input value={clubName} onChange={(e) => { setClubName(e.target.value); setErrors(prev => ({ ...prev, clubName: '' })); }} />
            {errors.clubName && <p className="text-xs text-destructive mt-1">{errors.clubName}</p>}
          </div>

          <div>
            <Label>Country <span className="text-red-500">*</span></Label>
            <Input value={country} onChange={(e) => { setCountry(e.target.value); setErrors(prev => ({ ...prev, country: '' })); }} />
            {errors.country && <p className="text-xs text-destructive mt-1">{errors.country}</p>}
          </div>

          <div>
            <Label>Address</Label>
            <Input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Update Club
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


const DeleteClubDialog = ({ club }) => {

  const { deleteClub } = useAppContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    await deleteClub(club.clubId);

    setOpen(false);
    navigate("/clubs");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          <Trash2 size={16} />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Club</DialogTitle>
        </DialogHeader>

        <p>
          Are you sure you want to delete <b>{club.clubName}</b> ?
        </p>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>

          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

const DeleteDocumentDialog = ({ doc }) => {
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
  clubId,
  onUpload,
  doc, // optional for edit
}: {
  clubId: string;
  onUpload: (file: File, clubId?: string, playerId?: string, type?: string) => void;
  doc?: any;
}) => {
  const { updateDocument } = useAppContext();

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState(doc?.documentType || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (doc && open) {
      setType(doc.documentType || '');
    } else if (!doc && open) {
      setType('');
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

    // EDIT MODE
    if (isEdit) {
      let payload: any = {
        documentType: type,
        documentName: doc.documentName,
        clubId: doc.clubId,
        playerId: doc.playerId,
        fileData: doc.fileData,
        fileSizeLabel: doc.fileSizeLabel,
      };

      if (file) {
        const base64 = await fileToBase64(file);

        payload.fileData = base64.split(',')[1];
        payload.documentName = file.name;
        payload.fileSizeLabel = `${(file.size / 1024).toFixed(1)} KB`;
      }

      await updateDocument(doc.documentId, payload);
    }
    // ✅ ADD MODE
    else {
      if (!file) return;
      onUpload(file, clubId, undefined, type);
    }

    setOpen(false);
    setFile(null);

    if (isEdit) {
      setType(doc.documentType || '');
    } else {
      setType('');
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
          {/* TYPE */}
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

          {/* EXISTING FILE (EDIT MODE) */}
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

          {/* FILE INPUT */}
          <div>
            <Label>{isEdit ? 'Replace File (optional)' : 'File'} {!isEdit && <span className="text-red-500">*</span>}</Label>
            <Input
              type="file"
              onChange={(e) => { setFile(e.target.files?.[0] || null); setErrors(prev => ({ ...prev, file: '' })); }}
            />
            {errors.file && <p className="text-xs text-destructive mt-1">{errors.file}</p>}
          </div>

          <Button onClick={handleSubmit} className="w-full">
            {isEdit ? 'Update' : 'Upload'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClubProfile;
