import { create } from 'zustand';

interface PathHistoryCacheState {
  pathHistoryCache: Record<string, any>;
  getOrCreate: <T>(pathId: string, computeFn: () => T) => T;
  clearCache: () => void;
  invalidateCache: (pathId?: string) => void;
}

export const usePathHistoryCache = create<PathHistoryCacheState>((set, get) => ({
  pathHistoryCache: {},

  getOrCreate: <T>(pathId: string, computeFn: () => T): T => {
    const { pathHistoryCache } = get();
    if (pathId in pathHistoryCache) {
      return pathHistoryCache[pathId] as T;
    }
    const result = computeFn();
    set({ pathHistoryCache: { ...pathHistoryCache, [pathId]: result } });
    return result;
  },

  clearCache: () => set({ pathHistoryCache: {} }),

  invalidateCache: (pathId) => {
    if (!pathId) {
      set({ pathHistoryCache: {} });
      return;
    }
    const { pathHistoryCache } = get();
    const { [pathId]: _removed, ...rest } = pathHistoryCache;
    set({ pathHistoryCache: rest });
  },
}));
