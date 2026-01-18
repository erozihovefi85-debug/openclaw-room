import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import HomeView from './components/HomeView';
import StandardView from './components/StandardView';
import LoginModal from './components/LoginModalNew';
import UserCenter from './components/UserCenter';
import AdminDashboard from './components/AdminDashboard';
import SupplierFavorites from './components/SupplierFavorites';
import ProductWishlist from './components/ProductWishlist';
import ErrorBoundary from './components/ErrorBoundary';
import ToastNotifications, { ToastNotification } from './components/ToastNotifications';
import BackgroundTasksIndicator from './components/BackgroundTasksIndicator';
import { MenuIcon, ChevronLeftIcon, SearchIcon, HomeIcon, ShareIcon } from './components/Icons';
import LZString from 'lz-string';
import {
  Conversation,
  Message,
  LoadingState,
  UploadedFile,
  AppMode,
  User
} from './types';
import { chatAPI, conversationAPI } from './services/api';
import { CURRENT_USER_ID } from './config';
import { useWorkflow } from './hooks/useWorkflow';
import { useBackgroundTasks } from './hooks/useBackgroundTasks';

// Config for placeholders and empty states per context
const UI_CONFIG: Record<string, { placeholder: string; emptyTitle: string; emptyDesc: string }> = {
    'casual_main': {
        placeholder: "输入你的采购需求...",
        emptyTitle: "AI找出全网真实评价与低价，就找小美",
        emptyDesc: "记得加入商品心愿单，让购物更加轻松愉快！"
    },
    'standard_keyword': {
        placeholder: "请详细描述您的采购需求，包括商品类型、数量、规格要求、预算范围、交付时间等信息...",
        emptyTitle: "AI驱动快速寻源，就找小帅",
        emptyDesc: "智能细化采购清单，快速匹配可信供应商。"
    },
    'standard_docgen': {
        placeholder: "在此编辑采购需求文档内容...",
        emptyTitle: "采购文档生成",
        emptyDesc: "输入需求要点，自动生成标准的采购文档。"
    },
    'standard_supplier': {
        placeholder: "请输入供应商匹配的具体需求，包括：产品类型、技术规格、质量要求、服务需求、地理位置偏好等...",
        emptyTitle: "供应商匹配分析",
        emptyDesc: "基于需求匹配优质供应商，提供分析建议。"
    },
    'standard_price': {
        placeholder: "请输入需要分析的产品或服务，包括：产品名称、规格型号、数量、期望价格范围、分析周期等...",
        emptyTitle: "价格分析需求",
        emptyDesc: "提供历史价格分析与市场比价服务。"
    }
};

