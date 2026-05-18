import { useDrag } from 'react-dnd';
import type { Task } from '../../lib/types';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Clock, MessageSquare, AlertTriangle } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'TASK',
    item: { id: task.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const priorityColors = {
    low: 'border-muted',
    medium: 'border-chart-3',
    high: 'border-accent',
    critical: 'border-destructive',
  };

  const priorityBars = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  const isOverdue = new Date(task.deadline) < new Date();

  return (
    <div
      ref={drag}
      onClick={() => onClick(task)}
      className={`border-2 ${priorityColors[task.priority]} p-3 bg-card cursor-pointer hover:bg-primary/5 transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Priority indicator */}
      <div className="flex gap-1 mb-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 ${i < priorityBars[task.priority] ? priorityColors[task.priority].replace('border', 'bg') : 'bg-muted/30'}`}
          />
        ))}
      </div>

      {task.imageUrl && (
        <div className="mb-2 border border-primary/30 overflow-hidden max-h-28">
          <ImageWithFallback
            src={task.imageUrl}
            alt=""
            className="w-full h-28 object-cover"
          />
        </div>
      )}

      {/* Title */}
      <h4 className="mb-2 break-words">{task.title}</h4>

      {/* Team badge */}
      <div className="text-xs text-accent mb-3 border border-accent/50 inline-block px-2 py-1">
        {task.teamName}
      </div>

      {/* Description preview */}
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {task.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs border-t border-primary/30 pt-2">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
            <Clock size={12} />
            <span>{task.deadline}</span>
            {isOverdue && <AlertTriangle size={12} />}
          </div>
          {task.comments > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare size={12} />
              <span>{task.comments}</span>
            </div>
          )}
        </div>
        <div className="text-muted-foreground truncate ml-2">
          {task.assigneeName}
        </div>
      </div>
    </div>
  );
}
