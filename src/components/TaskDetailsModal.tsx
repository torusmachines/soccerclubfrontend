import { Task } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Circle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface TaskDetailsModalProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
    assignedScoutName?: string;
    createdByName?: string;
    getEntityName?: (task: Task) => string | undefined;
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
}: TaskDetailsModalProps) => {
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
                    <DialogTitle className="text-xl">{task.title}</DialogTitle>
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
                                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Due Date</h3>
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar size={16} />
                                    {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Assigned To</h3>
                                <p className="text-sm">{assignedScoutName}</p>
                            </div>
                        </div>

                        {getEntityName && task && (
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Related To</h3>
                                <p className="text-sm">{getEntityName(task) || 'N/A'}</p>
                            </div>
                        )}

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
