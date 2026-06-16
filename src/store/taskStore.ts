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

  deleteTask: (id) =>
    set((state) => ({
      taskList: state.taskList.filter((task) => task.id !== id),
      selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
    })),

  getTasksByStatus: (status) => get().taskList.filter((task) => task.status === status),

  getTaskStats: () => {
    const { taskList } = get();
    const today = new Date().toISOString().split('T')[0];
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
}));
