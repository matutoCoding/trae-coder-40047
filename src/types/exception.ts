export type ExceptionType = 'estop' | 'stuck' | 'low_battery' | 'fault' | 'collision';
export type ExceptionLevel = 'critical' | 'warning' | 'info';
export type ExceptionStatus = 'pending' | 'processing' | 'resolved';

export interface Exception {
  id: string;
  agvId: string;
  taskId?: string;
  type: ExceptionType;
  level: ExceptionLevel;
  description: string;
  happenTime: string;
  handleTime?: string;
  handler?: string;
  handleResult?: string;
  status: ExceptionStatus;
}
