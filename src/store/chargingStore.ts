import { create } from 'zustand';
import type { ChargingStation, ChargeRecord } from '../types/charging';
import { mockChargingStations, mockChargeRecords } from '../mock/charging';

interface ChargingState {
  stations: ChargingStation[];
  records: ChargeRecord[];
  selectedStationId: string | null;
  setStations: (stations: ChargingStation[]) => void;
  setRecords: (records: ChargeRecord[]) => void;
  setSelectedStation: (id: string | null) => void;
  getStationById: (id: string) => ChargingStation | undefined;
  getAvailableStations: () => ChargingStation[];
  startCharging: (agvId: string, stationId: string, startBattery: number) => void;
  stopCharging: (recordId: string, endBattery: number) => void;
  getChargingStats: () => {
    totalStations: number;
    availableStations: number;
    chargingCount: number;
    todayChargedAmount: number;
  };
}

export const useChargingStore = create<ChargingState>((set, get) => ({
  stations: mockChargingStations,
  records: mockChargeRecords,
  selectedStationId: null,

  setStations: (stations) => set({ stations }),

  setRecords: (records) => set({ records }),

  setSelectedStation: (id) => set({ selectedStationId: id }),

  getStationById: (id) => get().stations.find((s) => s.id === id),

  getAvailableStations: () => get().stations.filter((s) => s.status === 'idle'),

  startCharging: (agvId, stationId, startBattery) =>
    set((state) => {
      const maxId = state.records.reduce((max, r) => {
        const num = parseInt(r.id.replace('CHARGE-', ''), 10);
        return num > max ? num : max;
      }, 0);
      return {
        stations: state.stations.map((s) =>
          s.id === stationId
            ? { ...s, status: 'occupied' as const, currentAgvId: agvId }
            : s
        ),
        records: [
          {
            id: `CHARGE-${String(maxId + 1).padStart(3, '0')}`,
            agvId,
            stationId,
            startTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
            startBattery,
            status: 'charging' as const,
          },
          ...state.records,
        ],
      };
    }),

  stopCharging: (recordId, endBattery) =>
    set((state) => {
      const record = state.records.find((r) => r.id === recordId);
      if (!record) return state;
      return {
        stations: state.stations.map((s) =>
          s.id === record.stationId
            ? { ...s, status: 'idle' as const, currentAgvId: undefined }
            : s
        ),
        records: state.records.map((r) =>
          r.id === recordId
            ? {
                ...r,
                endBattery,
                endTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
                chargedAmount: endBattery - r.startBattery,
                status: 'completed' as const,
              }
            : r
        ),
      };
    }),

  getChargingStats: () => {
    const { stations, records } = get();
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter(
      (r) => r.status === 'completed' && r.startTime.startsWith(today)
    );
    return {
      totalStations: stations.length,
      availableStations: stations.filter((s) => s.status === 'idle').length,
      chargingCount: records.filter((r) => r.status === 'charging').length,
      todayChargedAmount: todayRecords.reduce((sum, r) => sum + (r.chargedAmount || 0), 0),
    };
  },
}));
