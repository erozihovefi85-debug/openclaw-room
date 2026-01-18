import React from 'react';
import { WorkflowStage, STAGE_CONFIG } from '../types/workflow';
import { CheckCircleIcon } from './Icons';

interface WorkflowProgressProps {
  currentStage: WorkflowStage;
  completedStages: WorkflowStage[];
  onStageClick: (stage: WorkflowStage) => void;
}

const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  currentStage,
  completedStages,
  onStageClick
}) => {
  const stages = Object.values(WorkflowStage);
  const currentIndex = stages.indexOf(currentStage);

  // 只在开发环境输出详细日志
  if (import.meta.env.DEV) {
    console.log('[WorkflowProgress] currentStage:', currentStage, 'completedStages:', completedStages);
  }

  // 检查阶段是否可以点击
  const canClickStage = (stage: WorkflowStage): boolean => {
    const index = stages.indexOf(stage);
    const isCompleted = completedStages.includes(stage);
    const isCurrent = stage === currentStage;
    // 只有已完成的阶段才能点击返回查看
    // 当前阶段和上一阶段也可以点击
    const isPrevious = index === currentIndex - 1;

    return isCompleted || isCurrent || isPrevious;
  };

  // 判断阶段状态样式
  const getStageStatus = (stage: WorkflowStage, index: number) => {
    const isCompleted = completedStages.includes(stage);
    const isCurrent = stage === currentStage;

    if (isCompleted) return 'completed';
    if (isCurrent) return 'current';
    // 只有当前阶段之前的已完成阶段才标记为 completed
    // 其他所有未完成的阶段都是 pending（灰色）
    return 'pending';
  };

  return (
    <div className="bg-white border-b border-slate-200 px-2 md:px-4 py-2 md:py-3">
      {/* 进度条 */}
      <div className="max-w-4xl mx-auto overflow-x-auto">
        <div className="flex items-center justify-between min-w-max md:min-w-0 md:justify-between px-1">
          {stages.map((stage, index) => {
            const config = STAGE_CONFIG[stage];
            const stageStatus = getStageStatus(stage, index);
            const isClickable = canClickStage(stage);

            return (
              <React.Fragment key={stage}>
                {/* 阶段节点 */}
                <div
                  className={`flex flex-col items-center cursor-pointer transition-all ${
                    !isClickable ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'
                  }`}
                  onClick={() => isClickable && onStageClick(stage)}
                >
                  {/* 图标 */}
                  <div
                    className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-lg transition-all ${
                      stageStatus === 'completed'
                        ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                        : stageStatus === 'current'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-200 animate-pulse'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {stageStatus === 'completed' ? (
                      <CheckCircleIcon className="w-4 h-4 md:w-5 md:h-5" />
                    ) : (
                      <span>{config.icon}</span>
                    )}
                  </div>

                  {/* 标题 - 移动端只显示部分标题以节省空间 */}
                  <div className={`mt-0.5 md:mt-1 text-center ${index % 2 === 0 ? 'block' : 'hidden md:block'}`}>
                    <p
                      className={`text-[10px] md:text-xs font-medium whitespace-nowrap ${
                        stageStatus === 'current'
                          ? 'text-blue-600'
                          : stageStatus === 'completed'
                          ? 'text-green-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {config.title}
                    </p>
                  </div>
                </div>

                {/* 连接线 */}
                {index < stages.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 md:h-1 mx-1 md:mx-2 rounded-full transition-all min-w-[8px] md:min-w-0 ${
                      stageStatus === 'completed' || (stageStatus === 'current' && index < currentIndex)
                        ? 'bg-gradient-to-r from-green-400 to-blue-400'
                        : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* 当前阶段描述 */}
        <div className="mt-3 md:mt-4 text-center">
          <p className="text-xs md:text-sm text-slate-600">
            <span className="font-medium">当前阶段：</span>
            <span className="ml-1">{STAGE_CONFIG[currentStage].title}</span>
            <span className="mx-1 md:mx-2">•</span>
            <span className="text-slate-500">{STAGE_CONFIG[currentStage].description}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkflowProgress;
