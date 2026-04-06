import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '@/context/PlayerContext';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/accessPolicy';
import { Club } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, MapPin, Building2 } from 'lucide-react';

const Clubs = () => {
  const { clubs, addClub, clubContacts } = useAppContext();
  const { user } = useAuth();
  const canManageClubs = hasPermission(user?.role, 'clubs:manage');
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');

  const handleAddClub = async (club: Club, logoFile?: File | null) => {
    try {
      await addClub(club, logoFile);
    } catch (err) {
      console.error('Failed to create club', err);
    }
  };

  const countries = useMemo(() => [...new Set(clubs.map(c => c.country))].sort(), [clubs]);

  const filtered = useMemo(() => {
    return clubs.filter(c => {
      const matchesSearch = c.clubName.toLowerCase().includes(search.toLowerCase()) || c.country.toLowerCase().includes(search.toLowerCase());
      const matchesCountry = countryFilter === 'all' || c.country === countryFilter;
      return matchesSearch && matchesCountry;
    });
  }, [clubs, search, countryFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clubs</h1>
        {canManageClubs && <AddClubDialog onAdd={handleAddClub} />}

      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search clubs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(club => {
          const contactCount = clubContacts.filter(cc => cc.clubId === club.clubId).length;
          return (
            <Link key={club.clubId} to={`/clubs/${club.clubId}`}>
              <Card className="hover:border-primary/30 transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {club.logoUrl
                        ? <img src={club.logoUrl} alt={club.clubName} className="w-full h-full object-cover" />
                        : <Building2 size={18} className="text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{club.clubName}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {club.country}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{contactCount} contact{contactCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No clubs found</p>}
    </div>
  );
};

const AddClubDialog = ({ onAdd }: { onAdd: (c: Club, logoFile?: File | null) => void }) => {
  const [open, setOpen] = useState(false);
  const [clubName, setclubName] = useState('');
  const [country, setCountry] = useState('');
  const [addressLine, setAddress] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setclubName('');
    setCountry('');
    setAddress('');
    setLogoFile(null);
    setLogoPreview('');
    setErrors({});
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};

    if (!clubName.trim()) nextErrors.clubName = 'Required field';
    if (!country.trim()) nextErrors.country = 'Required field';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onAdd(
      {
        clubId: crypto.randomUUID(), clubName, country, addressLine: addressLine || undefined,
        logoUrl: '',
        createdAt: ''
      },
      logoFile
    );
    setOpen(false);
    setclubName(''); setCountry(''); setAddress('');
    setLogoFile(null); setLogoPreview('');
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus size={14} className="mr-1" /> Add Club</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add New Club</DialogTitle></DialogHeader>
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
          <div><Label>Name <span className="text-red-500">*</span></Label><Input value={clubName} onChange={e => { setclubName(e.target.value); setErrors(prev => ({ ...prev, clubName: '' })); }} />
            {errors.clubName && <p className="text-xs text-destructive mt-1">{errors.clubName}</p>}
          </div>
          <div><Label>Country <span className="text-red-500">*</span></Label><Input value={country} onChange={e => { setCountry(e.target.value); setErrors(prev => ({ ...prev, country: '' })); }} />
            {errors.country && <p className="text-xs text-destructive mt-1">{errors.country}</p>}
          </div>
          <div><Label>Address</Label><Input value={addressLine} onChange={e => setAddress(e.target.value)} /></div>
          <Button onClick={handleSubmit} className="w-full">Add Club</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Clubs;
