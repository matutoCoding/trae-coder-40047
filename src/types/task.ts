export type TaskStatus = 'pending' | 'scheduled' | 'assigned' | 'executing' | 'completed' | 'exception' | 'cancelled';
export type TaskType = 'transport' | 'replenish' | 'inventory';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  startPoint: string;
  endPoint: string;
  cargo: string;
  weight: number;
  status: TaskStatus;
  agvId?: string;
  pathId?: string;
  createTime: string;
  startTime?: string;
  endTime?: string;
  scheduledTime?: string;
  priority: TaskPriority;
  description?: string;
}