const App: React.FC = () => {
  // --- Auth State ---
  const [user, setUser] = useState<User | null>(() => {
      try {
        const saved = localStorage.getItem('procureai_auth_user');
        if (saved) {
          return JSON.parse(saved);
        }
        return null;
      } catch (e) {
        console.error('[App] Failed to parse user from localStorage:', e);
        localStorage.removeItem('procureai_auth_user');
        return null;
      }
  });
  const [showLoginModal, setShowLoginModal] = useState(false);

  // --- Background Tasks & Notifications ---
  const {
    tasks: backgroundTasks,
    addTask,
    completeTask,
    removeTask
  } = useBackgroundTasks();
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [showBackgroundTasks, setShowBackgroundTasks] = useState(false);
  const prevBackgroundTasksRef = useRef<typeof backgroundTasks>([]);
  const notifiedTaskIdsRef = useRef<Set<string>>(new Set()); // 跟踪已通知的任务

  // 监听任务完成，显示通知和重新显示指示器
  useEffect(() => {
    const prevTasks = prevBackgroundTasksRef.current;

    // 检测是否有任务刚刚完成（从 running 变为 completed）
    const newlyCompletedTasks = backgroundTasks.filter(task => {
      const prevTask = prevTasks.find(t => t.id === task.id);
      return prevTask?.status === 'running' && task.status === 'completed';
    });

    // 检测是否有新任务开始（之前不存在或不是运行状态，现在是运行状态）
    const hasNewRunning = backgroundTasks.some(task => {
      const prevTask = prevTasks.find(t => t.id === task.id);
      return (!prevTask || prevTask.status !== 'running') && task.status === 'running';
    });

    // 如果有新完成的任务，显示通知并重新显示指示器
    if (newlyCompletedTasks.length > 0) {
      setShowBackgroundTasks(true);

      newlyCompletedTasks.forEach(task => {
        // 只为尚未通知的任务显示通知
        if (!notifiedTaskIdsRef.current.has(task.id)) {
          addNotification({
            type: 'success',
            title: '后台任务完成',
            message: `"${task.title}" 已完成，点击右下角查看结果`,
            duration: 5000
          });
          notifiedTaskIdsRef.current.add(task.id);
        }
      });
    }

    // 清理已删除任务的通知记录
    const currentTaskIds = new Set(backgroundTasks.map(t => t.id));
    notifiedTaskIdsRef.current = new Set([...notifiedTaskIdsRef.current].filter(id => currentTaskIds.has(id)));

    // 如果有新任务开始且指示器被隐藏，显示指示器
    if (hasNewRunning && !showBackgroundTasks) {
      setShowBackgroundTasks(true);
    }

    prevBackgroundTasksRef.current = backgroundTasks;
  }, [backgroundTasks, showBackgroundTasks]);

  // --- Shared View Logic ---
  const [sharedMessages, setSharedMessages] = useState<Message[] | null>(null);

  useEffect(() => {
      // Check for share_data in URL
      const params = new URLSearchParams(window.location.search);
      const shareData = params.get('share_data');
      if (shareData) {
          try {
              const jsonStr = LZString.decompressFromEncodedURIComponent(shareData);
              if (jsonStr) {
                  const payload = JSON.parse(jsonStr);
                  const msgs: Message[] = payload.map((p: any, index: number) => ({
                      id: `shared-${index}`,
                      role: p.r,
                      content: p.c,
                      created_at: Date.now(),
                      files: p.f ? p.f.map((f: any, i: number) => ({ name: f.n, size: f.s })) : [],
                      generated_files: p.g
                  }));
                  setSharedMessages(msgs);
                  return;
              }
          } catch (e) {
              console.error("Failed to parse shared data", e);
          }
      }
  }, []);

  // --- Navigation State ---
  const [appMode, setAppMode] = useState<AppMode>('home');
  const [standardTab, setStandardTab] = useState<string>('keyword');
  const [previousMode, setPreviousMode] = useState<AppMode>('home');
  const [previousStandardTab, setPreviousStandardTab] = useState<string>('keyword');

  // --- Workflow State ---
  const {
    workflowState,
    advanceToNextStage,
    goToPreviousStage,
    jumpToStage,
    resetWorkflow,
    checkForStageTransition,
    updateStageData,
    processHistoricalMessages
  } = useWorkflow();

  // --- Chat State ---
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(() => {
      try {
          const userId = user?.id || CURRENT_USER_ID;
          const saved = localStorage.getItem(`procureai_history_${userId}`);
          return saved ? JSON.parse(saved) : {};
      } catch (e) {
          return {};
      }
  });

  // Per-conversation loading states - supports parallel conversations
  const [conversationLoadingStates, setConversationLoadingStates] = useState<Record<string, LoadingState>>({});
  const [currentNodeNames, setCurrentNodeNames] = useState<Record<string, string | null>>({});

  const getCurrentConversationLoadingState = () => {
    const key = currentConversationId || currentContextId;
    return conversationLoadingStates[key] || LoadingState.IDLE;
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [currentConversationId, setCurrentConversationId] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);

  const currentContextId = useMemo(() => {
    if (appMode === 'casual') return 'casual_main';
    if (appMode === 'standard') return `standard_${standardTab}`;
    return 'casual_main';
  }, [appMode, standardTab]);

  const currentMessages = useMemo(() => {
    // If a conversation is selected, show its messages (cached by conversation ID)
    if (currentConversationId) {
      return messagesMap[currentConversationId] || [];
    }
    // Otherwise, show messages for current context (for new conversation)
    return messagesMap[currentContextId] || [];
  }, [messagesMap, currentContextId, currentConversationId]);

  const currentUiConfig = UI_CONFIG[currentContextId] || UI_CONFIG['casual_main'];

  // Handle Auth Changes
  useEffect(() => {
      if (user) {
          localStorage.setItem('procureai_auth_user', JSON.stringify(user));
      } else {
          localStorage.removeItem('procureai_auth_user');
      }
  }, [user]);

  useEffect(() => {
      if (!sharedMessages) {
          try {
              const userId = user?.id || CURRENT_USER_ID;
              localStorage.setItem(`procureai_history_${userId}`, JSON.stringify(messagesMap));
          } catch (e) {
              console.error("Failed to save history", e);
          }
      }
  }, [messagesMap, user, sharedMessages]);

  useEffect(() => {
    // 只在进入聊天模式且没有选中的对话时才清空
    // 如果已经有选中的对话（比如点击了后台任务），不要清空
    if (appMode !== 'home' && appMode !== 'user-center' && appMode !== 'admin' && !sharedMessages) {
        // 只在当前没有选中任何对话时才清空并重新加载
        if (!currentConversationId) {
          loadConversations();
        }
    }
  }, [currentContextId, appMode, sharedMessages]);

  const loadConversations = async () => {
    try {
      const userId = user?.id || CURRENT_USER_ID;
      // Use backend API instead of direct Dify call to avoid CORS
      const response = await conversationAPI.getAll({ user: userId, contextId: currentContextId });
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    }
  };

  const handleContextSwitch = (newMode: AppMode, newTab?: string) => {
      // Store previous mode before switching (for supplier favorites and wishlist return)
      if (newMode === 'user-center' || newMode === 'suppliers' || newMode === 'wishlist') {
        setPreviousMode(appMode);
        if (appMode === 'standard') {
          setPreviousStandardTab(standardTab);
        }
      }

      // Permission check: standard procurement requires login
      if (newMode === 'standard' && !user) {
          setShowLoginModal(true);
          return;
      }

      // Permission check: casual mode also requires login
      if (newMode === 'casual' && !user) {
          setShowLoginModal(true);
          return;
      }

      // Permission check: admin requires admin role
      if (newMode === 'admin' && (!user || user.role !== 'ADMIN')) {
        alert('需要管理员权限');
        return;
      }

      // When switching to chat modes (casual or standard), start with a fresh conversation
      if (newMode === 'casual' || newMode === 'standard') {
        setCurrentConversationId('');

        // 切换到标准模式时，重置工作流状态
        if (newMode === 'standard') {
          resetWorkflow();
        }
      }

      setAppMode(newMode);
      if (newTab) setStandardTab(newTab);

      // 切换标准模式的标签页时，重置工作流状态
      if (newMode === 'standard' && newTab) {
        resetWorkflow();
      }
  };

  const handleBackFromUserCenter = () => {
    setAppMode(previousMode);
  };

  const handleUpdateMessages = (fn: (prev: Message[]) => Message[]) => {
      // If a conversation is selected, update its messages
      // Otherwise, update messages for current context (for new conversation)
      const key = currentConversationId || currentContextId;
      setMessagesMap(prev => ({
          ...prev,
          [key]: fn(prev[key] || [])
      }));
  };

  const handleNewChat = (targetContextId?: string) => {
    const contextId = targetContextId || currentContextId;
    setCurrentConversationId('');
    setMessagesMap(prev => ({ ...prev, [contextId]: [] }));

    // 重置工作流状态到初始阶段
    if (appMode === 'standard') {
      resetWorkflow();
    }
  };

  const handleSelectConversation = async (id: string) => {
    console.log('[handleSelectConversation] Starting, conversationId:', id, 'appMode:', appMode);

    // Don't block switching - allow viewing any conversation even if streaming
    // Set the selected conversation ID first
    setCurrentConversationId(id);

    // Use conversation ID as key for caching, not context ID
    const conversationKey = id;
    const currentLoadingState = conversationLoadingStates[conversationKey];

    // Check if this conversation has cached messages
    const hasCachedMessages = messagesMap[conversationKey]?.length > 0;
    console.log('[handleSelectConversation] hasCachedMessages:', hasCachedMessages, 'currentLoadingState:', currentLoadingState);

    // Only fetch messages if not currently streaming OR if we don't have cached messages
    if (currentLoadingState !== LoadingState.STREAMING || !hasCachedMessages) {
      console.log('[handleSelectConversation] Fetching messages from API');
      if (currentLoadingState !== LoadingState.STREAMING) {
        setConversationLoadingStates(prev => ({ ...prev, [conversationKey]: LoadingState.UPLOADING }));
      }

      try {
          const response = await conversationAPI.getMessages(id);
          console.log('[handleSelectConversation] API response:', response.data.length, 'messages');

          // Cache messages by conversation ID, not context ID
          setMessagesMap(prev => ({
              ...prev,
              [conversationKey]: response.data
          }));

          // 同步工作流状态
          if (appMode === 'standard' && response.data.length > 0) {
            console.log('[App] Syncing workflow state after loading conversation');
            processHistoricalMessages(response.data);
          } else {
            console.log('[App] Skipping workflow sync - appMode:', appMode, 'messageCount:', response.data.length);
          }
      } catch (e) {
          console.error("Failed to load conversation", e);
      } finally {
        if (currentLoadingState !== LoadingState.STREAMING) {
          setConversationLoadingStates(prev => ({ ...prev, [conversationKey]: LoadingState.IDLE }));
        }
      }
    } else {
      console.log('[handleSelectConversation] Using cached messages, hasCachedMessages:', hasCachedMessages);
      if (hasCachedMessages && appMode === 'standard') {
        // 即使有缓存的消息，也要同步工作流状态
        console.log('[App] Syncing workflow state for cached conversation');
        processHistoricalMessages(messagesMap[conversationKey]);
      } else {
        console.log('[App] Not syncing workflow - hasCachedMessages:', hasCachedMessages, 'appMode:', appMode);
      }
    }
  };

  const handleDeleteConversation = async (id: string) => {
      if (!window.confirm('确定要删除这个会话吗？')) return;

      try {
          // Use backend API instead of direct Dify call
          await conversationAPI.delete(id);
          if (id === currentConversationId) {
              handleNewChat();
          }
          loadConversations();
      } catch (e) {
          console.error("Delete failed", e);
      }
  };

  const handleStop = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
      }
      const key = currentConversationId || currentContextId;
      setConversationLoadingStates(prev => ({ ...prev, [key]: LoadingState.IDLE }));
      setCurrentNodeNames(prev => ({ ...prev, [key]: null }));
      handleUpdateMessages(msgs => msgs.filter(m => !m.isTyping));
  };

  const handleSend = async (text: string, files: File[]) => {
    const userId = user?.id || CURRENT_USER_ID;
    const key = currentConversationId || currentContextId;

    // Create background task for this conversation
    // 注意：只有在有 conversationId 时才传递，避免传递空字符串
    const taskConversationId = currentConversationId || undefined;
    const taskId = addTask('chat', text.substring(0, 30) + (text.length > 30 ? '...' : ''), taskConversationId, currentContextId);

    // 1. Add User Message (with file metadata for display)
    const userMsgId = Date.now().toString();
    const newUserMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: text,
      created_at: Date.now() / 1000,
      files: files.map(f => ({
        id: '', // Will be populated by backend
        name: f.name,
        size: f.size,
        extension: f.name.split('.').pop() || '',
        mime_type: f.type,
        created_by: 0,
        created_at: 0
      }))
    };

    handleUpdateMessages(prev => [...prev, newUserMsg]);

    // 2. Prepare Stream
    setConversationLoadingStates(prev => ({ ...prev, [key]: LoadingState.STREAMING }));
    setCurrentNodeNames(prev => ({ ...prev, [key]: '思考中' }));
    const assistantMsgId = (Date.now() + 1).toString();

    handleUpdateMessages(prev => [...prev, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      created_at: Date.now() / 1000,
      isTyping: true
    }]);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let targetConvId = currentConversationId;

    // Use backend API - files will be uploaded by backend
    await chatAPI.stream(
      {
        query: text,
        conversationId: targetConvId,
        contextId: currentContextId,
        files: files // Pass raw File objects directly
      },
      (chunk) => {
        handleUpdateMessages(prev => prev.map(msg =>
          msg.id === assistantMsgId
            ? { ...msg, content: msg.content + chunk }
            : msg
        ));
      },
      (newConversationId, generatedFiles) => {
        setConversationLoadingStates(prev => ({ ...prev, [key]: LoadingState.IDLE }));
        setCurrentNodeNames(prev => ({ ...prev, [key]: null }));

        handleUpdateMessages(prev => prev.map(msg =>
            msg.id === assistantMsgId ? { ...msg, isTyping: false, generated_files: generatedFiles } : msg
        ));

        // 确定最终的 conversationId
        const finalConversationId = newConversationId || targetConvId;

        // 如果是新创建的对话（之前没有 conversationId），现在设置为当前对话
        if (!targetConvId && finalConversationId) {
          setCurrentConversationId(finalConversationId);
        }

        // Complete background task with the correct conversationId
        if (finalConversationId) {
          completeTask(taskId, 'completed', { conversationId: finalConversationId });
        } else {
          // 如果仍然没有 conversationId（不应该发生），标记任务为失败
          completeTask(taskId, 'failed', undefined, '无法获取对话ID');
        }

        // 不自动切换到新对话，让用户自己选择查看
        // 只是在后台加载对话列表
        loadConversations();
      },
      (error) => {
        setConversationLoadingStates(prev => ({ ...prev, [key]: LoadingState.ERROR }));
        setCurrentNodeNames(prev => ({ ...prev, [key]: null }));

        handleUpdateMessages(prev => prev.map(msg =>
          msg.id === assistantMsgId
            ? { ...msg, isTyping: false, content: msg.content + `\n[Error: ${error}]` }
            : msg
        ));

        // Complete background task with error
        completeTask(taskId, 'failed', undefined, error);
      },
      (nodeName) => {
        setCurrentNodeNames(prev => ({ ...prev, [key]: nodeName }));
      }
    );

    abortControllerRef.current = null;
  };

  const handleLogin = (mockUser: User) => {
    setUser(mockUser);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setUser(null);
    setAppMode('home');
    localStorage.removeItem('procureai_token');
    localStorage.removeItem('procureai_auth_user');
  };

  // 处理供应商收藏后的工作流推进
  const handleSupplierFavorited = () => {
    if (workflowState.currentStage === 'deep_sourcing') {
      // 推进到供应商收藏阶段
      advanceToNextStage({ favorited: true });
    }
  };

  // 处理商品加入心愿单后的操作
  const handleProductBookmarked = () => {
    // 小美界面的商品心愿单不涉及工作流推进
    // 可以在这里添加其他操作，如刷新心愿单统计等
    console.log('Product added to wishlist');
  };

  // 处理供应商约谈后的工作流推进
  const handleSupplierInterviewScheduled = () => {
    if (workflowState.currentStage === 'supplier_favorite') {
      // 推进到供应商约谈阶段
      advanceToNextStage({ interviewed: true });
    }
  };

  // 添加通知
  const addNotification = useCallback((notification: Omit<ToastNotification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    setNotifications(prev => [...prev, { ...notification, id }]);
    return id;
  }, []);

  // 移除通知
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // 处理历史消息，同步工作流状态
  useEffect(() => {
    console.log('[App] Workflow sync useEffect triggered, appMode:', appMode, 'currentMessages.length:', currentMessages.length);

    // 只在标准模式下处理
    if (appMode !== 'standard') {
      console.log('[App] Skipping workflow sync: not in standard mode');
      return;
    }

    // 获取当前消息列表
    const messages = currentMessages;
    if (!messages || messages.length === 0) {
      console.log('[App] Skipping workflow sync: no messages');
      return;
    }

    // 处理历史消息以更新工作流状态
    console.log('[App] Processing historical messages for workflow sync...');
    processHistoricalMessages(messages);
  }, [appMode, currentConversationId, currentMessages.length, processHistoricalMessages]); // 保持依赖完整

  // --- Render Shared View ---
  if (sharedMessages) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center">
              <header className="w-full bg-white shadow-sm border-b border-slate-200 py-4 px-6 flex justify-between items-center sticky top-0 z-20">
                  <div className="flex items-center gap-2">
                      <ShareIcon className="w-5 h-5 text-blue-600" />
                      <h1 className="font-bold text-slate-800">对话分享</h1>
                  </div>
                  <a href="/" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      我也要用 AI采购助手
                  </a>
              </header>
              <div className="w-full max-w-4xl flex-1 flex flex-col bg-white shadow-lg min-h-0 my-4 rounded-xl overflow-hidden border border-slate-200">
                   <ChatArea
                      messages={sharedMessages}
                      isLoading={LoadingState.IDLE}
                      onSend={() => {}}
                      readOnly={true}
                      userId={user?.id}
                      emptyState={{
                          title: "无分享内容",
                          description: ""
                      }}
                   />
              </div>
          </div>
      );
  }

  // --- Normal Rendering ---

  // Admin Mode
  if (appMode === 'admin') {
      return (
        <ErrorBoundary>
          <AdminDashboard onLogout={handleLogout} onBackHome={() => setAppMode('home')} />
        </ErrorBoundary>
      );
  }

  // Supplier Favorites Mode
  if (appMode === 'suppliers') {
      return (
        <ErrorBoundary>
          <div className="h-screen flex bg-white">
            {/* Sidebar */}
            <Sidebar
              title="供应商收藏夹"
              conversations={[]}
              activeId={null}
              onSelect={() => {}}
              onNew={() => {}}
              onDelete={() => {}}
              onGoHome={() => setAppMode('home')}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              user={user}
              onOpenUserCenter={() => setAppMode('user-center')}
              onLoginRequest={() => setShowLoginModal(true)}
              onAdminClick={() => setAppMode('admin')}
              onSupplierFavorites={() => handleContextSwitch('suppliers')}
              onProductWishlist={() => handleContextSwitch('wishlist')}
              isAdmin={user?.role === 'ADMIN'}
            />
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <SupplierFavorites
                userId={user?.id || CURRENT_USER_ID}
                onBackToChat={(conversationId) => {
                  // 确定目标模式和标签页
                  let targetMode: AppMode = previousMode;
                  let targetTab = standardTab;

                  if (previousMode === 'home') {
                    // 如果之前的模式是 home，默认使用 casual 模式
                    targetMode = 'casual';
                  } else if (previousMode === 'standard') {
                    // 恢复之前的标签页
                    targetTab = previousStandardTab;
                  }

                  // 计算目标 contextId
                  const targetContextId = targetMode === 'standard' ? `standard_${targetTab}` : 'casual_main';

                  // 设置模式和标签页
                  setStandardTab(targetTab);
                  setAppMode(targetMode);

                  // 等待模式切换后再处理会话，使用正确的 contextId
                  setTimeout(() => {
                    if (conversationId) {
                      handleSelectConversation(conversationId);
                    } else {
                      handleNewChat(targetContextId);
                    }
                  }, 0);
                }}
                lastConversationId={currentConversationId}
              />
            </main>
          </div>
        </ErrorBoundary>
      );
  }

  // Product Wishlist Mode
  if (appMode === 'wishlist') {
      return (
        <ErrorBoundary>
          <div className="h-screen flex bg-white">
            {/* Sidebar */}
            <Sidebar
              title="商品心愿单"
              conversations={[]}
              activeId={null}
              onSelect={() => {}}
              onNew={() => {}}
              onDelete={() => {}}
              onGoHome={() => setAppMode('home')}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              user={user}
              onOpenUserCenter={() => setAppMode('user-center')}
              onLoginRequest={() => setShowLoginModal(true)}
              onAdminClick={() => setAppMode('admin')}
              onProductWishlist={() => handleContextSwitch('wishlist')}
              isAdmin={user?.role === 'ADMIN'}
            />
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <ProductWishlist
                userId={user?.id || CURRENT_USER_ID}
                onBackToChat={(conversationId) => {
                  // 商品心愿单应该返回到 casual 模式 (小美)
                  let targetMode: AppMode = 'casual';
                  let targetTab = 'keyword';

                  if (previousMode === 'standard') {
                    // 如果从 standard 模式进入，恢复之前的标签页
                    targetMode = previousMode;
                    targetTab = previousStandardTab;
                  } else if (previousMode === 'casual' || previousMode === 'home') {
                    // 默认返回到 casual 模式
                    targetMode = 'casual';
                  }

                  // 计算目标 contextId
                  const targetContextId = targetMode === 'standard' ? `standard_${targetTab}` : 'casual_main';

                  // 设置模式和标签页
                  setStandardTab(targetTab);
                  setAppMode(targetMode);

                  // 等待模式切换后再处理会话，使用正确的 contextId
                  setTimeout(() => {
                    if (conversationId) {
                      handleSelectConversation(conversationId);
                    } else {
                      handleNewChat(targetContextId);
                    }
                  }, 0);
                }}
                lastConversationId={currentConversationId}
              />
            </main>
          </div>
        </ErrorBoundary>
      );
  }

  // Home Mode
  if (appMode === 'home') {
    return (
      <>
        <HomeView
          onSelectMode={(mode) => handleContextSwitch(mode)}
          onLoginRequest={() => setShowLoginModal(true)}
          onGoToUserCenter={() => setAppMode('user-center')}
          user={user}
        />
        {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLogin={handleLogin} />}
      </>
    );
  }

  // User Center Mode
  if (appMode === 'user-center' && user) {
    return (
      <UserCenter
        user={user}
        onBack={handleBackFromUserCenter}
        onLogout={handleLogout}
      />
    );
  }

  const sidebarTitle = appMode === 'standard' ? '企业寻源数字监理' : '私家买手助理';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        title={sidebarTitle}
        conversations={conversations}
        activeId={currentConversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onDelete={handleDeleteConversation}
        onGoHome={() => setAppMode('home')}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onOpenUserCenter={() => setAppMode('user-center')}
        onLoginRequest={() => setShowLoginModal(true)}
        onAdminClick={() => handleContextSwitch('admin')}
        onSupplierFavorites={appMode === 'standard' ? () => handleContextSwitch('suppliers') : undefined}
        onProductWishlist={appMode === 'casual' ? () => handleContextSwitch('wishlist') : undefined}
        isAdmin={user?.role === 'ADMIN'}
      />

      <div className="relative flex-1 flex flex-col min-w-0 bg-white h-full overflow-hidden">
        {appMode === 'standard' ? (
             <StandardView
                onMobileMenuClick={() => setSidebarOpen(true)}
                workflowState={workflowState}
                onStageClick={jumpToStage}
                onPreviousStage={goToPreviousStage}
            >
                <ChatArea
                    messages={currentMessages}
                    isLoading={getCurrentConversationLoadingState()}
                    currentNodeName={currentNodeNames[currentConversationId || currentContextId]}
                    onSend={handleSend}
                    onCancel={handleStop}
                    placeholder={currentUiConfig.placeholder}
                    emptyState={{
                        title: currentUiConfig.emptyTitle,
                        description: currentUiConfig.emptyDesc
                    }}
                    conversationId={currentConversationId}
                    workflowState={workflowState}
                    onStageTransition={checkForStageTransition}
                    updateStageData={updateStageData}
                    onSupplierFavorited={handleSupplierFavorited}
                    onProductBookmarked={handleProductBookmarked}
                    userId={user?.id}
                    mode={appMode}
                    onNavigateToStage={jumpToStage}
                />
            </StandardView>
        ) : (
            <>
                <header className="h-14 px-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10 md:hidden">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-slate-500">
                            <MenuIcon />
                        </button>
                        <span className="font-bold text-slate-700">{sidebarTitle}</span>
                    </div>
                    <button
                      onClick={() => setAppMode('home')}
                      className="p-2 -mr-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                      title="返回首页"
                    >
                      <HomeIcon />
                    </button>
                </header>

                <main className="flex-1 relative flex flex-col min-h-0 overflow-hidden w-full">
                    <ChatArea
                        messages={currentMessages}
                        isLoading={getCurrentConversationLoadingState()}
                        currentNodeName={currentNodeNames[currentConversationId || currentContextId]}
                        onSend={handleSend}
                        onCancel={handleStop}
                        placeholder={currentUiConfig.placeholder}
                        emptyState={{
                            title: currentUiConfig.emptyTitle,
                            description: currentUiConfig.emptyDesc
                        }}
                        conversationId={currentConversationId}
                        workflowState={workflowState}
                        onStageTransition={checkForStageTransition}
                        updateStageData={updateStageData}
                        onSupplierFavorited={handleSupplierFavorited}
                        onProductBookmarked={handleProductBookmarked}
                        userId={user?.id}
                        mode={appMode}
                        onNavigateToStage={jumpToStage}
                    />
                </main>
            </>
        )}
      </div>
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLogin={handleLogin} />}

      {/* 通知组件 */}
      <ToastNotifications
        notifications={notifications}
        onClose={removeNotification}
      />

      {/* 后台任务指示器 */}
      {showBackgroundTasks && (
        <BackgroundTasksIndicator
          tasks={backgroundTasks}
          onDismiss={() => {
            // 只隐藏前端弹窗，不停止后台任务
            setShowBackgroundTasks(false);
          }}
          onTaskClick={async (task) => {
            console.log('[onTaskClick] ===== START =====');
            console.log('[onTaskClick] Task:', task);
            console.log('[onTaskClick] Task.conversationId:', task.conversationId);

            if (task.status === 'completed') {
              if (!task.conversationId) {
                console.log('[onTaskClick] ERROR: Task has no conversationId!');
                setShowBackgroundTasks(false);
                alert('该任务没有关联的对话，无法查看');
                return;
              }

              console.log('[onTaskClick] Task clicked:', task.id, 'conversationId:', task.conversationId, 'contextId:', task.contextId);
              console.log('[onTaskClick] Current state - appMode:', appMode, 'standardTab:', standardTab, 'currentConversationId:', currentConversationId);

              // 如果点击的任务就是当前对话，不需要重新加载
              if (task.conversationId === currentConversationId) {
                console.log('[onTaskClick] Already viewing this conversation, skipping reload');
                setShowBackgroundTasks(false);
                return;
              }

              // 先隐藏弹窗，避免重复点击
              setShowBackgroundTasks(false);

              // 根据 contextId 检查是否需要切换到正确的模式
              if (task.contextId) {
                let needsModeSwitch = false;

                if (task.contextId === 'casual_main') {
                  // 只有当前不在 casual 模式时才切换
                  needsModeSwitch = appMode !== 'casual';
                  if (needsModeSwitch) {
                    console.log('[onTaskClick] Switching to casual mode');
                    // 直接设置模式，不通过 handleContextSwitch，避免清空 conversationId
                    setAppMode('casual');
                  }
                } else if (task.contextId.startsWith('standard_')) {
                  const tab = task.contextId.replace('standard_', '');
                  // 只有当前不在 standard 模式或 tab 不同时才切换
                  needsModeSwitch = appMode !== 'standard' || standardTab !== tab;
                  if (needsModeSwitch) {
                    console.log('[onTaskClick] Switching to standard mode, tab:', tab);
                    setStandardTab(tab);
                    // 直接设置模式，不通过 handleContextSwitch，避免重置工作流
                    setAppMode('standard');
                  }
                }

                // 如果切换了模式，等待一个事件循环确保状态已更新
                if (needsModeSwitch) {
                  console.log('[onTaskClick] Waiting for mode switch...');
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }

              console.log('[onTaskClick] Loading conversation:', task.conversationId);
              // 使用 handleSelectConversation 来正确加载对话和同步工作流状态
              // 注意：不要在这里预先设置 currentConversationId，让 handleSelectConversation 来处理
              await handleSelectConversation(task.conversationId);

              console.log('[onTaskClick] Conversation loaded');
              console.log('[onTaskClick] Final state - currentConversationId:', currentConversationId);
              console.log('[onTaskClick] Messages in map:', messagesMap[task.conversationId]?.length || 0);
              console.log('[onTaskClick] ===== END =====');
            } else {
              console.log('[onTaskClick] Task not completed, status:', task.status);
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
