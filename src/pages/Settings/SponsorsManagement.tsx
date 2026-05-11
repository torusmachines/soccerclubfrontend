import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { createSponsorApi, createSponsorCommentApi, fetchSponsorComments, fetchSponsors, updateSponsorApi } from '@/services/apiService';
import type { Sponsor, SponsorComment } from '@/types';
import { MessageSquare, Pencil, Plus, Search } from 'lucide-react';

const SponsorsManagement = () => {
  const { toast } = useToast();

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);
  const [sponsorComments, setSponsorComments] = useState<SponsorComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [updatingSponsor, setUpdatingSponsor] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [editCompanyName, setEditCompanyName] = useState('');
  const [editContactName, setEditContactName] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const loadSponsors = async () => {
    setLoading(true);
    try {
      const data = await fetchSponsors();
      setSponsors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load sponsors', error);
      setSponsors([]);
      toast({ title: 'Error', description: 'Failed to load sponsors', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSponsors();
  }, []);

  const filteredSponsors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sponsors;

    return sponsors.filter((sponsor) => {
      const haystack = [
        sponsor.companyName,
        sponsor.contactName,
        sponsor.contactEmail,
        sponsor.contactPhone,
        sponsor.address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [search, sponsors]);

  const resetCreateForm = () => {
    setCompanyName('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setAddress('');
    setNotes('');
  };

  const handleCreateSponsor = async () => {
    if (!companyName.trim()) {
      toast({ title: 'Validation', description: 'Company Name is required.', variant: 'destructive' });
      return;
    }

    try {
      await createSponsorApi({
        companyName: companyName.trim(),
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast({ title: 'Success', description: 'Sponsor created successfully.' });
      setIsCreateOpen(false);
      resetCreateForm();
      loadSponsors();
    } catch (error) {
      console.error('Failed to create sponsor', error);
      toast({ title: 'Error', description: 'Failed to create sponsor.', variant: 'destructive' });
    }
  };

  const openComments = (sponsor: Sponsor) => {
    setSelectedSponsor(sponsor);
    setNewComment('');
    loadSponsorComments(sponsor.id);
    setIsCommentsOpen(true);
  };

  const openEdit = (sponsor: Sponsor) => {
    setSelectedSponsor(sponsor);
    setEditCompanyName(sponsor.companyName ?? '');
    setEditContactName(sponsor.contactName ?? '');
    setEditContactEmail(sponsor.contactEmail ?? '');
    setEditContactPhone(sponsor.contactPhone ?? '');
    setEditAddress(sponsor.address ?? '');
    setEditNotes(sponsor.notes ?? '');
    setIsEditOpen(true);
  };

  const handleUpdateSponsor = async () => {
    if (!selectedSponsor) return;

    if (!editCompanyName.trim()) {
      toast({ title: 'Validation', description: 'Company Name is required.', variant: 'destructive' });
      return;
    }

    try {
      setUpdatingSponsor(true);
      const updated = await updateSponsorApi(selectedSponsor.id, {
        companyName: editCompanyName.trim(),
        contactName: editContactName.trim() || undefined,
        contactEmail: editContactEmail.trim() || undefined,
        contactPhone: editContactPhone.trim() || undefined,
        address: editAddress.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });

      setSponsors((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSelectedSponsor(updated);
      setIsEditOpen(false);
      toast({ title: 'Success', description: 'Sponsor updated successfully.' });
    } catch (error) {
      console.error('Failed to update sponsor', error);
      toast({ title: 'Error', description: 'Failed to update sponsor.', variant: 'destructive' });
    } finally {
      setUpdatingSponsor(false);
    }
  };

  const loadSponsorComments = async (sponsorId: string) => {
    setCommentsLoading(true);
    try {
      const data = await fetchSponsorComments(sponsorId);
      setSponsorComments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load sponsor comments', error);
      setSponsorComments([]);
      toast({ title: 'Error', description: 'Failed to load sponsor comments.', variant: 'destructive' });
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedSponsor) return;

    if (!newComment.trim()) {
      toast({ title: 'Validation', description: 'Comment is required.', variant: 'destructive' });
      return;
    }

    try {
      setAddingComment(true);
      await createSponsorCommentApi(selectedSponsor.id, { comment: newComment.trim() });
      setNewComment('');
      await loadSponsorComments(selectedSponsor.id);
      toast({ title: 'Success', description: 'Comment added successfully.' });
    } catch (error) {
      console.error('Failed to add sponsor comment', error);
      toast({ title: 'Error', description: 'Failed to add comment.', variant: 'destructive' });
    } finally {
      setAddingComment(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6">
      <Card className="shadow-lg border rounded-2xl">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-2xl font-semibold">Sponsors</CardTitle>
          <p className="text-muted-foreground">View sponsor details and create sponsors from Settings.</p>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sponsors"
                className="pl-10"
              />
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetCreateForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Sponsor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Create Sponsor</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="companyName">Company Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter company name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input
                      id="contactName"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Enter contact person name"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactEmail">Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="name@company.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="contactPhone">Phone</Label>
                      <Input
                        id="contactPhone"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter address"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateSponsor}>Create Sponsor</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-lg">
            <div className="p-4">
              {loading ? (
                <p className="text-center text-sm text-muted-foreground py-8">Loading sponsors...</p>
              ) : filteredSponsors.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No sponsors found.</p>
              ) : (
                <div className="space-y-3">
                  {filteredSponsors.map((sponsor) => (
                    <div key={sponsor.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-md bg-muted/20">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{sponsor.companyName}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {sponsor.contactName || 'No contact name'} | {sponsor.contactEmail || 'No email'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(sponsor)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openComments(sponsor)}>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Comments
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Sponsor</DialogTitle>
          </DialogHeader>

          {selectedSponsor && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editCompanyName">Company Name <span className="text-red-500">*</span></Label>
                <Input
                  id="editCompanyName"
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <Label htmlFor="editContactName">Contact Name</Label>
                <Input
                  id="editContactName"
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                  placeholder="Enter contact person name"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editContactEmail">Email</Label>
                  <Input
                    id="editContactEmail"
                    type="email"
                    value={editContactEmail}
                    onChange={(e) => setEditContactEmail(e.target.value)}
                    placeholder="name@company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="editContactPhone">Phone</Label>
                  <Input
                    id="editContactPhone"
                    value={editContactPhone}
                    onChange={(e) => setEditContactPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editAddress">Address</Label>
                <Input
                  id="editAddress"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Enter address"
                />
              </div>
              <div>
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateSponsor} disabled={updatingSponsor}>
                  {updatingSponsor ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Sponsor Comments</DialogTitle>
          </DialogHeader>

          {selectedSponsor && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Company</p>
                <p className="font-medium">{selectedSponsor.companyName}</p>
              </div>

              <div className="pt-2 border-t space-y-3">
                <p className="text-muted-foreground">Admin Comments</p>

                <div className="space-y-2">
                  <Label htmlFor="newComment">Add Comment <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="newComment"
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write comment for this sponsor"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleAddComment} disabled={addingComment}>
                      {addingComment ? 'Adding...' : 'Add Comment'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {commentsLoading ? (
                    <p className="text-xs text-muted-foreground">Loading comments...</p>
                  ) : sponsorComments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No comments yet.</p>
                  ) : (
                    sponsorComments.map((comment) => (
                      <div key={comment.commentId} className="rounded-md border p-2 bg-muted/20">
                        <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(comment.createdByName || 'Admin')} · {new Date(comment.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SponsorsManagement;
