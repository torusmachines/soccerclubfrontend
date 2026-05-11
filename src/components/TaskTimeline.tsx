import { useMemo, useState } from 'react';
import { useAppContext } from '@/context/PlayerContext';
import { Task } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, Calendar, Link as LinkIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isPlayerRole, isScoutRole } from '@/lib/accessPolicy';
import { TaskDetailsModal } from './TaskDetailsModal';

interface TaskTimelineProps {
  entityType: 'player' | 'club';
  entityId: string;
  readOnly?: boolean;
  apiTasks?: Task[];
  apiScouts?: any[];
  apiClubs?: any[];
  playerOptions?: any[];
  onTaskOperationSuccess?: () => void | Promise<void>;
}

// const sourceColors: Record<string, string> = {
//   contract: 'bg-orange-100 text-orange-800',
//   review: 'bg-blue-100 text-blue-800',
//   note: 'bg-purple-100 text-purple-800',
//   manual: 'bg-gray-100 text-gray-800',
// };
const sourceColors: Record<string, string> = {
  contract: 'bg-orange-100 text-orange-800',
  review: 'bg-blue-100 text-blue-800',
  note: 'bg-purple-100 text-purple-800',
  manual: 'bg-gray-100 text-gray-800',
  performance: 'bg-red-100 text-red-800',      // ← new
  medical: 'bg-green-100 text-green-800',   // ← new
  personal: 'bg-pink-100 text-pink-800',     // ← new
};

export const TaskTimeline = ({ entityType, entityId, readOnly = false, apiTasks, apiScouts, apiClubs, playerOptions, onTaskOperationSuccess }: TaskTimelineProps) => {
  const { user } = useAuth();
  const isPlayer = isPlayerRole(user?.role);
  const isScout = isScoutRole(user?.role);
  const { tasks, updateTask, deleteTask, scouts, players, clubs } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const entityTasks = useMemo(() =>
    (apiTasks ?? tasks)
      .filter(t =>
        (entityType === 'player' && String(t.playerId) === String(entityId)) ||
        (entityType === 'club' && String(t.clubId) === String(entityId))
      )
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
    [apiTasks, tasks, entityType, entityId]
  );

  const toggleStatus = async (task: Task) => {
    const currentStatus = String(task.status || '').toLowerCase();
    const nextStatus = currentStatus === 'closed' || currentStatus === 'completed' ? 'open' : 'closed';
    const success = await updateTask({ ...task, status: nextStatus });
    if (success) {
      await onTaskOperationSuccess?.();
    }
  };

  const handleUpdateTask = async (task: Task) => {
    const success = await updateTask(task);
    if (success) {
      await onTaskOperationSuccess?.();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const success = await deleteTask(taskId);
    if (success) {
      await onTaskOperationSuccess?.();
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const getEntityName = (task: Task) => {
    if (task.playerId) return players.find(p => p.id === String(task.playerId))?.fullName;
    if (task.clubId) return clubs.find(c => c.clubId === task.clubId)?.clubName;
    return undefined;
  };

  return (
    <div className="space-y-3">
      {entityTasks.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No tasks</p>
      ) : (
        entityTasks.map(task => {
          const currentStatus = String(task.status || '').toLowerCase();
          const isCompleted = currentStatus === 'closed' || currentStatus === 'completed';
          const displayStatus = (currentStatus === 'closed' || currentStatus === 'completed' || currentStatus === 'complete') ? 'Completed' : (currentStatus ? currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1) : 'Unknown');
          return (

          <Card key={task.taskId} className={`cursor-pointer transition-all hover:shadow-md ${isCompleted ? 'opacity-60' : ''}`} onClick={() => handleTaskClick(task)}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                  <button onClick={(e) => { e.stopPropagation(); !isPlayer && !readOnly && toggleStatus(task); }} className="mt-0.5" disabled={isPlayer || readOnly}>
                  {isCompleted ? (
                    <CheckCircle size={18} className="text-green-600" />
                  ) : (
                    <Circle size={18} className="text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${isCompleted ? 'line-through' : ''}`}>
                      {task.title}
                    </span>
                    <Badge variant="secondary" className={sourceColors[task.source] ?? 'bg-gray-100 text-gray-800'}>
                      {task.source}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} /> {format(new Date(task.dueDate), 'MMM d, yyyy')}
                    </span>
                    <Badge variant={currentStatus === 'open' ? 'default' : 'secondary'} className="text-[10px]">
                      {displayStatus}
                    </Badge>
                  </div>
                </div>
                {/* Delete button — only for manual tasks, auto-tasks are system-managed */}
                {!isPlayer && !readOnly && task.source === 'manual' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.taskId); }}
                    className="text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        );
        })
      )}

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        assignedScoutName={selectedTask?.assignedToName || (selectedTask ? (scouts.find(s => String(s.scoutId) === String(selectedTask.assignedToScoutId))?.scoutName || 'Auto-generated') : 'Auto-generated')}
        createdByName={user?.name || 'Admin'}
        getEntityName={getEntityName}
        onUpdateTask={handleUpdateTask}
        scouts={apiScouts || scouts}
        players={
          playerOptions
            ? playerOptions.map(p => ({ id: p.playerId ?? p.id, fullName: p.playerName ?? p.fullName, sportId: p.sportId, sportName: p.sportName }))
            : players
        }
        clubs={apiClubs || clubs}
        isScout={isScout}
      />
    </div>
  );
};
