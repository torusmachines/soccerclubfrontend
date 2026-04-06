

import { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '@/context/PlayerContext';
import { Scout } from '@/types';
import { useSearchParams } from 'react-router-dom';
import { inviteUserApi } from '@/services/apiService';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { isPlayerRole, isScoutRole } from '@/lib/accessPolicy';

const Scouts = () => {
  const { user } = useAuth();
  const isPlayer = isPlayerRole(user?.role);
  const isScout = isScoutRole(user?.role);
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scouts</h1>
        {/* Add Scout hidden for both Player and Scout roles */}
        {!isPlayer && !isScout && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1" /> Add Scout
          </Button>
        )}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input 
          placeholder="Search scouts by name, role, email or phone..." 
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
                      {/* Scout: edit only own row; Admin: edit any */}
                      {(!isScout || scout.scoutId === ownScoutId) && (
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
          title="Add New Scout"
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
        createdAt: initialScout?.createdAt || new Date().toISOString()
      };

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
            <Label>Full Name (Scout Name) <span className="text-red-500">*</span></Label>
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
              placeholder="e.g., Senior Scout, Youth Scout"
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
              placeholder="scout@example.com"
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
              {initialScout ? 'Updating...' : 'Adding scout...'}
            </>
          ) : (
            initialScout ? 'Update Scout' : 'Add Scout'
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default Scouts;
