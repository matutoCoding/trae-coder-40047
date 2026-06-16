import { create } from 'zustand';
import type { Task, TaskStatus, TaskPriority } from '../types/task';
import { mockTaskList } from '../mock/task';

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
  };
  getTaskTypeStats: () => {
    typeLabels: string[];
    typeCounts: number[];
  };
  getTodayTotalWeight: () => number;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  taskList: mockTaskList,
  selectedTaskId: null,

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
      pending: taskList.filter((t) => t.status === 'pending').length,
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
    const timeLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'];
    const completedCounts = [0, 0, 0, 0, 0, 0, 0];
    const weightTotals = [0, 0, 0, 0, 0, 0, 0];

    const todayCompletedTasks = taskList.filter(
      (t) => t.status === 'completed' && t.endTime?.startsWith(today)
    );

    todayCompletedTasks.forEach((task) => {
      if (!task.endTime) return;
      const hour = parseInt(task.endTime.split(' ')[1].split(':')[0], 10);
      let slot = 0;
      if (hour >= 20) slot = 6;
      else if (hour >= 16) slot = 5;
      else if (hour >= 12) slot = 4;
      else if (hour >= 8) slot = 3;
      else if (hour >= 4) slot = 2;
      else if (hour >= 0) slot = 1;

      completedCounts[slot]++;
      weightTotals[slot] += task.weight / 1000;
    });

    return { timeLabels, completedCounts, weightTotals };
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
}));
