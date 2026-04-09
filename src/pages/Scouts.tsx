

import { useEffect, useState, useMemo, type MouseEvent } from 'react';
import { useAppContext } from '@/context/PlayerContext';
import { Scout } from '@/types';
import { useSearchParams } from 'react-router-dom';
import { inviteUserApi } from '@/services/apiService';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, Loader2, AccessibilityIcon, LockKeyholeIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { isPlayerRole, isScoutRole, isAdminRole } from '@/lib/accessPolicy';

const Scouts = () => {
  const { user } = useAuth();
  const isPlayer = isPlayerRole(user?.role);
  const isScout = isScoutRole(user?.role);
  const isAdmin = isAdminRole(user?.role);
  const { scouts, addScout, updateScout, deleteScout } = useAppContext();

  // Find the logged-in scout's own record by email match
  const ownScoutId = isScout
    ? scouts.find(s => (s.email || '').trim().toLowerCase() === (user?.email || '').trim().toLowerCase())?.scoutId
    : null;
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editingScout, setEditingScout] = useState<Scout | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [shouldOpenOwnEdit, setShouldOpenOwnEdit] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [lockingScout, setLockingScout] = useState<Scout | null>(null);
  const [selectedLockedAreas, setSelectedLockedAreas] = useState<string[]>([]);
  const [selectedShowAllPlayers, setSelectedShowAllPlayers] = useState(false);

  const filtered = useMemo(() => {
    return scouts.filter(s => {
      const matchesSearch = 
        s.scoutName.toLowerCase().includes(search.toLowerCase()) ||
        s.roleName.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.phoneNumber?.includes(search) ||
        false;
      return matchesSearch;
    });
  }, [scouts, search]);

  useEffect(() => {
    if (searchParams.get('editMe') === 'true') {
      setShouldOpenOwnEdit(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!shouldOpenOwnEdit) return;

    const ownScout = scouts.find(s => (s.email || '').trim().toLowerCase() === (user?.email || '').trim().toLowerCase());
    if (ownScout) {
      setEditingScout(ownScout);
      setEditOpen(true);
    }

    setShouldOpenOwnEdit(false);
  }, [shouldOpenOwnEdit, scouts, user?.email]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this scout?')) {
      await deleteScout(id);
    }
  };

  const handleEditClick = (scout: Scout) => {
    setEditingScout(scout);
    setEditOpen(true);
  };

  const handleLockClick = (scout: Scout) => {
    setLockingScout(scout);

    let locked: string[] = [];
    if (scout.lockedAreas) {
      try {
        const parsed = JSON.parse(scout.lockedAreas);
        locked = Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error('Failed to parse scout.lockedAreas', scout.scoutId, scout.lockedAreas, error);
        locked = [];
      }
    }

    console.log('Opening lock dialog for scout', scout.scoutId, { lockedAreas: scout.lockedAreas, parsedLockedAreas: locked });
    setSelectedLockedAreas(locked);
    setSelectedShowAllPlayers(scout.isShowPlayer ?? false);
    setLockOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Coaches</h1>
        {/* Add Scout hidden for both Player and Scout roles */}
        {!isPlayer && !isScout && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1" /> Add Coach
          </Button>
        )}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input 
          placeholder="Search coaches by name, role, email or phone..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="pl-9" 
        />
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Country</TableHead>
              {!isPlayer && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(scout => (
              <TableRow key={scout.scoutId}>
                <TableCell className="font-medium">{scout.scoutName}</TableCell>
                <TableCell>{scout.firstName || '-'}</TableCell>
                <TableCell>{scout.lastName || '-'}</TableCell>
                <TableCell>{scout.roleName}</TableCell>
                <TableCell>{scout.email || '-'}</TableCell>
                <TableCell>{scout.phoneNumber || '-'}</TableCell>
                <TableCell>{scout.city || '-'}</TableCell>
                <TableCell>{scout.country || '-'}</TableCell>
                {!isPlayer && (
                  <TableCell>
                    <div className="flex gap-2">
                      {/* Lock button only for Admin */}
                      {isAdmin && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleLockClick(scout)}
                        >
                          <LockKeyholeIcon size={14} />
                        </Button>
                      )}
                      {/* Scout: edit only own row; Admin: edit any */}
                      {!isScout && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditClick(scout)}
                        >
                          <Edit size={14} />
                        </Button>
                      )}
                      {/* Scout cannot delete; Admin can delete any */}
                      {!isScout && (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDelete(scout.scoutId)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No scouts found</p>
      )}

      {!isPlayer && !isScout && (
        <ScoutFormDialog 
          open={addOpen} 
          onOpenChange={setAddOpen}
          onSubmit={addScout}
          title="Add New Coach"
        />
      )}

      {!isPlayer && editingScout && (
        <ScoutFormDialog 
          open={editOpen} 
          onOpenChange={setEditOpen}
          onSubmit={updateScout}
          title="Edit Scout"
          initialScout={editingScout}
        />
      )}

      {isAdmin && lockingScout && (
        <LockAreasDialog
          open={lockOpen}
          onOpenChange={setLockOpen}
          scout={lockingScout}
          selectedAreas={selectedLockedAreas}
          onSelectedAreasChange={setSelectedLockedAreas}
          showAllPlayers={selectedShowAllPlayers}
          onShowAllPlayersChange={setSelectedShowAllPlayers}
          updateScout={updateScout}
        />
      )}
    </div>
  );
};

