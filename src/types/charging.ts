export type StationStatus = 'idle' | 'occupied' | 'maintenance';

export interface ChargingStation {
  id: string;
  name: string;
  x: number;
  y: number;
  status: StationStatus;
  power: number;
  currentAgvId?: string;
}

export interface ChargeRecord {
  id: string;
  agvId: string;
  stationId: string;
  startTime: string;
  endTime?: string;
  startBattery: number;
  endBattery?: number;
  chargedAmount?: number;
  status: 'charging' | 'completed';
}
