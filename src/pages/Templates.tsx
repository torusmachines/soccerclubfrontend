import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/PlayerContext';
import { Template, TemplateType, TEMPLATE_VARIABLES } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Mail, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';

const typeIcons: Record<TemplateType, any> = { email: Mail, letter: FileText, report: FileText };
const typeColors: Record<TemplateType, string> = { email: 'bg-blue-100 text-blue-800', letter: 'bg-green-100 text-green-800', report: 'bg-purple-100 text-purple-800' };

const Templates = () => {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useAppContext();
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Templates</h1>
        <TemplateDialog onSave={addTemplate} />
      </div>

      <div className="text-sm text-muted-foreground">
        Available variables: {TEMPLATE_VARIABLES.map(v => <code key={v} className="mx-1 px-1 py-0.5 bg-secondary rounded text-xs">{v}</code>)}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {templates.map(tmpl => {
          const Icon = typeIcons[tmpl.templateType];
          return (
            <Card key={tmpl.templateId}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="text-primary" />
                    <span className="font-medium text-sm">{tmpl.templateName}</span>
                    <Badge variant="secondary" className={typeColors[tmpl.templateType]}>{tmpl.templateType}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <TemplateDialog template={tmpl} onSave={updateTemplate} />
                    {/* <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTemplate(tmpl.templateId)}>
                      <Trash2 size={12} />
                    </Button> */}
                    <DeleteTemplateDialog
                      template={tmpl}
                      onDelete={deleteTemplate}
                    />
                  </div>
                </div>
                {tmpl.subject && <p className="text-xs text-muted-foreground mb-1">Subject: {tmpl.subject}</p>}
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">{tmpl.body}</p>
                <p className="text-[10px] text-muted-foreground mt-2">Created: {format(new Date(tmpl.createdAt), 'MMM d, yyyy')}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {templates.length === 0 && <p className="text-center text-muted-foreground py-8">No templates created</p>}
    </div>
  );
};

const TemplateDialog = ({ template, onSave }: { template?: Template; onSave: (t: Template) => void }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(template?.templateName || '');
  const [type, setType] = useState<TemplateType>(template?.templateType || 'email');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setName('');
    setType('email');
    setSubject('');
    setBody('');
    setErrors({});
  };

  useEffect(() => {
    if (!open && !template) {
      resetForm();
    }
  }, [open, template]);

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = 'Required field';
    if (!body.trim()) nextErrors.body = 'Required field';
    if (type === 'email' && !subject.trim()) nextErrors.subject = 'Required field';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave({
      templateId: template?.templateId || '',
      templateName: name,
      templateType: type,
      subject: type === 'email' ? subject : undefined,
      body,
      createdAt: template?.createdAt || '',
    });
    setOpen(false);
    if (!template) { setName(''); setType('email'); setSubject(''); setBody(''); }
    setErrors({});
  };



  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v && !template) {
        resetForm();
      }
      setOpen(v);
      if (v && template) { setName(template.templateName); setType(template.templateType); setSubject(template.subject || ''); setBody(template.body); }
    }}>
      <DialogTrigger asChild>
        {template ? <Button variant="ghost" size="icon" className="h-7 w-7"><Edit size={12} /></Button>
          : <Button size="sm"><Plus size={14} className="mr-1" /> New Template</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{template ? 'Edit' : 'New'} Template</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name <span className="text-red-500">*</span></Label><Input value={name} onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }} />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div><Label>Type</Label>
            <Select value={type} onValueChange={v => { setType(v as TemplateType); setErrors(prev => ({ ...prev, subject: '' })); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="letter">Letter</SelectItem>
                <SelectItem value="report">Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === 'email' && <div><Label>Subject <span className="text-red-500">*</span></Label><Input value={subject} onChange={e => { setSubject(e.target.value); setErrors(prev => ({ ...prev, subject: '' })); }} />
            {errors.subject && <p className="text-xs text-destructive mt-1">{errors.subject}</p>}
          </div>}
          <div><Label>Body <span className="text-red-500">*</span></Label><Textarea value={body} onChange={e => { setBody(e.target.value); setErrors(prev => ({ ...prev, body: '' })); }} rows={10} />
            {errors.body && <p className="text-xs text-destructive mt-1">{errors.body}</p>}
          </div>
          <p className="text-xs text-muted-foreground">Variables: {TEMPLATE_VARIABLES.join(', ')}</p>
          <Button onClick={handleSubmit} className="w-full">{template ? 'Update' : 'Create'} Template</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

 // ==========================

  const DeleteTemplateDialog = ({
    template,
    onDelete,
  }: {
    template: Template;
    onDelete: (id: string) => void;
  }) => {

    const [open, setOpen] = useState(false);

    const handleDelete = async () => {
      await onDelete(template.templateId);
      setOpen(false);
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
          >
            <Trash2 size={12} />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Are you sure you want to delete this template?
            </p>

            <div className="border rounded-md p-3 bg-muted/40">
              <p><strong>Name:</strong> {template.templateName}</p>
              <p><strong>Type:</strong> {template.templateType}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ==========================

export default Templates;
