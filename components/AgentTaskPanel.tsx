import React, { useMemo } from 'react';
import { AgentTaskState, AgentTaskStage } from '../types';
import { CheckCircleIcon, CircleIcon, LoaderIcon, XCircleIcon } from './Icons';

const STAGE_LABELS = {
  casual: [
    { key: 'receive', label: '接收任务' },
    { key: 'preliminary', label: '初步调研' },
    { key: 'deep', label: '深度调研' },
    { key: 'check', label: '结果检查' },
    { key: 'review', label: '结果校对' },
    { key: 'result', label: '选购方案' }
  ],
  standard: [
    { key: 'receive', label: '接收任务' },
    { key: 'preliminary', label: '初步调研' },
    { key: 'deep', label: '深度搜索' },
    { key: 'check', label: '结果检查' },
    { key: 'review', label: '结果校对' },
    { key: 'result', label: '供应商推荐' }
  ]
};

const buildDefaultStages = (mode: 'casual' | 'standard'): AgentTaskStage[] => {
  return STAGE_LABELS[mode].map((stage, index) => ({
    key: stage.key,
    label: stage.label,
    status: 'pending',
    order: index
  }));
};

const mergeStages = (mode: 'casual' | 'standard', stages?: AgentTaskStage[]) => {
  const defaults = buildDefaultStages(mode);
  if (!stages || stages.length === 0) return defaults;
  const stageMap = new Map(stages.map((stage) => [stage.key, stage]));
  return defaults.map((def) => ({
    ...def,
    ...(stageMap.get(def.key) || {})
  }));
};

const StatusIcon: React.FC<{ status: AgentTaskStage['status'] }> = ({ status }) => {
  if (status === 'success') return <CheckCircleIcon className="w-4 h-4 text-emerald-500" />;
  if (status === 'failed') return <XCircleIcon className="w-4 h-4 text-red-500" />;
  if (status === 'running') return <LoaderIcon className="w-4 h-4 text-blue-500 animate-spin" />;
  return <CircleIcon className="w-4 h-4 text-slate-300" />;
};

interface AgentTaskPanelProps {
  mode: 'casual' | 'standard';
  taskState?: AgentTaskState;
}

const AgentTaskPanel: React.FC<AgentTaskPanelProps> = ({ mode, taskState }) => {
  const stages = useMemo(() => mergeStages(mode, taskState?.stages), [mode, taskState?.stages]);
  const currentStage = taskState?.currentStageKey;

  return (
    <aside className="hidden xl:flex flex-col w-80 border-l border-slate-100 bg-white h-full">
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Agent 任务状态</h3>
          <span className="text-xs text-slate-400">实时更新</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">{mode === 'casual' ? '小美' : '小帅'}执行闭环</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {stages.map((stage) => (
          <div key={stage.key} className="flex items-start gap-3">
            <div className="pt-0.5">
              <StatusIcon status={stage.status} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${currentStage === stage.key ? 'text-blue-600' : 'text-slate-700'}`}>
                  {stage.label}
                </span>
                <span className="text-xs text-slate-400">
                  {stage.status === 'running' ? '进行中' : stage.status === 'success' ? '已完成' : stage.status === 'failed' ? '失败' : '等待中'}
                </span>
              </div>
              {stage.status === 'running' && stage.lastNodeTitle && (
                <div className="mt-1 text-xs text-slate-500">{stage.lastNodeTitle}</div>
              )}
              {stage.status === 'failed' && stage.lastNodeTitle && (
                <div className="mt-1 text-xs text-red-500">{stage.lastNodeTitle}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default AgentTaskPanel;
