import { create } from 'zustand';
import type { Exception, ExceptionStatus } from '../types/exception';
import { mockExceptionList } from '../mock/exception';

interface ExceptionState {
  exceptionList: Exception[];
  selectedExceptionId: string | null;
  setExceptionList: (list: Exception[]) => void;
  setSelectedException: (id: string | null) => void;
  getExceptionById: (id: string) => Exception | undefined;
  addException: (exception: Omit<Exception, 'id' | 'happenTime' | 'status'>) => void;
  updateExceptionStatus: (id: string, status: ExceptionStatus, handler?: string, result?: string) => void;
  getExceptionsByLevel: (level: string) => Exception[];
  getExceptionStats: () => {
    total: number;
    pending: number;
    processing: number;
    resolved: number;
    critical: number;
    warning: number;
    info: number;
  };
}

export const useExceptionStore = create<ExceptionState>((set, get) => ({
  exceptionList: mockExceptionList,
  selectedExceptionId: null,

  setExceptionList: (list) => set({ exceptionList: list }),

  setSelectedException: (id) => set({ selectedExceptionId: id }),

  getExceptionById: (id) => get().exceptionList.find((e) => e.id === id),

  addException: (exception) =>
    set((state) => {
      const maxId = state.exceptionList.reduce((max, e) => {
        const num = parseInt(e.id.replace('EXC-', ''), 10);
        return num > max ? num : max;
      }, 0);
      return {
        exceptionList: [
          {
            ...exception,
            id: `EXC-${String(maxId + 1).padStart(3, '0')}`,
            happenTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
            status: 'pending',
          },
          ...state.exceptionList,
        ],
      };
    }),

  updateExceptionStatus: (id, status, handler, result) =>
    set((state) => ({
      exceptionList: state.exceptionList.map((e) =>
        e.id === id
          ? {
              ...e,
              status,
              handleTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
              handler: handler || e.handler,
              handleResult: result || e.handleResult,
            }
          : e
      ),
    })),

  getExceptionsByLevel: (level) => get().exceptionList.filter((e) => e.level === level),

  getExceptionStats: () => {
    const { exceptionList } = get();
    return {
      total: exceptionList.length,
      pending: exceptionList.filter((e) => e.status === 'pending').length,
      processing: exceptionList.filter((e) => e.status === 'processing').length,
      resolved: exceptionList.filter((e) => e.status === 'resolved').length,
      critical: exceptionList.filter((e) => e.level === 'critical').length,
      warning: exceptionList.filter((e) => e.level === 'warning').length,
      info: exceptionList.filter((e) => e.level === 'info').length,
    };
  },
}));
