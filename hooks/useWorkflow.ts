import { useState, useEffect, useCallback } from 'react';
import { WorkflowStage, WorkflowState, STAGE_CONFIG } from '../types/workflow';

const STORAGE_KEY = 'procureai_workflow_state';
const STORAGE_VERSION = '1.0'; // 版本号，用于检测旧数据
const VERSION_KEY = 'procureai_workflow_version';

// 获取初始状态
const getInitialState = (): WorkflowState => ({
  currentStage: WorkflowStage.REQUIREMENT_INPUT,
  completedStages: [],
  stageData: {} as Record<WorkflowStage, any>,
  createdAt: Date.now(),
  updatedAt: Date.now()
});

export const useWorkflow = () => {
  const [workflowState, setWorkflowState] = useState<WorkflowState>(() => {
    // 从 localStorage 加载
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedVersion = localStorage.getItem(VERSION_KEY);

    // 检查版本，如果不匹配则重置
    if (saved && savedVersion !== STORAGE_VERSION) {
      console.log('Workflow state version mismatch, resetting...');
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
      return getInitialState();
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 额外验证：确保数据结构正确
        if (parsed && parsed.currentStage && Array.isArray(parsed.completedStages)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse workflow state:', e);
      }
    }

    // 初始状态
    return getInitialState();
  });

  // 保存到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflowState));
    localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
  }, [workflowState]);

  // 推进到下一阶段
  const advanceToNextStage = useCallback((data?: any) => {
    setWorkflowState(prev => {
      const stages = Object.values(WorkflowStage);
      const currentIndex = stages.indexOf(prev.currentStage);

      if (currentIndex < stages.length - 1) {
        const nextStage = stages[currentIndex + 1];
        return {
          ...prev,
          currentStage: nextStage,
          completedStages: [...prev.completedStages, prev.currentStage],
          stageData: {
            ...prev.stageData,
            [prev.currentStage]: data || prev.stageData[prev.currentStage]
          },
          updatedAt: Date.now()
        };
      }

      return prev;
    });
  }, []);

  // 返回上一阶段（受限：只能返回一个阶段）
  const goToPreviousStage = useCallback(() => {
    setWorkflowState(prev => {
      if (prev.completedStages.length === 0) return prev;

      const lastCompleted = prev.completedStages[prev.completedStages.length - 1];
      return {
        ...prev,
        currentStage: lastCompleted,
        completedStages: prev.completedStages.slice(0, -1),
        updatedAt: Date.now()
      };
    });
  }, []);

  // 跳转到指定阶段
  // 支持跳转到下一阶段（将当前阶段标记为完成）或返回已完成阶段
  const jumpToStage = useCallback((stage: WorkflowStage) => {
    setWorkflowState(prev => {
      const stages = Object.values(WorkflowStage);
      const currentIndex = stages.indexOf(prev.currentStage);
      const targetIndex = stages.indexOf(stage);

      // 情况1：跳转到下一阶段（需要标记当前阶段为完成）
      if (targetIndex === currentIndex + 1) {
        console.log('[jumpToStage] Advancing to next stage, marking current as completed');
        return {
          ...prev,
          currentStage: stage,
          completedStages: [...prev.completedStages, prev.currentStage],
          updatedAt: Date.now()
        };
      }

      // 情况2：返回已完成阶段
      const isCompletedStage = prev.completedStages.includes(stage);
      if (isCompletedStage) {
        console.log('[jumpToStage] Returning to completed stage');
        return {
          ...prev,
          currentStage: stage,
          updatedAt: Date.now()
        };
      }

      // 情况3：停留在当前阶段
      if (stage === prev.currentStage) {
        return prev;
      }

      // 其他情况：不允许跳转
      console.warn('[jumpToStage] Invalid stage transition:', prev.currentStage, '->', stage);
      return prev;
    });
  }, []);

  // 重置工作流
  const resetWorkflow = useCallback(() => {
    const newState = getInitialState();
    setWorkflowState(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
  }, []);

  // 处理所有历史消息的AI响应，更新工作流状态到最新
  const processHistoricalMessages = useCallback((messages: Array<{ role: string; content: string; isTyping?: boolean }>) => {
    console.log('[processHistoricalMessages] ===== START =====');
    console.log('[processHistoricalMessages] Processing', messages.length, 'messages');

    // 使用函数式更新，避免闭包陷阱和依赖循环
    setWorkflowState(prevState => {
      console.log('[processHistoricalMessages] prevState.currentStage:', prevState.currentStage);
      const stages = Object.values(WorkflowStage);
      let currentStageIndex = stages.indexOf(prevState.currentStage);
      let currentStage = prevState.currentStage;
      let completedStages = [...prevState.completedStages];
      let stageData = { ...prevState.stageData };
      let hasTransitioned = false;

      // 按顺序处理所有消息
      for (const message of messages) {
        if (message.role !== 'assistant') continue;
        // 跳过正在打字的消息
        if (message.isTyping) continue;

        const aiResponse = message.content;
        const currentIndex = stages.indexOf(currentStage);
        console.log('[processHistoricalMessages] Processing message, currentStage:', currentStage);
        console.log('[processHistoricalMessages] Content preview:', aiResponse.substring(0, 80));

        // 1. 检查配置的触发词
        const currentConfig = STAGE_CONFIG[currentStage];
        if (currentConfig.nextTrigger && currentConfig.nextTrigger.length > 0) {
          const hasTriggerKeyword = currentConfig.nextTrigger.some(keyword => {
            const found = aiResponse.includes(keyword);
            if (found) {
              console.log('[processHistoricalMessages] ✅ Found trigger keyword:', keyword);
            }
            return found;
          });

          if (hasTriggerKeyword && currentIndex < stages.length - 1) {
            const nextStage = stages[currentIndex + 1];
            console.log('[processHistoricalMessages] 🚀 Advancing from', STAGE_CONFIG[currentStage].title, 'to', STAGE_CONFIG[nextStage].title);
            completedStages.push(currentStage);
            stageData[currentStage] = { aiResponse };
            currentStage = nextStage;
            currentStageIndex = currentIndex + 1;
            hasTransitioned = true;
            continue;
          }
        }

        // 2. 检查通用的"已进入**XX**阶段"格式
        const stageTransitionPattern = /已进入\*\*([^*]+)\*\*[阶段期]/;
        const match = aiResponse.match(stageTransitionPattern);
        if (match) {
          const targetStageTitle = match[1];
          console.log('[processHistoricalMessages] Found stage transition pattern:', targetStageTitle);

          // 查找匹配的阶段
          for (let i = currentIndex + 1; i < stages.length; i++) {
            const stage = stages[i];
            const config = STAGE_CONFIG[stage];
            if (config.title === targetStageTitle || targetStageTitle.includes(config.title)) {
              console.log('[processHistoricalMessages] ✅ Matched stage:', config.title, 'at index:', i);

              // 找到目标阶段，标记中间所有阶段为已完成
              if (i > currentIndex) {
                const newlyCompleted = stages.slice(currentIndex, i);
                console.log('[processHistoricalMessages] 🚀 Marking completed:', newlyCompleted.map(s => STAGE_CONFIG[s].title));
                // 将当前阶段及之前的所有阶段标记为已完成（不包括目标阶段）
                completedStages.push(...newlyCompleted);
                stageData[currentStage] = { aiResponse };
                currentStage = stage;
                currentStageIndex = i;
                hasTransitioned = true;
                break;
              }
            }
            if (currentStageIndex === i) break; // 已找到并更新，退出内层循环
          }
        }
      }

      // 如果有任何阶段转换，更新状态
      if (hasTransitioned) {
        console.log('[processHistoricalMessages] ✅ Updating workflow state to:', STAGE_CONFIG[currentStage].title);
        console.log('[processHistoricalMessages] Completed stages:', completedStages.map(s => STAGE_CONFIG[s].title));
        console.log('[processHistoricalMessages] ===== END (with updates) =====');
        return {
          currentStage,
          completedStages,
          stageData,
          createdAt: prevState.createdAt,
          updatedAt: Date.now()
        };
      }

      console.log('[processHistoricalMessages] ❌ No transition detected, returning prevState');
      console.log('[processHistoricalMessages] ===== END (no changes) =====');
      // 没有转换时返回原状态（返回相同引用，避免触发重新渲染）
      return prevState;
    });
  }, []); // 空依赖数组，使用函数式更新避免闭包问题

  // 检查 AI 响应是否包含阶段转换信号
  const checkForStageTransition = useCallback((aiResponse: string) => {
    console.log('[checkForStageTransition] === START ===');
    
    // 使用函数式更新来避免闭包问题
    let transitioned = false;
    
    setWorkflowState(prev => {
      const currentConfig = STAGE_CONFIG[prev.currentStage];
      const stages = Object.values(WorkflowStage);
      const currentIndex = stages.indexOf(prev.currentStage);

      console.log('[checkForStageTransition] Current stage:', STAGE_CONFIG[prev.currentStage].title);
      console.log('[checkForStageTransition] AI response preview:', aiResponse.substring(0, 100));

      // 1. 首先检查配置的触发词
      if (currentConfig.nextTrigger && currentConfig.nextTrigger.length > 0) {
        const hasTriggerKeyword = currentConfig.nextTrigger.some(keyword =>
          aiResponse.includes(keyword)
        );

        if (hasTriggerKeyword) {
          console.log('[checkForStageTransition] ✅ Trigger keyword found! Advancing to next stage');
          const nextStage = stages[currentIndex + 1];
          if (nextStage) {
            transitioned = true;
            console.log('[checkForStageTransition] Advancing from', prev.currentStage, 'to', nextStage);
            return {
              ...prev,
              currentStage: nextStage,
              completedStages: [...prev.completedStages, prev.currentStage],
              stageData: {
                ...prev.stageData,
                [prev.currentStage]: { aiResponse }
              },
              updatedAt: Date.now()
            };
          }
        }
      }

      // 2. 检查通用的"已进入**XX**阶段"格式
      const stageTransitionPattern = /已进入\*\*([^*]+)\*\*[阶段期]/;
      const match = aiResponse.match(stageTransitionPattern);
      if (match) {
        const targetStageTitle = match[1];
        console.log('[checkForStageTransition] Found stage transition pattern:', targetStageTitle);
        // 查找匹配的阶段
        for (let i = currentIndex + 1; i < stages.length; i++) {
          const stage = stages[i];
          const config = STAGE_CONFIG[stage];
          if (config.title === targetStageTitle || targetStageTitle.includes(config.title)) {
            console.log('[checkForStageTransition] ✅ Matched stage:', config.title, 'at index:', i);
            // 找到目标阶段，标记中间所有阶段为已完成
            if (i > currentIndex) {
              transitioned = true;
              // 手动推进到目标阶段
              const newlyCompleted = stages.slice(currentIndex, i);
              console.log('[checkForStageTransition] Marking completed:', newlyCompleted);
              return {
                ...prev,
                currentStage: stage,
                completedStages: [...prev.completedStages, ...newlyCompleted],
                stageData: {
                  ...prev.stageData,
                  [prev.currentStage]: { aiResponse }
                },
                updatedAt: Date.now()
              };
            }
          }
        }
      }

      console.log('[checkForStageTransition] ❌ No transition triggered');
      return prev;
    });

    console.log('[checkForStageTransition] === END ===, transitioned:', transitioned);
    return transitioned;
  }, []);

  // 手动推进到指定阶段（用于需要用户确认的场景）
  const manuallyAdvanceToStage = useCallback((targetStage: WorkflowStage, data?: any) => {
    setWorkflowState(prev => {
      const stages = Object.values(WorkflowStage);
      const currentIndex = stages.indexOf(prev.currentStage);
      const targetIndex = stages.indexOf(targetStage);

      // 只能向前推进，不能后退
      if (targetIndex <= currentIndex) {
        console.warn('Cannot manually advance to a previous or current stage');
        return prev;
      }

      // 标记当前阶段及中间所有阶段为已完成
      const newlyCompleted = stages.slice(currentIndex, targetIndex);

      return {
        ...prev,
        currentStage: targetStage,
        completedStages: [...prev.completedStages, ...newlyCompleted],
        stageData: {
          ...prev.stageData,
          [prev.currentStage]: data || prev.stageData[prev.currentStage]
        },
        updatedAt: Date.now()
      };
    });
  }, []);

  // 更新当前阶段数据
  const updateStageData = useCallback((data: any) => {
    setWorkflowState(prev => ({
      ...prev,
      stageData: {
        ...prev.stageData,
        [prev.currentStage]: data
      },
      updatedAt: Date.now()
    }));
  }, []);

  return {
    workflowState,
    advanceToNextStage,
    goToPreviousStage,
    jumpToStage,
    resetWorkflow,
    checkForStageTransition,
    manuallyAdvanceToStage,
    updateStageData,
    processHistoricalMessages
  };
};
