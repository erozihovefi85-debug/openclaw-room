
import React, { useRef, useEffect, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import LZString from 'lz-string';
import { Message, LoadingState, AppMode } from '../types';
import { WorkflowState } from '../types/workflow';
import {
    SendIcon, PaperclipIcon, FileIcon, UserIcon, RobotIcon, StopIcon, CopyIcon,
    CheckIcon, ArrowUpIcon, CloseIcon, DownloadIcon, LoaderIcon, ShareIcon,
    CheckCircleIcon, CircleIcon, LinkIcon, ShareSquareIcon
} from './Icons';
import { API_BASE_URL } from '../config';
import { renderSupplierBookmarks, containsSupplierInfo } from '../utils/supplierParser';
import { renderProductBookmarks, containsProductInfo } from '../utils/productParser';
import Avatar from './Avatar';

interface ChatAreaProps {
  messages: Message[];
  isLoading: LoadingState;
  onSend: (text: string, files: File[]) => void;
  onCancel?: () => void;
  placeholder?: string;
  emptyState?: {
      title: string;
      description: string;
  };
  readOnly?: boolean;
  currentNodeName?: string | null;
  conversationId?: string; // 添加 conversationId 用于供应商收藏
  workflowState?: WorkflowState; // 工作流状态
  onStageTransition?: (aiResponse: string) => boolean; // 检查阶段转换
  updateStageData?: (data: any) => void; // 更新阶段数据
  onSupplierFavorited?: () => void; // 供应商收藏后的回调
  onProductBookmarked?: () => void; // 商品心愿单后的回调
  userId?: string; // 用户ID，用于商品心愿单
  mode?: AppMode; // 使用 AppMode 类型
}

const fixUrl = (url: string) => {
    if (!url) return '';
    const toolsPathIndex = url.indexOf('/files/tools/');
    if (toolsPathIndex !== -1) {
        return `${API_BASE_URL}${url.substring(toolsPathIndex)}`;
    }
    if (url.startsWith('http')) return url;
    if (url.startsWith('files/tools/')) return `${API_BASE_URL}/${url}`;
    return url;
}

const cleanDSML = (text: string) => {
    if (!text) return "";
    let cleaned = text;
    // Remove DSML block and tags
    const blockRegex = /<\s*\|\s*DSML\s*\|\s*function_calls\s*>[\s\S]*?(?:<\/\s*\|\s*DSML\s*\|\s*function_calls\s*>|$)/gi;
    cleaned = cleaned.replace(blockRegex, '');
    const tagRegex = /<\/?\s*\|\s*DSML\s*\|[^>]*>/gi;
    cleaned = cleaned.replace(tagRegex, '');
    return cleaned; 
};

const MermaidDiagram: React.FC<{ code: string }> = ({ code }) => {
    const [svg, setSvg] = useState('');
    const [error, setError] = useState(false);
    const id = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`).current;

    useEffect(() => {
        try {
            mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
        } catch (e) {}
        const renderDiagram = async () => {
            if (!code || !code.trim()) return;
            try {
                const cleanCode = code.replace(/^(```mermaid\s*)/i, '').replace(/^(```\s*)/, '').replace(/(```\s*)$/, '').trim();
                const { svg } = await mermaid.render(id, cleanCode);
                setSvg(svg);
                setError(false);
            } catch (e) {
                setError(true);
            }
        };
        renderDiagram();
    }, [code, id]);

    if (error) return <div className="my-2 p-3 bg-red-50 border border-red-100 rounded text-xs font-mono text-red-600">流程图渲染失败</div>;
    return <div className="my-4 flex justify-center overflow-x-auto bg-white p-4 rounded-lg border border-slate-100 min-h-[100px]" dangerouslySetInnerHTML={{ __html: svg }} />;
};

