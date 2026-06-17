import { create } from 'zustand';
import type { Task, TaskStatus, TaskPriority } from '../types/task';
import type { Path } from '../types/path';
import { mockTaskList } from '../mock/task';
import { useAgvStore } from './agvStore';

interface WeeklyStat {
  day: string;
  count: number;
  avgTime: number;
}

interface PathHistory {
  passCount: number;
  avgTime: number;
  congestionEvents: number;
  weeklyData: WeeklyStat[];
  completedOnPath: Task[];
  cachedAt: number;
}

interface ScheduledDispatchResult {
  taskId: string;
  taskName: string;
  success: boolean;
  agvId?: string;
  agvName?: string;
  reason?: string;
}

interface TaskState {
  taskList: Task[];
  selectedTaskId: string | null;
  setTaskList: (taskList: Task[]) => void;
  setSelectedTask: (id: string | null) => void;
  getTaskById: (id: string) => Task | undefined;
  addTask: (task: Omit<Task, 'id' | 'createTime' | 'status'> & { status?: TaskStatus }) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  assignTask: (taskId: string, agvId: string) => void;
  completeTask: (id: string) => void;
  assignPath: (taskId: string, pathId: string) => void;
  deleteTask: (id: string) => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTaskStats: () => {
    total: number;
    pending: number;
    executing: number;
    completed: number;
    exception: number;
    todayCompleted: number;
  };
  getTodayTrendStats: () => {
    timeLabels: string[];
    completedCounts: number[];
    weightTotals: number[];
    slotTasks: string[][];
  };
  getTaskTypeStats: () => {
    typeLabels: string[];
    typeCounts: number[];
  };
  getTodayTotalWeight: () => number;
  getAgvWorkRanking: () => {
    agvId: string;
    agvName: string;
    completedCount: number;
    totalWeight: number;
  }[];
  pathHistoryCache: Record<string, PathHistory>;
  getPathHistory: (path: Path) => Omit<PathHistory, 'cachedAt'>;
  clearPathHistoryCache: () => void;
  invalidatePathHistoryCache: (pathId?: string) => void;
  processScheduledTasks: (now: Date) => { success: ScheduledDispatchResult[]; failed: ScheduledDispatchResult[] };
  updateTaskScheduledTime: (taskId: string, time: string) => void;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

export const useTaskStore = create<TaskState>((set, get) => ({
  taskList: mockTaskList,
  selectedTaskId: null,
  pathHistoryCache: {},

  setTaskList: (taskList) => set({ taskList }),

  setSelectedTask: (id) => set({ selectedTaskId: id }),

  getTaskById: (id) => get().taskList.find((task) => task.id === id),

  addTask: (task) =>
    set((state) => {
      const maxId = state.taskList.reduce((max, t) => {
        const num = parseInt(t.id.replace('TASK-', ''), 10);
        return num > max ? num : max;
      }, 0);
      return {
        taskList: [
          {
            ...task,
            id: `TASK-${String(maxId + 1).padStart(3, '0')}`,
            createTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
            status: task.status || 'pending',
          },
          ...state.taskList,
        ],
      };
    }),

  updateTaskStatus: (id, status) =>
    set((state) => ({
      taskList: state.taskList.map((task) =>
        task.id === id ? { ...task, status } : task
      ),
    })),

  assignTask: (taskId, agvId) =>
    set((state) => ({
      taskList: state.taskList.map((task) =>
        task.id === taskId
          ? {
              ...task,
              agvId,
              status: 'assigned',
              startTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
            }
          : task
      ),
    })),

  completeTask: (id) =>
    set((state) => ({
      taskList: state.taskList.map((task) =>
        task.id === id
          ? {
              ...task,
              status: 'completed',
              endTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
            }
          : task
      ),
    })),

  assignPath: (taskId, pathId) =>
    set((state) => ({
      taskList: state.taskList.map((task) =>
        task.id === taskId ? { ...task, pathId } : task
      ),
    })),

  deleteTask: (id) =>
    set((state) => ({
      taskList: state.taskList.filter((task) => task.id !== id),
      selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
    })),

  getTasksByStatus: (status) => get().taskList.filter((task) => task.status === status),

  getTaskStats: () => {
    const { taskList } = get();
    const today = new Date().toLocaleDateString('zh-CN', { hour12: false }).replace(/\//g, '-');
    return {
      total: taskList.length,
      pending: taskList.filter((t) => t.status === 'pending' || t.status === 'scheduled').length,
      executing: taskList.filter((t) => t.status === 'executing' || t.status === 'assigned').length,
      completed: taskList.filter((t) => t.status === 'completed').length,
      exception: taskList.filter((t) => t.status === 'exception').length,
      todayCompleted: taskList.filter(
        (t) => t.status === 'completed' && t.endTime?.startsWith(today)
      ).length,
    };
  },

  getTodayTrendStats: () => {
    const { taskList } = get();
    const today = new Date().toLocaleDateString('zh-CN', { hour12: false }).replace(/\//g, '-');
    const timeLabels = ['00:00-04:00', '04:00-08:00', '08:00-12:00', '12:00-16:00', '16:00-20:00', '20:00-24:00'];
    const completedCounts = [0, 0, 0, 0, 0, 0];
    const weightTotals = [0, 0, 0, 0, 0, 0];
    const slotTasks: string[][] = [[], [], [], [], [], []];

    const todayCompletedTasks = taskList.filter(
      (t) => t.status === 'completed' && t.endTime?.startsWith(today)
    );

    todayCompletedTasks.forEach((task) => {
      if (!task.endTime) return;
      const hour = parseInt(task.endTime.split(' ')[1].split(':')[0], 10);
      let slot = 0;
      if (hour >= 20) slot = 5;
      else if (hour >= 16) slot = 4;
      else if (hour >= 12) slot = 3;
      else if (hour >= 8) slot = 2;
      else if (hour >= 4) slot = 1;
      else slot = 0;

      completedCounts[slot]++;
      weightTotals[slot] += task.weight / 1000;
      slotTasks[slot].push(`${task.id} ${task.cargo}${task.weight}kg`);
    });

    return { timeLabels, completedCounts, weightTotals, slotTasks };
  },

  getTaskTypeStats: () => {
    const { taskList } = get();
    const typeMap: Record<string, { label: string; count: number }> = {
      transport: { label: '搬运任务', count: 0 },
      replenish: { label: '补货任务', count: 0 },
      inventory: { label: '盘点任务', count: 0 },
    };
    taskList.forEach((t) => {
      if (typeMap[t.type]) {
        typeMap[t.type].count++;
      }
    });
    const entries = Object.values(typeMap);
    return {
      typeLabels: entries.map((e) => e.label),
      typeCounts: entries.map((e) => e.count),
    };
  },

  getTodayTotalWeight: () => {
    const { taskList } = get();
    const today = new Date().toLocaleDateString('zh-CN', { hour12: false }).replace(/\//g, '-');
    return taskList
      .filter((t) => t.status === 'completed' && t.endTime?.startsWith(today))
      .reduce((sum, t) => sum + t.weight, 0) / 1000;
  },

  getAgvWorkRanking: () => {
    const { taskList } = get();
    const today = new Date().toLocaleDateString('zh-CN', { hour12: false }).replace(/\//g, '-');
    const todayCompleted = taskList.filter(
      (t) => t.status === 'completed' && t.endTime?.startsWith(today) && t.agvId
    );
    const rankMap: Record<string, { agvId: string; completedCount: number; totalWeight: number }> = {};
    todayCompleted.forEach((t) => {
      if (!t.agvId) return;
      if (!rankMap[t.agvId]) {
        rankMap[t.agvId] = { agvId: t.agvId, completedCount: 0, totalWeight: 0 };
      }
      rankMap[t.agvId].completedCount++;
      rankMap[t.agvId].totalWeight += t.weight / 1000;
    });
    return Object.values(rankMap)
      .sort((a, b) => b.completedCount - a.completedCount || b.totalWeight - a.totalWeight)
      .map((r) => ({ ...r, agvName: '', totalWeight: Number(r.totalWeight.toFixed(1)) }));
  },

  getPathHistory: (path: Path) => {
    const { taskList, pathHistoryCache } = get();
    const now = Date.now();
    const cached = pathHistoryCache[path.id];
    if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
      const { cachedAt: _cachedAt, ...rest } = cached;
      return rest;
    }

    const completedOnPath = taskList.filter(
      (t) => t.status === 'completed' && t.pathId === path.id
    );
    const passCount = 12 + completedOnPath.length + Math.floor(Math.random() * 20);
    const avgTime = path.estimatedTime + Math.floor(Math.random() * 3) - 1;
    const congestionEvents = Math.floor(Math.random() * 4);
    const weeklyData: WeeklyStat[] = Array.from({ length: 7 }, (_, i) => ({
      day: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i],
      count: Math.floor(Math.random() * 6) + 1,
      avgTime: path.estimatedTime + Math.floor(Math.random() * 3),
    }));

    const history: PathHistory = {
      passCount,
      avgTime,
      congestionEvents,
      weeklyData,
      completedOnPath,
      cachedAt: now,
    };

    set({ pathHistoryCache: { ...pathHistoryCache, [path.id]: history } });

    const { cachedAt: _cachedAt, ...rest } = history;
    return rest;
  },

  clearPathHistoryCache: () => set({ pathHistoryCache: {} }),

  invalidatePathHistoryCache: (pathId) => {
    if (!pathId) {
      set({ pathHistoryCache: {} });
      return;
    }
    const { pathHistoryCache } = get();
    const { [pathId]: _removed, ...rest } = pathHistoryCache;
    set({ pathHistoryCache: rest });
  },

  processScheduledTasks: (now) => {
    const { taskList } = get();
    const agvState = useAgvStore.getState();
    const { agvList, updateAgvStatus, updateAgv } = agvState;

    const priorityWeight: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 };

    const dueTasks = taskList
      .filter((t) => t.status === 'scheduled' && t.scheduledTime && new Date(t.scheduledTime) <= now)
      .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    const successResults: ScheduledDispatchResult[] = [];
    const failedResults: ScheduledDispatchResult[] = [];
    const assignedAgvIds = new Set<string>();

    for (const task of dueTasks) {
      const availableAgv = agvList
        .filter((agv) => agv.status === 'idle' && agv.maxLoad >= task.weight && !assignedAgvIds.has(agv.id))
        .sort((a, b) => b.battery - a.battery)[0];

      if (availableAgv) {
        assignedAgvIds.add(availableAgv.id);
        get().assignTask(task.id, availableAgv.id);
        updateAgvStatus(availableAgv.id, 'running');
        updateAgv(availableAgv.id, { currentTaskId: task.id });
        successResults.push({
          taskId: task.id,
          taskName: task.name,
          success: true,
          agvId: availableAgv.id,
          agvName: availableAgv.name,
        });
      } else {
        get().updateTaskStatus(task.id, 'pending');
        failedResults.push({
          taskId: task.id,
          taskName: task.name,
          success: false,
          reason: '无可用车辆',
        });
      }
    }

    return { success: successResults, failed: failedResults };
  },

  updateTaskScheduledTime: (taskId, time) =>
    set((state) => ({
      taskList: state.taskList.map((task) =>
        task.id === taskId ? { ...task, scheduledTime: time } : task
      ),
    })),
}));
