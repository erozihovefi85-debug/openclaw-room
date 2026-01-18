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
    <div className="mt-4 flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
      {/* 上一阶段按钮 */}
      {onPreviousStage && previousConfig && (
        <button
          onClick={onPreviousStage}
          disabled={!canGoPrevious}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            canGoPrevious
              ? 'bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 border border-slate-200 shadow-sm'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-transparent'
          }`}
        >
          <ChevronLeftIcon className="w-4 h-4" />
          <span className="hidden sm:inline">返回</span>
          <span>{previousConfig.title}</span>
        </button>
      )}

      {/* 当前阶段指示器 */}
      <div className="flex-1 flex items-center justify-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg bg-${currentConfig.color}-100 border border-${currentConfig.color}-200`}>
          {currentConfig.icon}
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-800">{currentConfig.title}</div>
          <div className="text-xs text-slate-500">{currentConfig.description}</div>
        </div>
      </div>

      {/* 下一阶段按钮 */}
      {onNextStage && nextConfig && (
        <button
          onClick={onNextStage}
          disabled={!canGoNext}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            canGoNext
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
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
