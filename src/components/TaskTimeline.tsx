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

export const TaskTimeline = ({ entityType, entityId, readOnly = false }: TaskTimelineProps) => {
  const { user } = useAuth();
  const isPlayer = isPlayerRole(user?.role);
  const isScout = isScoutRole(user?.role);
  const { tasks, updateTask, deleteTask, scouts, players, clubs } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // const entityTasks = useMemo(() =>
  //   tasks.filter(t => Number(t.playerId) === Number(entityType) && t.clubId === entityId)
  //     .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
  //   [tasks, entityType, entityId]
  // );
  const entityTasks = useMemo(() =>
    tasks
      .filter(t =>
        (entityType === 'player' && String(t.playerId) === String(entityId)) ||
        (entityType === 'club' && String(t.clubId) === String(entityId))
      )
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
    [tasks, entityType, entityId]
  );

  const toggleStatus = (task: Task) => {
    updateTask({ ...task, status: task.status === 'open' ? 'completed' : 'open' });
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
        entityTasks.map(task => (

          // <Card key={task.taskId} className={task.status === 'completed' ? 'opacity-60' : ''}>
          //   <CardContent className="p-4">
          //     <div className="flex items-start gap-3">
          //       <button onClick={() => toggleStatus(task)} className="mt-0.5">
          //         {task.status === 'completed' ? (
          //           <CheckCircle size={18} className="text-green-600" />
          //         ) : (
          //           <Circle size={18} className="text-muted-foreground" />
          //         )}
          //       </button>
          //       <div className="flex-1">
          //         <div className="flex items-center gap-2 flex-wrap">
          //           <span className={`text-sm font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>{task.title}</span>
          //           <Badge variant="secondary" className={sourceColors[task.source]}>{task.source}</Badge>
          //         </div>
          //         <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
          //         <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          //           <span className="flex items-center gap-1"><Calendar size={10} /> {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
          //           <Badge variant={task.status === 'open' ? 'default' : 'secondary'} className="text-[10px]">{task.status}</Badge>
          //         </div>
          //       </div>
          //     </div>
          //   </CardContent>
          // </Card>

          <Card key={task.taskId} className={`cursor-pointer transition-all hover:shadow-md ${task.status === 'completed' ? 'opacity-60' : ''}`} onClick={() => handleTaskClick(task)}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <button onClick={(e) => { e.stopPropagation(); !isPlayer && !readOnly && toggleStatus(task); }} className="mt-0.5" disabled={isPlayer || readOnly}>
                  {task.status === 'completed' ? (
                    <CheckCircle size={18} className="text-green-600" />
                  ) : (
                    <Circle size={18} className="text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>
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
                    <Badge variant={task.status === 'open' ? 'default' : 'secondary'} className="text-[10px]">
                      {task.status}
                    </Badge>
                  </div>
                </div>
                {/* Delete button — only for manual tasks, auto-tasks are system-managed */}
                {!isPlayer && !readOnly && task.source === 'manual' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTask(task.taskId); }}
                    className="text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        assignedScoutName={selectedTask ? (scouts.find(s => s.scoutId === selectedTask.assignedToScoutId)?.scoutName || 'Unknown Scout') : 'Unknown Scout'}
        createdByName={user?.name || 'Admin'}
        getEntityName={getEntityName}
        scouts={scouts}
        players={players}
        clubs={clubs}
        isScout={isScout}
      />
    </div>
  );
};