interface ScoutFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (scout: Scout) => Promise<void>;
  title: string;
  initialScout?: Scout;
}

const getInitialScoutForm = (initialScout?: Scout): Partial<Scout> => {
  if (!initialScout) {
    return {
      country: 'India'
    };
  }

  return {
    scoutName: initialScout.scoutName,
    roleName: initialScout.roleName,
    firstName: initialScout.firstName,
    lastName: initialScout.lastName,
    email: initialScout.email,
    phoneNumber: initialScout.phoneNumber,
    addressLine1: initialScout.addressLine1,
    addressLine2: initialScout.addressLine2,
    city: initialScout.city,
    state: initialScout.state,
    postalCode: initialScout.postalCode,
    country: initialScout.country || 'India'
  };
};

const ScoutFormDialog = ({
  open,
  onOpenChange,
  onSubmit,
  title,
  initialScout
}: ScoutFormDialogProps) => {
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<Scout>>(getInitialScoutForm(initialScout));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setForm(getInitialScoutForm(initialScout));
    setErrors({});
  }, [initialScout, open]);

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};

    const trimmedName = form.scoutName?.trim() || '';
    const trimmedRole = form.roleName?.trim() || '';

    if (!trimmedName) nextErrors.scoutName = 'Required field';
    if (!trimmedRole) nextErrors.roleName = 'Required field';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsLoading(true);

    try {
      const payload: Scout = {
        scoutId: initialScout?.scoutId || crypto.randomUUID(),
        scoutName: trimmedName,
        roleName: trimmedRole,
        firstName: form.firstName?.trim() || undefined,
        lastName: form.lastName?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phoneNumber: form.phoneNumber?.trim() || undefined,
        addressLine1: form.addressLine1?.trim() || undefined,
        addressLine2: form.addressLine2?.trim() || undefined,
        city: form.city?.trim() || undefined,
        state: form.state?.trim() || undefined,
        postalCode: form.postalCode?.trim() || undefined,
        country: form.country || 'India',
        lockedAreas: initialScout?.lockedAreas,
        createdAt: initialScout?.createdAt || new Date().toISOString()
      };

      console.log('ScoutFormDialog payload', payload);
      await onSubmit(payload);

      // If adding a new scout (not editing) and email is provided, send invite
      if (!initialScout && form.email?.trim()) {
        try {
          await inviteUserApi({
            email: form.email.trim(),
            fullName: trimmedName,
            role: 'Scout'
          });

          toast({
            title: '✓ Scout Added',
            description: `Scout added successfully and invitation email sent to ${form.email.trim()}.`,
            className: 'bg-green-600 text-white border-green-700'
          });
        } catch (inviteErr: any) {
          // Scout was saved but invite failed
          const inviteReason = inviteErr?.message ? ` Reason: ${inviteErr.message}` : '';
          toast({
            title: '⚠ Scout Added, Invite Failed',
            description: `Scout was added successfully, but the invitation email could not be sent to ${form.email.trim()}. You can retry sending the invite later.${inviteReason}`,
            className: 'bg-yellow-600 text-white border-yellow-700'
          });
        }
      }

      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: '✗ Error',
        description: err?.message || 'Failed to add scout.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          {/* Full Name / Scout Name */}
          <div className="col-span-2">
            <Label>Full Name (Coach Name) <span className="text-red-500">*</span></Label>
            <Input 
              value={form.scoutName || ''} 
              onChange={e => update('scoutName', e.target.value)} 
              placeholder="e.g., John Smith"
              disabled={isLoading}
            />
            {errors.scoutName ? <p className="text-xs text-destructive mt-1">{errors.scoutName}</p> : null}
          </div>

          {/* Role */}
          <div className="col-span-2">
            <Label>Role <span className="text-red-500">*</span></Label>
            <Input 
              value={form.roleName || ''} 
              onChange={e => update('roleName', e.target.value)} 
              placeholder="e.g., Senior Coach, Youth Coach, etc."
              disabled={isLoading}
            />
            {errors.roleName ? <p className="text-xs text-destructive mt-1">{errors.roleName}</p> : null}
          </div>

          {/* First Name */}
          <div>
            <Label>First Name</Label>
            <Input 
              value={form.firstName || ''} 
              onChange={e => update('firstName', e.target.value)} 
              placeholder="First name"
              disabled={isLoading}
            />
          </div>

          {/* Last Name */}
          <div>
            <Label>Last Name</Label>
            <Input 
              value={form.lastName || ''} 
              onChange={e => update('lastName', e.target.value)} 
              placeholder="Last name"
              disabled={isLoading}
            />
          </div>

          {/* Email */}
          <div>
            <Label>Email</Label>
            <Input 
              type="email"
              value={form.email || ''} 
              onChange={e => update('email', e.target.value)} 
              placeholder="coach@example.com"
              disabled={isLoading}
            />
          </div>

          {/* Phone Number */}
          <div>
            <Label>Phone Number</Label>
            <Input 
              type="tel"
              value={form.phoneNumber || ''} 
              onChange={e => update('phoneNumber', e.target.value)} 
              placeholder="+1 234 567 8900"
              disabled={isLoading}
            />
          </div>

          {/* Address Line 1 */}
          <div className="col-span-2">
            <Label>Address Line 1</Label>
            <Input 
              value={form.addressLine1 || ''} 
              onChange={e => update('addressLine1', e.target.value)} 
              placeholder="Street address"
              disabled={isLoading}
            />
          </div>

          {/* Address Line 2 */}
          <div className="col-span-2">
            <Label>Address Line 2</Label>
            <Input 
              value={form.addressLine2 || ''} 
              onChange={e => update('addressLine2', e.target.value)} 
              placeholder="Apartment, suite, etc."
              disabled={isLoading}
            />
          </div>

          {/* City */}
          <div>
            <Label>City</Label>
            <Input 
              value={form.city || ''} 
              onChange={e => update('city', e.target.value)} 
              placeholder="City"
              disabled={isLoading}
            />
          </div>

          {/* State */}
          <div>
            <Label>State</Label>
            <Input 
              value={form.state || ''} 
              onChange={e => update('state', e.target.value)} 
              placeholder="State/Province"
              disabled={isLoading}
            />
          </div>

          {/* Postal Code */}
          <div>
            <Label>Postal Code</Label>
            <Input 
              value={form.postalCode || ''} 
              onChange={e => update('postalCode', e.target.value)} 
              placeholder="Postal code"
              disabled={isLoading}
            />
          </div>

          {/* Country */}
          <div>
            <Label>Country</Label>
            <Input 
              value={form.country || ''} 
              onChange={e => update('country', e.target.value)} 
              placeholder="Country"
              disabled={isLoading}
            />
          </div>
        </div>
        <Button onClick={handleSubmit} className="w-full mt-6" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {initialScout ? 'Updating...' : 'Adding coach...'}
            </>
          ) : (
            initialScout ? 'Update Coach' : 'Add Coach'
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

const LockAreasDialog = ({
  open,
  onOpenChange,
  scout,
  selectedAreas,
  onSelectedAreasChange,
  showAllPlayers,
  onShowAllPlayersChange,
  updateScout
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scout: Scout | null;
  selectedAreas: string[];
  onSelectedAreasChange: (areas: string[]) => void;
  showAllPlayers: boolean;
  onShowAllPlayersChange: (value: boolean) => void;
  updateScout: (scout: Scout) => Promise<void>;
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const navigationItems = ['Clubs', 'Matching', 'Settings', 'Templates'];

  const handleSave = async (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    if (!scout) {
      console.warn('handleSave called without scout');
      return;
    }

    setIsLoading(true);
    const lockedAreasJson = JSON.stringify(selectedAreas || []);
    console.log('Saving locked areas for scout', scout.scoutId, { selectedAreas, lockedAreasJson, showAllPlayers });

    try {
      await updateScout({
        ...scout,
        lockedAreas: lockedAreasJson,
        isShowPlayer: showAllPlayers
      });
      toast({
        title: 'Success',
        description: `Locked areas updated for ${scout.scoutName}`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to update locked areas', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update locked areas',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleArea = (area: string) => {
    if (selectedAreas.includes(area)) {
      onSelectedAreasChange(selectedAreas.filter(a => a !== area));
    } else {
      onSelectedAreasChange([...selectedAreas, area]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lock Navigation Areas for {scout?.scoutName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="showAllPlayers">Show All Players (Yes/No)</Label>
              <p className="text-xs text-muted-foreground">Allow this scout to view all players.</p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="showAllPlayers" className="text-sm">
                <input
                  id="showAllPlayers"
                  type="checkbox"
                  checked={showAllPlayers}
                  onChange={e => onShowAllPlayersChange(e.target.checked)}
                  className="mr-2 h-4 w-4 rounded border"
                />
                {showAllPlayers ? 'Yes' : 'No'}
              </Label>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Select the navigation items to lock for this coach. Locked items will be hidden from their navigation menu.
          </p>
          <div className="space-y-2">
            {navigationItems.map(item => (
              <div key={item} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={item}
                  checked={selectedAreas.includes(item)}
                  onChange={() => toggleArea(item)}
                  className="rounded"
                />
                <Label htmlFor={item}>{item}</Label>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Scouts;