const FileCard: React.FC<{ name: string; url?: string; size?: number; type?: string; onClickDownload?: () => void }> = ({ name, url, size, type, onClickDownload }) => (
    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl max-w-sm mt-2 hover:bg-slate-100 transition-colors">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-100 shadow-sm text-blue-600">
            <FileIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate" title={name}>{name}</p>
            {size ? <p className="text-xs text-slate-400">{(size / 1024).toFixed(1)} KB</p> : <p className="text-xs text-slate-400">{type || 'File'}</p>}
        </div>
        {onClickDownload && (
            <button onClick={onClickDownload} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white transition-all"><DownloadIcon className="w-5 h-5" /></button>
        )}
    </div>
);

const ChatArea: React.FC<ChatAreaProps> = ({
    messages, isLoading, onSend, onCancel, placeholder, emptyState, readOnly, currentNodeName, conversationId,
    workflowState, onStageTransition, updateStageData, onSupplierFavorited, onProductBookmarked, userId, mode
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copyLinkStatus, setCopyLinkStatus] = useState<'idle' | 'copied'>('idle');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [stageTransitionNotification, setStageTransitionNotification] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (instant = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        setShowScrollTop(scrollTop > 300);
        setIsAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
    }
  };

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length]);

  useEffect(() => {
     if (isAutoScroll && isLoading === LoadingState.STREAMING) scrollToBottom(true);
  }, [messages[messages.length - 1]?.content, isAutoScroll, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // 提取最后一条 AI 消息，用于监听内容变化
  const lastAiMessage = useMemo(() => {
    return [...messages].reverse().find(m => m.role === 'assistant');
  }, [messages]);

  // Monitor AI responses for workflow stage transitions
  useEffect(() => {
    if (!onStageTransition || !workflowState) return;

    // 必须有最后一条 AI 消息
    if (!lastAiMessage) return;

    // Only check for transition when AI is done typing (not streaming)
    if (lastAiMessage.isTyping || isLoading === LoadingState.STREAMING) return;

    console.log('[ChatArea] ===== Checking for stage transition =====');
    console.log('[ChatArea] Current workflowState.currentStage:', workflowState.currentStage);
    console.log('[ChatArea] AI content preview:', lastAiMessage.content.substring(0, 100));
    console.log('[ChatArea] Full AI content length:', lastAiMessage.content.length);

    // Check if the AI response triggers a stage transition
    const transitioned = onStageTransition(lastAiMessage.content);

    console.log('[ChatArea] ===== Transition result:', transitioned, '=====');

    if (transitioned) {
      // Import STAGE_CONFIG dynamically to avoid circular dependency
      import('../types/workflow').then(({ STAGE_CONFIG, WorkflowStage }) => {
        // Use the trigger keywords to determine which stage we're in now
        // The checkForStageTransition has already updated the state in the hook
        // We need to get the LATEST state from the hook, not from our closure
        // Since we can't access the setter, we'll use the message content to determine the new stage
        const content = lastAiMessage.content;

        let detectedStage = workflowState.currentStage; // fallback to current

        // Check which trigger keyword appeared in the message
        // 注意：这里需要检测所有可能的触发词
        if (content.includes('汇报！为您找到以下优质供应商') ||
            content.includes('企业采购寻源报告') ||
            content.includes('已进入**供应商收藏**')) {
          detectedStage = WorkflowStage.SUPPLIER_FAVORITE;
        } else if (content.includes('已进入**深度寻源**') || 
                   content.includes('开始深度寻源') ||
                   content.includes('是否开始深度寻源')) {
          detectedStage = WorkflowStage.DEEP_SOURCING;
        } else if (content.includes('已进入**需求清单**') || 
                   content.includes('生成结构化需求清单') ||
                   content.includes('报告！以下是为您生成的采购需求清单') ||
                   content.includes('采购需求清单')) {
          detectedStage = WorkflowStage.REQUIREMENT_LIST;
        } else if (content.includes('已进入**初步寻源**') ||
                   content.includes('开始初步寻源') ||
                   content.includes('调研分析结果') ||
                   content.includes('基于以上分析')) {
          detectedStage = WorkflowStage.PRELIMINARY_SOURCING;
        } else if (content.includes('已进入**供应商约谈**')) {
          detectedStage = WorkflowStage.SUPPLIER_INTERVIEW;
        }

        const newStageTitle = STAGE_CONFIG[detectedStage].title;
        console.log('[ChatArea] Stage transition detected!');
        console.log('[ChatArea] New stage title:', newStageTitle);
        console.log('[ChatArea] Detected stage enum:', detectedStage);
        setStageTransitionNotification(newStageTitle);

        // Auto-hide notification after 3 seconds
        setTimeout(() => {
          setStageTransitionNotification(null);
        }, 3000);
      });
    }
  }, [lastAiMessage?.content, lastAiMessage?.isTyping, isLoading, onStageTransition, workflowState]);

  const toggleSelectionMode = () => {
      setIsSelectionMode(!isSelectionMode);
      setSelectedMessageIds(new Set());
      setGeneratedLink('');
  };

  const toggleMessageSelection = (id: string) => {
      const newSet = new Set(selectedMessageIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedMessageIds(newSet);
  };

  const handleGenerateLink = () => {
      if (selectedMessageIds.size === 0) return;
      const selectedMsgs = messages.filter(m => selectedMessageIds.has(m.id));
      const payload = selectedMsgs.map(m => ({
          r: m.role,
          c: cleanDSML(m.content),
          f: m.files ? m.files.map(f => ({ n: f.name, s: f.size })) : [],
          g: (m as any).generated_files
      }));
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
      setGeneratedLink(`${window.location.origin}/?share_data=${compressed}`);
      setShowShareModal(true);
  };

  const copyShareLink = async () => {
      await navigator.clipboard.writeText(generatedLink);
      setCopyLinkStatus('copied');
      setTimeout(() => setCopyLinkStatus('idle'), 2000);
  };

  const handleSend = () => {
    const canSend = isLoading === LoadingState.IDLE || isLoading === LoadingState.ERROR;
    if ((!inputText.trim() && selectedFiles.length === 0) || !canSend) return;
    onSend(inputText, selectedFiles);
    setInputText('');
    setSelectedFiles([]);
    setIsAutoScroll(true);
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Stage Transition Notification */}
      {stageTransitionNotification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-fadeIn">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="font-medium">已进入 <span className="font-bold">{stageTransitionNotification}</span> 阶段</span>
        </div>
      )}

      {!readOnly && messages.length > 0 && !isSelectionMode && (
          <button onClick={toggleSelectionMode} className="absolute top-4 right-6 z-10 p-2 bg-white/80 backdrop-blur text-slate-500 hover:text-blue-600 rounded-full border border-slate-200 shadow-sm transition-all"><ShareSquareIcon className="w-5 h-5" /></button>
      )}

      <div ref={scrollContainerRef} onScroll={handleScroll} className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-6 min-h-0 ${isSelectionMode ? 'pb-24' : ''}`}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 text-center px-6">
            <RobotIcon className="w-16 h-16 mb-4 text-slate-200" />
            <p className="text-lg font-medium mb-1">{emptyState?.title}</p>
            <p className="text-sm">{emptyState?.description}</p>
          </div>
        )}
        
        {messages.map((msg) => {
          const displayContent = cleanDSML(msg.content);
          const showBubble = displayContent.trim() !== "" || !!msg.isTyping;
          const isSelected = selectedMessageIds.has(msg.id);

          return (
            <div key={msg.id} className={`flex items-start gap-3 max-w-4xl mx-auto group relative transition-all duration-300 ${isSelectionMode ? 'cursor-pointer' : ''} ${msg.role === 'user' ? 'flex-row-reverse' : ''}`} onClick={() => isSelectionMode && toggleMessageSelection(msg.id)}>
              {isSelectionMode && (
                  <div className="flex items-center self-center shrink-0">
                      {isSelected ? <div className="text-blue-600"><CheckCircleIcon className="w-6 h-6 fill-blue-50" /></div> : <div className="text-slate-300 hover:text-slate-400"><CircleIcon className="w-6 h-6" /></div>}
                  </div>
              )}

              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-transparent'}`}>
                {msg.role === 'user' ? (
                  <UserIcon className="w-5 h-5" />
                ) : mode === 'standard' ? (
                  <Avatar type="xiaoshuai" size="md" />
                ) : mode === 'casual' ? (
                  <Avatar type="xiaomei" size="md" />
                ) : (
                  <RobotIcon className="w-5 h-5" />
                )}
              </div>

              <div className={`flex flex-col max-w-[85%] md:max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.files && msg.files.length > 0 && (
                   <div className={`flex flex-wrap gap-2 justify-end ${showBubble ? 'mb-2' : ''}`}>
                      {msg.files.map((f, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded p-2 text-xs text-slate-700"><FileIcon className="w-3 h-3" /><span className="max-w-[100px] truncate">{f.name}</span></div>
                      ))}
                   </div>
                )}

                {showBubble && (
                  <div className={`relative px-4 py-3 rounded-2xl shadow-sm leading-relaxed pb-8 min-w-[40px] min-h-[44px] w-full ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm'}`}>
                    <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'prose-slate'}`}>
                      <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                              a: ({node, ...props}) => <a target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" {...props} />,
                              table: ({node, ...props}) => <table className="min-w-full divide-y divide-slate-200" {...props} />,
                              thead: ({node, ...props}) => <thead className="bg-slate-50" {...props} />,
                              th: ({node, ...props}) => <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider" {...props} />,
                              td: ({node, ...props}) => <td className="px-4 py-2 text-sm text-slate-600" {...props} />,
                              code: ({node, ...props}) => {
                                  const { className, children } = props;
                                  if (className?.includes('language-mermaid')) return <MermaidDiagram code={String(children).replace(/\n$/, '')} />;
                                  return <code className={`${className} px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs`}{...props}>{children}</code>
                              }
                          }}
                      >
                          {displayContent}
                      </ReactMarkdown>
                    </div>
                    
                    {msg.isTyping && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-medium animate-pulse">
                            <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                            {currentNodeName || '思考中'}
                        </div>
                    )}

                    {!msg.isTyping && displayContent && !isSelectionMode && (
                       <button onClick={(e) => { e.stopPropagation(); handleCopy(displayContent, msg.id); }} className={`absolute bottom-2 right-2 p-1.5 rounded-lg transition-all duration-200 z-10 ${msg.role === 'user' ? 'text-blue-200 hover:bg-blue-500 hover:text-white' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'} ${copiedId === msg.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                         {copiedId === msg.id ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                       </button>
                    )}
                  </div>
                )}
                
                {msg.role === 'assistant' && msg.generated_files && msg.generated_files.length > 0 && (
                    <div className="mt-2 space-y-2 w-full">
                        {msg.generated_files.map((file, idx) => (
                            <FileCard key={idx} name={file.filename} type={file.extension} size={file.size} onClickDownload={() => window.open(fixUrl(file.url), '_blank')} />
                        ))}
                    </div>
                )}

                {/* 供应商收藏按钮 - 只在 AI 消息中显示 */}
                {msg.role === 'assistant' && !msg.isTyping && containsSupplierInfo(msg.content) && (
                    <div className="mt-3 w-full">
                        {renderSupplierBookmarks(
                            msg.content,
                            userId,
                            conversationId,
                            onSupplierFavorited
                        )}
                    </div>
                )}

                {/* 商品心愿单按钮 - 只在小美（casual）模式的 AI 消息中显示 */}
                {mode === 'casual' && msg.role === 'assistant' && !msg.isTyping && userId && (() => {
                  const hasInfo = containsProductInfo(msg.content);
                  console.log('[ChatArea Product Button]', {
                    messageId: msg.id,
                    mode,
                    hasProductInfo: hasInfo
                  });
                  return hasInfo;
                })() && (
                    <div className="mt-3 w-full">
                        {renderProductBookmarks(
                            msg.content,
                            userId,
                            conversationId,
                            onProductBookmarked
                        )}
                    </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />

        {/* 需求清单组件 - 已禁用，需求清单作为普通 Markdown 内容显示 */}
        {/* requirementListData && workflowState?.currentStage === WorkflowStage.REQUIREMENT_LIST && (
          <div className="max-w-4xl mx-auto mt-6 mb-4">
            <RequirementList
              items={requirementListData.items}
              summary={requirementListData.summary}
              onConfirmAndProceed={onConfirmRequirementList}
              onExport={(format) => {
                // TODO: 实现导出功能
                console.log('Export requirement list as:', format);
              }}
            />
          </div>
        ) */}
      </div>
      
      <button onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} className={`absolute bottom-24 right-6 p-3 bg-white border border-slate-200 shadow-xl rounded-full text-slate-500 hover:text-blue-600 transition-all z-50 transform ${showScrollTop ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}><ArrowUpIcon className="w-5 h-5" /></button>

      {isSelectionMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 animate-fadeIn">
              <span className="text-sm font-medium text-slate-600">已选择 {selectedMessageIds.size} 条</span>
              <div className="h-4 w-px bg-slate-200"></div>
              <button onClick={handleGenerateLink} disabled={selectedMessageIds.size === 0} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 disabled:opacity-50 font-medium text-sm transition-colors"><LinkIcon className="w-4 h-4" />生成链接</button>
              <button onClick={toggleSelectionMode} className="text-slate-500 hover:text-slate-800 text-sm transition-colors">取消</button>
          </div>
      )}

      {!readOnly && !isSelectionMode && (
          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <div className="max-w-4xl mx-auto">
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-sm"><span className="max-w-[150px] truncate">{file.name}</span><button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-500"><CloseIcon className="w-4 h-4" /></button></div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2 items-end bg-slate-50 border border-slate-200 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)])} />
                <button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors shrink-0"><PaperclipIcon /></button>
                <textarea ref={textareaRef} value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder={placeholder || "请输入..."} rows={1} className="flex-1 bg-transparent border-none outline-none resize-none py-3 text-slate-700 placeholder:text-slate-400 max-h-32 min-h-[44px]" />
                {isLoading === LoadingState.STREAMING || isLoading === LoadingState.UPLOADING ? (
                     <button onClick={onCancel} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors shrink-0"><StopIcon /></button>
                ) : (
                    <button onClick={handleSend} disabled={!inputText.trim() && selectedFiles.length === 0} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0 shadow-sm"><SendIcon /></button>
                )}
              </div>
            </div>
          </div>
      )}

      {showShareModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-6 animate-fadeIn">
                  <div className="flex justify-between items-center"><h3 className="text-lg font-bold text-slate-800">分享对话内容</h3><button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600"><CloseIcon className="w-5 h-5" /></button></div>
                  <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-slate-700">分享链接</label>
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                              <div className="flex-1 truncate text-sm text-slate-600 select-all">{generatedLink}</div>
                              <button onClick={copyShareLink} className={`p-2 rounded-md transition-colors shrink-0 ${copyLinkStatus === 'copied' ? 'bg-green-100 text-green-600' : 'bg-white border border-slate-200 hover:text-blue-600'}`}>{copyLinkStatus === 'copied' ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}</button>
                          </div>
                      </div>
                      <button onClick={copyShareLink} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium transition-colors"><LinkIcon className="w-4 h-4" />复制链接</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ChatArea;
