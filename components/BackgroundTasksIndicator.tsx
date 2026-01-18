import React from 'react';
import { RobotIcon, CheckCircleIcon, XCircleIcon, XIcon } from './Icons';
import { BackgroundTask } from '../hooks/useBackgroundTasks';

interface BackgroundTasksIndicatorProps {
  tasks: BackgroundTask[];
  onTaskClick?: (task: BackgroundTask) => void;
  onDismiss?: () => void;
}

const BackgroundTasksIndicator: React.FC<BackgroundTasksIndicatorProps> = ({
  tasks,
  onTaskClick,
  onDismiss
}) => {
  // 显示运行中和刚完成的任务（完成的任务显示10秒后自动消失）
  const runningTasks = tasks.filter(t => t.status === 'running');
  const completedTasks = tasks.filter(t => t.status === 'completed' && Date.now() - (t.completedAt || 0) < 30000);
  const displayTasks = [...runningTasks, ...completedTasks];

  if (displayTasks.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
      <div className="bg-white border border-blue-200 rounded-lg shadow-xl p-3 min-w-[280px] max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${runningTasks.length > 0 ? 'bg-blue-100' : 'bg-green-100'}`}>
              {runningTasks.length > 0 ? <RobotIcon className="w-4 h-4 text-blue-600" /> : <CheckCircleIcon className="w-4 h-4 text-green-600" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">后台任务</p>
              <p className="text-xs text-slate-500">{runningTasks.length > 0 ? `${runningTasks.length} 个运行中` : `${completedTasks.length} 个已完成`}</p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
              title="关闭"
            >
              <XIcon className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Task List */}
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {displayTasks.map(task => (
            <div
              key={task.id}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                onTaskClick ? 'hover:bg-blue-50 cursor-pointer' : ''
              } ${task.status === 'completed' ? 'bg-green-50' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onTaskClick?.(task);
              }}
            >
              {task.status === 'running' ? (
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              ) : (
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">
                  {task.title}
                </p>
                <p className="text-xs text-slate-500">
                  {task.status === 'completed' ? '已完成，点击查看' : task.type === 'chat' ? '聊天中' : task.type === 'analysis' ? '分析中' : '寻源中'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="mt-2 pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center">
            {runningTasks.length > 0 ? '完成后将通知您查看结果' : '点击任务查看结果'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BackgroundTasksIndicator;
