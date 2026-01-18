import { useState, useCallback, useRef } from 'react';

export interface BackgroundTask {
  id: string;
  type: 'chat' | 'analysis' | 'sourcing';
  title: string;
  status: 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  completedAt?: number; // 任务完成时间戳
  result?: any;
  error?: string;
  conversationId?: string;
  contextId?: string;
}

const BACKGROUND_TASKS_KEY = 'procureai_background_tasks';

export const useBackgroundTasks = () => {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const tasksRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 添加后台任务
  const addTask = useCallback((
    type: BackgroundTask['type'],
    title: string,
    conversationId?: string,
    contextId?: string
  ) => {
    const task: BackgroundTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      status: 'running',
      startTime: Date.now(),
      conversationId,
      contextId
    };

    setTasks(prev => [...prev, task]);

    // 自动清理超时任务（30分钟）
    const timeoutId = setTimeout(() => {
      completeTask(task.id, 'failed', undefined, '任务超时');
    }, 30 * 60 * 1000);

    tasksRef.current.set(task.id, timeoutId);

    return task.id;
  }, []);

  // 完成任务
  const completeTask = useCallback((
    taskId: string,
    status: 'completed' | 'failed',
    result?: any,
    error?: string
  ) => {
    // 清理超时定时器
    const timeoutId = tasksRef.current.get(taskId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      tasksRef.current.delete(taskId);
    }

    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          status,
          endTime: Date.now(),
          completedAt: Date.now(), // 添加完成时间戳
          result,
          error
        };
      }
      return task;
    }));
  }, []);

  // 移除任务
  const removeTask = useCallback((taskId: string) => {
    // 清理超时定时器
    const timeoutId = tasksRef.current.get(taskId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      tasksRef.current.delete(taskId);
    }

    setTasks(prev => prev.filter(task => task.id !== taskId));
  }, []);

  // 清除所有已完成/失败的任务
  const clearCompletedTasks = useCallback(() => {
    setTasks(prev => {
      const toRemove = prev.filter(t => t.status !== 'running');
      toRemove.forEach(task => {
        const timeoutId = tasksRef.current.get(task.id);
        if (timeoutId) {
          clearTimeout(timeoutId);
          tasksRef.current.delete(task.id);
        }
      });
      return prev.filter(t => t.status === 'running');
    });
  }, []);

  // 获取特定任务
  const getTask = useCallback((taskId: string) => {
    return tasks.find(task => task.id === taskId);
  }, [tasks]);

  // 获取运行中的任务数量
  const runningCount = tasks.filter(t => t.status === 'running').length;

  return {
    tasks,
    runningCount,
    addTask,
    completeTask,
    removeTask,
    clearCompletedTasks,
    getTask
  };
};
