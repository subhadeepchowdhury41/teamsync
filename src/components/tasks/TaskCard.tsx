import React from 'react';
import { format } from 'date-fns';
import Link from 'next/link';

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed';

interface TaskCardProps {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
  tags?: {
    id: string;
    name: string;
    color: string;
  }[];
}

export default function TaskCard({
  id,
  title,
  description,
  status,
  priority,
  dueDate,
  assignee,
  tags = [],
}: TaskCardProps) {
  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
    urgent: 'bg-purple-100 text-purple-800',
  };

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    review: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
  };

  const statusLabels = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    completed: 'Completed',
  };

  return (
    <Link href={`/tasks/${id}`}>
      <div className="rounded-lg border border-gray-200 bg-white p-4 my-2 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium text-gray-900 truncate">{title}</h3>
          <div className="flex space-x-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityColors[priority]}`}>
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </span>
            <span className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}>
              {statusLabels[status]}
            </span>
          </div>
        </div>
        
        {description && (
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{description}</p>
        )}
        
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          {dueDate && (
            <div className="flex items-center text-sm text-gray-500">
              <svg className="mr-1.5 h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {(() => {
                try {
                  // Handle different types of date values
                  let dateValue = dueDate;
                  
                  // If it's an empty object, return a placeholder
                  if (typeof dueDate === 'object' && dueDate !== null && Object.keys(dueDate).length === 0) {
                    return 'No due date';
                  }
                  
                  // If it's a string that can be parsed, format it
                  if (typeof dateValue === 'string' && dateValue.trim() !== '') {
                    return format(new Date(dateValue), 'MMM d, yyyy');
                  }
                  
                  return 'No due date';
                } catch (error) {
                  console.error('Invalid date format:', dueDate, error);
                  return 'No due date';
                }
              })()}
            </div>
          )}
          
          {assignee && (
            <div className="flex items-center">
              <div className="h-6 w-6 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {assignee.avatarUrl ? (
                  <img src={assignee.avatarUrl} alt={assignee.name} />
                ) : (
                  <span className="text-xs font-medium text-gray-500">
                    {assignee.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="ml-2 text-sm text-gray-500">{assignee.name}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
