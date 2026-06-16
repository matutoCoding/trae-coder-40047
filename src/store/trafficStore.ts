import { create } from 'zustand';
import type { Intersection, TrafficRule } from '../types/traffic';
import { mockIntersections, mockTrafficRules } from '../mock/traffic';

interface TrafficState {
  intersections: Intersection[];
  rules: TrafficRule[];
  selectedIntersectionId: string | null;
  setIntersections: (intersections: Intersection[]) => void;
  setRules: (rules: TrafficRule[]) => void;
  setSelectedIntersection: (id: string | null) => void;
  getIntersectionById: (id: string) => Intersection | undefined;
  getRulesByIntersection: (intersectionId: string) => TrafficRule[];
  updateIntersectionStatus: (id: string, status: Intersection['status']) => void;
  toggleRule: (ruleId: string, enabled: boolean) => void;
  addRule: (rule: Omit<TrafficRule, 'id' | 'createTime'>) => void;
  deleteRule: (ruleId: string) => void;
  getTrafficStats: () => {
    totalIntersections: number;
    passable: number;
    controlled: number;
    maintenance: number;
    totalPassCount: number;
  };
}

export const useTrafficStore = create<TrafficState>((set, get) => ({
  intersections: mockIntersections,
  rules: mockTrafficRules,
  selectedIntersectionId: null,

  setIntersections: (intersections) => set({ intersections }),

  setRules: (rules) => set({ rules }),

  setSelectedIntersection: (id) => set({ selectedIntersectionId: id }),

  getIntersectionById: (id) => get().intersections.find((i) => i.id === id),

  getRulesByIntersection: (intersectionId) =>
    get().rules.filter((r) => r.intersectionId === intersectionId),

  updateIntersectionStatus: (id, status) =>
    set((state) => ({
      intersections: state.intersections.map((i) =>
        i.id === id ? { ...i, status } : i
      ),
    })),

  toggleRule: (ruleId, enabled) =>
    set((state) => ({
      rules: state.rules.map((r) =>
        r.id === ruleId ? { ...r, enabled } : r
      ),
    })),

  addRule: (rule) =>
    set((state) => {
      const maxId = state.rules.reduce((max, r) => {
        const num = parseInt(r.id.replace('RULE-', ''), 10);
        return num > max ? num : max;
      }, 0);
      return {
        rules: [
          ...state.rules,
          {
            ...rule,
            id: `RULE-${String(maxId + 1).padStart(3, '0')}`,
            createTime: new Date().toISOString().split('T')[0],
          },
        ],
      };
    }),

  deleteRule: (ruleId) =>
    set((state) => ({
      rules: state.rules.filter((r) => r.id !== ruleId),
    })),

  getTrafficStats: () => {
    const { intersections } = get();
    return {
      totalIntersections: intersections.length,
      passable: intersections.filter((i) => i.status === 'passable').length,
      controlled: intersections.filter((i) => i.status === 'controlled').length,
      maintenance: intersections.filter((i) => i.status === 'maintenance').length,
      totalPassCount: intersections.reduce((sum, i) => sum + i.passCount, 0),
    };
  },
}));
