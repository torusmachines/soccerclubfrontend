import { Task, TaskComment } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Circle, Calendar, Edit, Save, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { fetchTaskComments, createTaskCommentApi, updateTaskCommentApi, deleteTaskCommentApi } from '@/services/apiService';

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

export const TaskDetailsModal = ({
    task,
    isOpen,
    onClose,
    assignedScoutName = 'Auto-generated',
    createdByName = 'System',
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

    const { user } = useAuth();
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingComments, setLoadingComments] = useState(false);
    const [loadingMoreComments, setLoadingMoreComments] = useState(false);
    const [commentDraft, setCommentDraft] = useState('');
    const [commentVisibility, setCommentVisibility] = useState(true);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [editingCommentVisibility, setEditingCommentVisibility] = useState(true);
    const [commentError, setCommentError] = useState<string | null>(null);
    const [autoScrollToBottom, setAutoScrollToBottom] = useState(false);
    const commentsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen || !task) return;

        setComments([]);
        setPage(1);
        setHasMore(true);
        setCommentDraft('');
        setCommentVisibility(true);
        setEditingCommentId(null);
        setEditingCommentText('');
        setEditingCommentVisibility(true);
        setCommentError(null);

        loadComments(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, task?.taskId]);

    const sortCommentsAscending = (commentsToSort: TaskComment[]) =>
        [...commentsToSort].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

    const loadComments = async (requestedPage: number) => {
        if (!task) return;

        if (requestedPage === 1) {
            setLoadingComments(true);
        } else {
            setLoadingMoreComments(true);
        }

        try {
            const pageSize = 20;
            const pageComments = await fetchTaskComments(task.taskId, requestedPage, pageSize);
            if (requestedPage === 1) {
                setComments(sortCommentsAscending(pageComments));
                setAutoScrollToBottom(true);
            } else {
                setComments(prev => sortCommentsAscending([...pageComments, ...prev]));
            }
            setHasMore(pageComments.length === pageSize);
            setPage(requestedPage);
        } catch (error) {
            setCommentError('Unable to load comments. Please try again.');
        } finally {
            setLoadingComments(false);
            setLoadingMoreComments(false);
        }
    };

    useEffect(() => {
        if (!autoScrollToBottom || !commentsContainerRef.current) return;

        commentsContainerRef.current.scrollTo({
            top: commentsContainerRef.current.scrollHeight,
            behavior: 'smooth',
        });
        setAutoScrollToBottom(false);
    }, [autoScrollToBottom, comments]);

    const loadNextPage = () => {
        if (!hasMore || loadingMoreComments || loadingComments || !task) return;
        loadComments(page + 1);
    };

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const target = event.currentTarget;
        if (!hasMore || loadingMoreComments || loadingComments) return;

        if (target.scrollTop < 120) {
            loadNextPage();
        }
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

    const handleAddComment = async () => {
        if (!task || !commentDraft.trim() || !user) {
            setCommentError('Type a comment before sending.');
            return;
        }

        const draftText = commentDraft.trim();
        const tempId = `temp-${Date.now()}`;
        const optimisticComment: TaskComment = {
            commentId: tempId,
            taskId: task.taskId,
            userId: user.id,
            userName: user.fullName || user.name || 'You',
            comment: draftText,
            createdAt: new Date().toISOString(),
            updatedAt: null,
            isDeleted: false,
            isVisibleToPlayer: commentVisibility
        };

        setComments(prev => [...prev, optimisticComment]);
        setAutoScrollToBottom(true);
        setCommentDraft('');
        setSubmittingComment(true);
        setCommentError(null);

        try {
            const created = await createTaskCommentApi(task.taskId, { comment: draftText, isVisibleToPlayer: commentVisibility });
            setComments(prev => prev.map(item => item.commentId === tempId ? created : item));
        } catch (error) {
            setComments(prev => prev.filter(item => item.commentId !== tempId));
            setCommentError('Unable to post comment. Please try again.');
        } finally {
            setSubmittingComment(false);
        }
    };

    const startEditComment = (comment: TaskComment) => {
        setEditingCommentId(comment.commentId);
        setEditingCommentText(comment.comment);
        setEditingCommentVisibility(comment.isVisibleToPlayer);
    };

    const cancelEditComment = () => {
        setEditingCommentId(null);
        setEditingCommentText('');
    };

    const saveCommentEdit = async () => {
        if (!editingCommentId || !editingCommentText.trim()) {
            setCommentError('Comment text cannot be empty.');
            return;
        }

        setCommentError(null);

        try {
            const updated = await updateTaskCommentApi(editingCommentId, { comment: editingCommentText.trim(), isVisibleToPlayer: editingCommentVisibility });
            setComments(prev => prev.map(item => item.commentId === editingCommentId ? updated : item));
            cancelEditComment();
        } catch (error) {
            setCommentError('Unable to update comment. Please try again.');
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!window.confirm('Delete this comment?')) return;

        const previousComments = comments;
        setComments(prev => prev.filter(comment => comment.commentId !== commentId));

        try {
            await deleteTaskCommentApi(commentId);
        } catch (error) {
            setComments(previousComments);
            setCommentError('Unable to delete comment. Please try again.');
        }
    };

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
                                <p className="text-sm mt-2">{createdByName || assignedScoutName}</p>
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

                        <div
                            className="space-y-4 max-h-72 overflow-y-auto pr-1"
                            onScroll={handleScroll}
                            ref={commentsContainerRef}
                        >
                            {loadingComments && comments.length === 0 && (
                                <div className="py-10 text-center text-sm text-muted-foreground">Loading comments…</div>
                            )}

                            {!loadingComments && comments.length === 0 && (
                                <div className="py-10 text-center text-sm text-muted-foreground">No comments yet. Add the first comment below.</div>
                            )}

                            {comments
                                .filter(comment => user?.role !== 'Player' || comment.isVisibleToPlayer)
                                .map(comment => {
                                const isAuthor = user && String(comment.userId) === String(user.id);
                                const isEditingThis = editingCommentId === comment.commentId;
                                const avatar = comment.userName
                                    .split(' ')
                                    .map(part => part[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase() || 'U';

                                // return (
                                //     <Card key={comment.commentId}>
                                //         <CardContent className="p-4">
                                //             <div className="flex items-start gap-3">
                                //                 <div className="h-9 w-9 flex items-center justify-center rounded-full bg-muted text-sm font-semibold">
                                //                     {avatar}
                                //                 </div>

                                //                 <div className="flex-1">
                                //                     <div className="flex flex-wrap items-start justify-between gap-3">
                                //                         <div>
                                //                             <p className="text-sm font-semibold">{comment.userName}</p>
                                //                             <p className="text-xs text-muted-foreground">
                                //                                 {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                                //                             </p>
                                //                         </div>
                                //                         {isAuthor && !isEditingThis && (
                                //                             <div className="flex items-center gap-2">
                                //                                 <Button
                                //                                     variant="ghost"
                                //                                     size="icon"
                                //                                     onClick={() => startEditComment(comment)}
                                //                                 >
                                //                                     <Edit size={14} />
                                //                                 </Button>
                                //                                 <Button
                                //                                     variant="ghost"
                                //                                     size="icon"
                                //                                     onClick={() => handleDeleteComment(comment.commentId)}
                                //                                 >
                                //                                     <Trash2 size={14} />
                                //                                 </Button>
                                //                             </div>
                                //                         )}
                                //                     </div>

                                //                     {isEditingThis ? (
                                //                         <div className="space-y-3 mt-3">
                                //                             <Textarea
                                //                                 value={editingCommentText}
                                //                                 onChange={(e) => setEditingCommentText(e.target.value)}
                                //                                 className="min-h-[120px]"
                                //                             />
                                //                             <div className="flex gap-2 justify-end">
                                //                                 <Button size="sm" onClick={saveCommentEdit} className="h-8">
                                //                                     <Save size={14} className="mr-1" /> Save
                                //                                 </Button>
                                //                                 <Button size="sm" variant="outline" onClick={cancelEditComment} className="h-8">
                                //                                     Cancel
                                //                                 </Button>
                                //                             </div>
                                //                         </div>
                                //                     ) : (
                                //                         <p className="text-sm mt-3 whitespace-pre-wrap">{comment.comment}</p>
                                //                     )}

                                //                     {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                                //                         <p className="text-xs text-muted-foreground mt-2">Edited</p>
                                //                     )}
                                //                 </div>
                                //             </div>
                                //         </CardContent>
                                //     </Card>
                                // );

                                return (
                                    <Card key={comment.commentId} className="border-none shadow-none bg-transparent">
                                        <CardContent className="p-2">
                                            <div
                                                className={`flex items-start gap-3 group ${isAuthor ? "flex-row-reverse" : ""
                                                    }`}
                                            >
                                                {/* Avatar */}
                                                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-muted text-xs font-semibold shrink-0">
                                                    {avatar}
                                                </div>

                                                {/* Content */}
                                                <div className="max-w-[75%]">

                                                    {/* Bubble */}
                                                    <div
                                                        className={`rounded-xl px-3 py-2 shadow-sm relative ${isAuthor
                                                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                                                : "bg-muted rounded-tl-none"
                                                            }`}
                                                    >
                                                        {/* Edit Mode */}
                                                        {isEditingThis ? (
                                                            <div className="space-y-2">
                                                                <Textarea
                                                                    value={editingCommentText}
                                                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                                                    className="min-h-[80px] text-sm"
                                                                />
                                                                {user && user.role !== 'Player' && (
                                                                    <div className="flex items-center space-x-2">
                                                                        <Switch
                                                                            id={`edit-visibility-${comment.commentId}`}
                                                                            checked={editingCommentVisibility}
                                                                            onCheckedChange={(checked) => setEditingCommentVisibility(checked as boolean)}
                                                                        />
                                                                        <Label htmlFor={`edit-visibility-${comment.commentId}`} className="text-xs">
                                                                            Visible to players
                                                                        </Label>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-end gap-2">
                                                                    <Button size="sm" onClick={saveCommentEdit} className="h-7 px-2">
                                                                        <Save size={13} className="mr-1" /> Save
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={cancelEditComment}
                                                                        className="h-7 px-2"
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                                                {comment.comment}
                                                            </p>
                                                        )}

                                                        {/* Actions */}
                                                        {isAuthor && !isEditingThis && (
                                                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6"
                                                                    onClick={() => startEditComment(comment)}
                                                                >
                                                                    <Edit size={12} />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-destructive"
                                                                    onClick={() => handleDeleteComment(comment.commentId)}
                                                                >
                                                                    <Trash2 size={12} />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Meta Info */}
                                                    <div
                                                        className={`flex items-center gap-2 mt-1 text-[11px] text-muted-foreground ${isAuthor ? "justify-end" : "justify-start"
                                                            }`}
                                                    >
                                                        <span className="font-medium">{comment.userName}</span>
                                                        <span>•</span>
                                                        <span>
                                                            {format(new Date(comment.createdAt), "MMM d, yyyy h:mm a")}
                                                        </span>
                                                        {comment.updatedAt &&
                                                            comment.updatedAt !== comment.createdAt && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>edited</span>
                                                                </>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );

                            })}

                            {loadingMoreComments && (
                                <div className="py-3 text-center text-sm text-muted-foreground">Loading more comments…</div>
                            )}

                            {!hasMore && comments.length > 0 && (
                                <div className="py-3 text-center text-xs text-muted-foreground">No more comments</div>
                            )}
                        </div>

                        <div className="border-t pt-3 space-y-3">
                            {commentError && <p className="text-sm text-destructive">{commentError}</p>}
                            
                            {/* Only show comment input for admins and scouts */}
                            {user && user.role !== 'Player' && (
                                <>
                                    <Textarea
                                        value={commentDraft}
                                        onChange={(e) => setCommentDraft(e.target.value)}
                                        placeholder="Write a comment..."
                                        className="min-h-[100px]"
                                    />
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="comment-visibility"
                                            checked={commentVisibility}
                                            onCheckedChange={(checked) => setCommentVisibility(checked as boolean)}
                                        />
                                        <Label htmlFor="comment-visibility" className="text-sm">
                                            Visible to players
                                        </Label>
                                    </div>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-xs text-muted-foreground">Comments load in pages of 20 and are filtered by task only.</p>
                                        <Button size="sm" onClick={handleAddComment} disabled={submittingComment || !commentDraft.trim()}>
                                            Send
                                        </Button>
                                    </div>
                                </>
                            )}
                            
                            {/* Show message for players */}
                            {user && user.role === 'Player' && (
                                <p className="text-sm text-muted-foreground italic">Comments are managed by your scout or admin.</p>
                            )}
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
};
