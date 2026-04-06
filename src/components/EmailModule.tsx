import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/context/PlayerContext';
import { Email, EntityType, Template, TEMPLATE_VARIABLES } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Mail, Send, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface EmailModuleProps {
  entityType: EntityType;
  entityId: string;
  readOnly?: boolean;
}

export const EmailModule = ({ entityType, entityId, readOnly = false }: EmailModuleProps) => {
  const { emails, addEmail, scouts, templates, updateEmail, deleteEmail, } = useAppContext();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // const entityEmails = useMemo(() =>
  //   emails.filter(e => e.playerId === entityType && e.clubId === entityId)
  //     .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()),
  //   [emails, entityType, entityId]
  // );
  const entityEmails = useMemo(() =>
    emails
      .filter(e =>
        (entityType === 'player' && String(e.playerId) === String(entityId)) ||
        (entityType === 'club' && String(e.clubId) === String(entityId))
      )
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()),
    [emails, entityType, entityId]
  );

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end">
          <ComposeEmailDialog entityType={entityType} entityId={entityId} scouts={scouts} templates={templates} onSend={addEmail} />
        </div>
      )}
      {!readOnly && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Email</DialogTitle>
            </DialogHeader>

          {selectedEmail && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Are you sure you want to delete this email?
              </p>

              <div className="bg-muted p-3 rounded-md space-y-1">
                <p>
                  <span className="font-medium">Subject:</span> {selectedEmail.subject}
                </p>

                <p>
                  <span className="font-medium">To:</span> {selectedEmail.recipientEmail}
                </p>

                <p>
                  <span className="font-medium">From:</span>{" "}
                  {scouts.find(s => s.scoutId === selectedEmail.sentByScoutId)?.scoutName || selectedEmail.sentByScoutId}
                </p>

                <p>
                  <span className="font-medium">Date:</span>{" "}
                  {format(new Date(selectedEmail.sentAt), 'MMM d, yyyy HH:mm')}
                </p>
              </div>

              <p className="text-xs text-red-500">
                This action cannot be undone.
              </p>
            </div>
          )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={async () => {
                  if (selectedEmail) {
                    await deleteEmail(selectedEmail.emailId);
                  }
                  setDeleteOpen(false);
                  setSelectedEmail(null);
                }}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {entityEmails.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No emails sent yet</p>
      ) : (
        <div className="space-y-3">
          {entityEmails.map(email => (
            <Card key={email.emailId}>
              <CardContent className="p-4">
                {/* <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-muted-foreground" />
                    <span className="font-medium text-sm">{email.subject}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(email.sentAt), 'MMM d, yyyy HH:mm')}</span>
                </div> */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-muted-foreground" />
                    <span className="font-medium text-sm">{email.subject}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(email.sentAt), 'MMM d, yyyy HH:mm')}
                    </span>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => {
                          setSelectedEmail(email);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">To: {email.recipientEmail} · From: {scouts.find(s => s.scoutId === email.sentByScoutId)?.scoutName || email.sentByScoutId}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{email.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const ComposeEmailDialog = ({ entityType, entityId, scouts, templates, onSend }: {
  entityType: EntityType; entityId: string; scouts: any[]; templates: Template[]; onSend: (e: Email) => Promise<void>;
}) => {
  const { players, clubs, reviews } = useAppContext();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sentBy, setSentBy] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setTo('');
      setSubject('');
      setBody('');
      setSentBy('');
      setErrors({});
    }
  }, [open]);

  const resolveVariables = (text: string): string => {
    if (!text) return text;

    let resolved = text;

    if (entityType === 'player') {
      const player = players.find(p => String(p.id) === String(entityId));
      const club = clubs.find(c => c.clubId === player?.currentClub);
      const playerReviews = reviews
        .filter(r => String(r.playerId) === String(entityId))
        .sort((a, b) => {
          const aTime = a.matchDate ? new Date(a.matchDate).getTime() : new Date(a.createdAt).getTime();
          const bTime = b.matchDate ? new Date(b.matchDate).getTime() : new Date(b.createdAt).getTime();
          return bTime - aTime;
        });
      const latestReview = playerReviews[0];

      resolved = resolved
        .replace(/\{PlayerName\}/gi, player?.fullName ?? '')
        .replace(/\{ClubName\}/gi, club?.clubName ?? '')
        .replace(/\{AgentName\}/gi, player?.agentName ?? '')
        .replace(/\{ReviewDate\}/gi,
          latestReview && latestReview.matchDate ? format(new Date(latestReview.matchDate), 'MMM d, yyyy') : ''
        )
        .replace(/\{Skill\}/gi, ''); // no single "skill" on a player — leave blank or customise
    }

    if (entityType === 'club') {
      const club = clubs.find(c => c.clubId === entityId);
      resolved = resolved
        .replace(/\{ClubName\}/gi, club?.clubName ?? '')
        .replace(/\{PlayerName\}/gi, '')
        .replace(/\{AgentName\}/gi, '')
        .replace(/\{ReviewDate\}/gi, '')
        .replace(/\{Skill\}/gi, '');
    }

    return resolved;
  };

  // const applyTemplate = (templateId: string) => {
  //   const tmpl = templates.find(t => t.templateId === templateId);
  //   if (tmpl) {
  //     setSubject(tmpl.subject || '');
  //     setBody(tmpl.body);
  //   }
  // };

  const applyTemplate = (templateId: string) => {
    const tmpl = templates.find(t => t.templateId === templateId);
    if (tmpl) {
      setSubject(resolveVariables(tmpl.subject || ''));
      setBody(resolveVariables(tmpl.body));
    }
  };

  const handleSend = () => {
    const nextErrors: Record<string, string> = {};

    if (!to.trim()) nextErrors.to = 'Required field';
    if (!subject.trim()) nextErrors.subject = 'Required field';
    if (!body.trim()) nextErrors.body = 'Required field';
    if (!sentBy.trim()) nextErrors.sentBy = 'Required field';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSend({
      emailId: '',                                              // ignored, API generates it
      playerId: entityType === 'player' ? entityId : undefined,
      clubId: entityType === 'club' ? entityId : undefined,
      recipientEmail: to,
      subject,
      body,
      sentByScoutId: sentBy,
      sentAt: new Date().toISOString(),
    });
    setOpen(false);
    setTo(''); setSubject(''); setBody(''); setSentBy('');
    setErrors({});
  };



  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Send size={14} className="mr-1" /> Compose Email</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Compose Email</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {templates.filter(t => t.templateType === 'email').length > 0 && (
            <div><Label>Use Template</Label>
              <Select onValueChange={applyTemplate}>
                <SelectTrigger><SelectValue placeholder="Select template..." /></SelectTrigger>
                <SelectContent>{templates.filter(t => t.templateType === 'email').map(t => <SelectItem key={t.templateId} value={t.templateId}>{t.templateName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div><Label>To <span className="text-red-500">*</span></Label><Input value={to} onChange={e => { setTo(e.target.value); setErrors(prev => ({ ...prev, to: '' })); }} placeholder="recipient@email.com" />
            {errors.to && <p className="text-xs text-destructive mt-1">{errors.to}</p>}
          </div>
          <div><Label>Subject <span className="text-red-500">*</span></Label><Input value={subject} onChange={e => { setSubject(e.target.value); setErrors(prev => ({ ...prev, subject: '' })); }} />
            {errors.subject && <p className="text-xs text-destructive mt-1">{errors.subject}</p>}
          </div>
          <div><Label>Body <span className="text-red-500">*</span></Label><Textarea value={body} onChange={e => { setBody(e.target.value); setErrors(prev => ({ ...prev, body: '' })); }} rows={8} />
            {errors.body && <p className="text-xs text-destructive mt-1">{errors.body}</p>}
          </div>
          <p className="text-xs text-muted-foreground">Variables: {TEMPLATE_VARIABLES.join(', ')}</p>
          <div><Label>Sent By <span className="text-red-500">*</span></Label>
            <Select value={sentBy} onValueChange={value => { setSentBy(value); setErrors(prev => ({ ...prev, sentBy: '' })); }}>
              <SelectTrigger><SelectValue placeholder="Select scout" /></SelectTrigger>
              <SelectContent>{scouts.map(s => <SelectItem key={s.scoutId} value={s.scoutId}>{s.scoutName}</SelectItem>)}</SelectContent>
            </Select>
            {errors.sentBy && <p className="text-xs text-destructive mt-1">{errors.sentBy}</p>}
          </div>
          <Button onClick={handleSend} className="w-full"><Send size={14} className="mr-1" /> Send Email</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
