import { Task } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Circle, Calendar, Edit, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskDetailsModalProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
    assignedScoutName?: string;
    createdByName?: string;
    getEntityName?: (task: Task) => string | undefined;
    onUpdateTask?: (task: Task) => void;
    scouts?: any[];
    players?: any[];
    clubs?: any[];
    isScout?: boolean;
}

const sourceColors: Record<string, string> = {
    contract: 'bg-orange-100 text-orange-800',
    review: 'bg-blue-100 text-blue-800',
    note: 'bg-purple-100 text-purple-800',
    manual: 'bg-gray-100 text-gray-800',
};

interface Comment {
    id: string;
    author: string;
    role: string;
    content: string;
    timestamp: string;
    avatar?: string;
}

export const TaskDetailsModal = ({
    task,
    isOpen,
    onClose,
    assignedScoutName = 'Unknown Scout',
    createdByName = 'Admin',
    getEntityName,
    onUpdateTask,
    scouts = [],
    players = [],
    clubs = [],
    isScout = false,
}: TaskDetailsModalProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editDueDate, setEditDueDate] = useState('');
    const [editAssignedToScoutId, setEditAssignedToScoutId] = useState('');
    const [editAssignedEntityType, setEditAssignedEntityType] = useState<'player' | 'club'>('player');
    const [editAssignedEntityId, setEditAssignedEntityId] = useState('');

    const getDisplayEntityName = (task: Task): string => {
        if (task.playerId) {
            return players.find(p => String(p.id) === task.playerId)?.fullName || 'N/A';
        }
        if (task.clubId) {
            return clubs.find(c => String(c.clubId) === task.clubId)?.clubName || 'N/A';
        }
        return 'N/A';
    };

    useEffect(() => {
        if (task) {
            setEditDueDate(task.dueDate);
            setEditAssignedToScoutId(task.assignedToScoutId);
            setEditAssignedEntityType(task.playerId ? 'player' : 'club');
            setEditAssignedEntityId(task.playerId ? String(task.playerId) : (task.clubId || ''));
        }
    }, [task]);

    const handleSave = () => {
        if (task && onUpdateTask) {
            onUpdateTask({
                ...task,
                dueDate: editDueDate,
                assignedToScoutId: editAssignedToScoutId,
                playerId: editAssignedEntityType === 'player' ? editAssignedEntityId : undefined,
                clubId: editAssignedEntityType === 'club' ? editAssignedEntityId : undefined,
            });
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        if (task) {
            setEditDueDate(task.dueDate);
            setEditAssignedToScoutId(task.assignedToScoutId);
            setEditAssignedEntityType(task.playerId ? 'player' : 'club');
            setEditAssignedEntityId(task.playerId ? String(task.playerId) : (task.clubId || ''));
        }
        setIsEditing(false);
    };
    // Static comments for demonstration
    const staticComments: Comment[] = [
        {
            id: '1',
            author: createdByName,
            role: 'Task Creator',
            content: 'This task needs to be completed by the end of the week. Please prioritize it.',
            timestamp: format(new Date(Date.now() - 86400000), 'MMM d, yyyy \'at\' h:mm a'),
            avatar: '👤',
        },
        {
            id: '2',
            author: assignedScoutName,
            role: 'Assigned Scout',
            content: 'Understood. I will start working on this task and provide an update by Wednesday.',
            timestamp: format(new Date(Date.now() - 43200000), 'MMM d, yyyy \'at\' h:mm a'),
            avatar: '👤',
        },
        {
            id: '3',
            author: createdByName,
            role: 'Task Creator',
            content: 'Great! Keep me updated on the progress.',
            timestamp: format(new Date(Date.now() - 3600000), 'MMM d, yyyy \'at\' h:mm a'),
            avatar: '👤',
        },
    ];

    if (!task) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl">{task.title}</DialogTitle>
                        {onUpdateTask && (
                            <div className="flex gap-2 mt-3">
                                {isEditing ? (
                                    <>
                                        <Button size="sm" onClick={handleSave} className="h-8">
                                            <Save size={14} className="mr-1" /> Save
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={handleCancel} className="h-8">
                                            <X size={14} className="mr-1" /> Cancel
                                        </Button>
                                    </>
                                ) : (
                                    // <div className='mt-5'>
                                        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="h-8">
                                        <Edit size={14} className="mr-1" /> Edit
                                    </Button>
                                    // </div>
                                )}
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Task Details Section */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Description</h3>
                            <p className="text-sm">{task.description || 'No description provided'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Status</h3>
                                <div className="flex items-center gap-2">
                                    {task.status === 'completed' ? <CheckCircle size={18} className="text-green-600" /> : <Circle size={18} className="text-muted-foreground" />}
                                    <span className="text-sm capitalize">{task.status}</span>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Source</h3>
                                <Badge variant="secondary" className={sourceColors[task.source]}>
                                    {task.source}
                                </Badge>
                            </div>

                            <div>
                                <Label className="text-sm font-semibold text-muted-foreground">Due Date</Label>
                                {isEditing ? (
                                    <Input
                                        type="date"
                                        value={editDueDate}
                                        onChange={(e) => setEditDueDate(e.target.value)}
                                        className="mt-2"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 text-sm mt-2">
                                        <Calendar size={16} />
                                        {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label className="text-sm font-semibold text-muted-foreground">Assigned To</Label>
                                {isEditing ? (
                                    <div className="space-y-2 mt-2">
                                        {!isScout && (
                                            <Select value={editAssignedEntityType} onValueChange={(value: any) => {
                                                setEditAssignedEntityType(value);
                                                setEditAssignedEntityId('');
                                            }}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="player">Player</SelectItem>
                                                    <SelectItem value="club">Club</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <Select value={editAssignedEntityId} onValueChange={setEditAssignedEntityId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={editAssignedEntityType === 'player' ? 'Select a player' : 'Select a club'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {editAssignedEntityType === 'player' && players.map(player => (
                                                    <SelectItem key={player.id} value={String(player.id)}>
                                                        {player.fullName}
                                                    </SelectItem>
                                                ))}
                                                {editAssignedEntityType === 'club' && clubs.map(club => (
                                                    <SelectItem key={club.clubId} value={club.clubId}>
                                                        {club.clubName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <p className="text-sm mt-2">{task ? getDisplayEntityName(task) : 'N/A'}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label className="text-sm font-semibold text-muted-foreground">Assigned By</Label>
                            {isEditing ? (
                                <Select value={editAssignedToScoutId} onValueChange={setEditAssignedToScoutId}>
                                    <SelectTrigger className="mt-2">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {scouts.map(scout => (
                                            <SelectItem key={scout.scoutId} value={scout.scoutId}>
                                                {scout.scoutName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm mt-2">{assignedScoutName}</p>
                            )}
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Created</h3>
                            <p className="text-sm text-muted-foreground">{format(new Date(task.createdAt), 'MMM d, yyyy \'at\' h:mm a')}</p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t"></div>

                    {/* Comments Section */}
                    {/* <div className="space-y-4">
            <h3 className="text-sm font-semibold">Comments</h3>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {staticComments.map(comment => (
                <Card key={comment.id}>
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 text-xl">{comment.avatar}</div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold">{comment.author}</p>
                          <p className="text-xs text-muted-foreground">{comment.role}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{comment.timestamp}</p>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground italic">Comment functionality will be added in future updates</p>
            </div>
          </div> */}

                    {/* Comments Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Comments</h3>

                        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                            {staticComments.map(comment => {
                                const isCreator = comment.role === 'Task Creator';

                                return (
                                    <div
                                        key={comment.id}
                                        className={`flex items-start gap-3 ${isCreator ? 'flex-row-reverse' : ''}`}
                                    >
                                        {/* Avatar */}
                                        <div className="h-9 w-9 flex items-center justify-center rounded-full bg-muted text-sm">
                                            {comment.avatar}
                                        </div>

                                        {/* Message Bubble */}
                                        <div className="max-w-[75%]">
                                            <div
                                                className={`rounded-xl px-4 py-2 shadow-sm ${isCreator
                                                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                        : 'bg-muted rounded-tl-none'
                                                    }`}
                                            >
                                                <p className="text-sm">{comment.content}</p>
                                            </div>

                                            {/* Meta Info */}
                                            <div
                                                className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${isCreator ? 'justify-end' : 'justify-start'
                                                    }`}
                                            >
                                                <span className="font-medium">{comment.author}</span>
                                                <span>•</span>
                                                <span>{comment.timestamp}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add Comment Placeholder */}
                        <div className="border-t pt-3">
                            <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground italic">
                                Comment functionality will be added in future updates
                            </div>
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
};
