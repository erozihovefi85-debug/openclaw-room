import React from 'react';
import { ChevronRightIcon, ChevronLeftIcon } from './Icons';
import { WorkflowStage, STAGE_CONFIG } from '../types/workflow';

interface WorkflowNavigationProps {
  currentStage: WorkflowStage;
  completedStages: WorkflowStage[];
  onNextStage?: () => void;
  onPreviousStage?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
}

const WorkflowNavigation: React.FC<WorkflowNavigationProps> = ({
  currentStage,
  completedStages,
  onNextStage,
  onPreviousStage,
  canGoNext = true,
  canGoPrevious = true,
}) => {
  const stages = Object.values(WorkflowStage);
  const currentIndex = stages.indexOf(currentStage);
  const nextStage = stages[currentIndex + 1];
  const previousStage = stages[currentIndex - 1];

  const currentConfig = STAGE_CONFIG[currentStage];
  const nextConfig = nextStage ? STAGE_CONFIG[nextStage] : null;
  const previousConfig = previousStage ? STAGE_CONFIG[previousStage] : null;

  return (
    <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-lg p-4 shadow-sm">
      {/* 上一阶段按钮 */}
      {onPreviousStage && previousConfig && (
        <button
          onClick={onPreviousStage}
          disabled={!canGoPrevious}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border-2 ${
            canGoPrevious
              ? 'bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border-transparent'
          }`}
          title={`返回：${previousConfig.title}`}
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">返回</span>
          <span>{previousConfig.title}</span>
        </button>
      )}

      {/* 当前阶段指示器 */}
      <div className="flex flex-1 flex-col items-center justify-center gap-1 min-w-[200px]">
        {/* 阶段图标 */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md bg-${currentConfig.color}-100 border border-${currentConfig.color}-200`}>
          <span className="text-2xl">{currentConfig.icon}</span>
        </div>

        {/* 阶段信息 */}
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-800">{currentConfig.title}</div>
          <div className="text-xs text-slate-500">{currentConfig.description}</div>
        </div>

        {/* 已完成阶段指示器 */}
        {completedStages.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            {completedStages.map((stage, index) => (
              <div
                key={index}
                className={`w-6 h-1 rounded-full bg-${STAGE_CONFIG[stage].color}-200`}
                title={STAGE_CONFIG[stage].title}
              />
            ))}
          </div>
        )}
      </div>

      {/* 下一阶段按钮 */}
      {onNextStage && nextConfig && (
        <button
          onClick={onNextStage}
          disabled={!canGoNext}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border-2 ${
            canGoNext
              ? `bg-${currentConfig.color}-500 text-white hover:bg-${currentConfig.color}-600 hover:border-${currentConfig.color}-600 hover:shadow-md hover:shadow-${currentConfig.color}-200`
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border-transparent'
          }`}
          title={`进入：${nextConfig.title}`}
        >
          <span>进入</span>
          <span className="hidden sm:inline">下一阶段：</span>
          <span>{nextConfig.title}</span>
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default WorkflowNavigation;
