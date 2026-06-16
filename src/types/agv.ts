export type AgvStatus = 'running' | 'idle' | 'charging' | 'fault' | 'maintenance';

export interface AGV {
  id: string;
  name: string;
  model: string;
  battery: number;
  maxBattery: number;
  status: AgvStatus;
  x: number;
  y: number;
  speed: number;
  load: number;
  maxLoad: number;
  currentTaskId?: string;
  lastMaintenance: string;
  createTime: string;
  description?: string;
}

export interface AgvPosition {
  x: number;
  y: number;
}
