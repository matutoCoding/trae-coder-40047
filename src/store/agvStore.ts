import { create } from 'zustand';
import type { AGV, AgvStatus } from '../types/agv';
import { mockAgvList } from '../mock/agv';

interface AgvState {
  agvList: AGV[];
  selectedAgvId: string | null;
  setAgvList: (agvList: AGV[]) => void;
  setSelectedAgv: (id: string | null) => void;
  getAgvById: (id: string) => AGV | undefined;
  updateAgvStatus: (id: string, status: AgvStatus) => void;
  updateAgvPosition: (id: string, x: number, y: number) => void;
  addAgv: (agv: Omit<AGV, 'id' | 'createTime'>) => void;
  deleteAgv: (id: string) => void;
  updateAgv: (id: string, data: Partial<AGV>) => void;
  getAgvStats: () => {
    total: number;
    running: number;
    idle: number;
    charging: number;
    fault: number;
    maintenance: number;
  };
}

export const useAgvStore = create<AgvState>((set, get) => ({
  agvList: mockAgvList,
  selectedAgvId: null,

  setAgvList: (agvList) => set({ agvList }),

  setSelectedAgv: (id) => set({ selectedAgvId: id }),

  getAgvById: (id) => get().agvList.find((agv) => agv.id === id),

  updateAgvStatus: (id, status) =>
    set((state) => ({
      agvList: state.agvList.map((agv) =>
        agv.id === id ? { ...agv, status } : agv
      ),
    })),

  updateAgvPosition: (id, x, y) =>
    set((state) => ({
      agvList: state.agvList.map((agv) =>
        agv.id === id ? { ...agv, x, y } : agv
      ),
    })),

  addAgv: (agv) =>
    set((state) => ({
      agvList: [
        ...state.agvList,
        {
          ...agv,
          id: `AGV-${String(state.agvList.length + 1).padStart(3, '0')}`,
          createTime: new Date().toISOString().split('T')[0],
        },
      ],
    })),

  deleteAgv: (id) =>
    set((state) => ({
      agvList: state.agvList.filter((agv) => agv.id !== id),
      selectedAgvId: state.selectedAgvId === id ? null : state.selectedAgvId,
    })),

  updateAgv: (id, data) =>
    set((state) => ({
      agvList: state.agvList.map((agv) =>
        agv.id === id ? { ...agv, ...data } : agv
      ),
    })),

  getAgvStats: () => {
    const { agvList } = get();
    return {
      total: agvList.length,
      running: agvList.filter((a) => a.status === 'running').length,
      idle: agvList.filter((a) => a.status === 'idle').length,
      charging: agvList.filter((a) => a.status === 'charging').length,
      fault: agvList.filter((a) => a.status === 'fault').length,
      maintenance: agvList.filter((a) => a.status === 'maintenance').length,
    };
  },
}));
