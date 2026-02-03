import React, { useRef, useEffect, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import LZString from 'lz-string';
import { Message, LoadingState, AppMode } from '../types';
import { WorkflowState, WorkflowStage } from '../types/workflow';
import {
    SendIcon, PaperclipIcon, FileIcon, UserIcon, RobotIcon, StopIcon, CopyIcon,
    CheckIcon, ArrowUpIcon, CloseIcon, DownloadIcon, LoaderIcon, ShareIcon,
    CheckCircleIcon, CircleIcon, LinkIcon, ShareSquareIcon, UploadIcon
} from './Icons';
import { API_BASE_URL as DIFY_API_BASE_URL } from '../config';
const BACKEND_API_URL = (import.meta.env as any).VITE_API_URL || 'http://localhost:3001/api';
import { renderSupplierBookmarks, containsSupplierInfo } from '../utils/supplierParser';
import { renderProductBookmarks, containsProductInfo } from '../utils/productParser';
import { extractRequirementListWithCategory, generateRequirementListExcelWithTemplate, extractRequirementListWithSelectedCategory, parseUploadedRequirementExcel } from '../services/siliconflowAPI';
import Avatar from './Avatar';
import UserAvatar from './UserAvatar';
import WorkflowNavigation from './WorkflowNavigation';
import FeedbackButtons from './FeedbackButtons';

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
  user?: User | null; // 当前用户信息
  mode?: AppMode; // 使用 AppMode 类型
  onNavigateToStage?: (stage: WorkflowStage) => void; // 手动切换阶段
}

const fixUrl = (url: string) => {
    if (!url) return '';
    const toolsPathIndex = url.indexOf('/files/tools/');
    if (toolsPathIndex !== -1) {
        return `${DIFY_API_BASE_URL}${url.substring(toolsPathIndex)}`;
    }
    if (url.startsWith('http')) return url;
    if (url.startsWith('files/tools/')) return `${DIFY_API_BASE_URL}/${url}`;
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
                const cleanCode = code.replace(/^```mermaid\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
                const { svg } = await mermaid.render(id, cleanCode);
                setSvg(svg);
                setError(false);
            } catch (e) {
                setError(true);
            }
        };
        renderDiagram();
    }, [code, id]);

    if (error) return <div className="p-3 bg-red-50 border border-red-100 rounded text-xs font-mono text-red-600">流程图渲染失败</div>;
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

// 新增：简化的AI回复容器
const SimpleAIResponse: React.FC<{ content: string; mode?: AppMode; }> = ({ content, mode }) => {
    return (
        <div className="w-full bg-transparent">
            <div className={`prose prose-sm max-w-none prose-slate ${mode === 'casual' ? 'prose-pink' : 'prose-emerald'}`}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        a: ({node, ...props}) => <a target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" {...props} />,
                        table: ({node, ...props}) => (
                            <div className="overflow-x-auto my-4">
                                <table className="w-full border-collapse border border-slate-200 text-sm rounded-lg overflow-hidden shadow-sm" {...props}>
                                    <style>{`
                                        table td, table th {
                                            border: 1px solid #e2e8f0;
                                            padding: 12px 16px;
                                            text-align: left;
                                        }
                                        table thead {
                                            background: #f8fafc;
                                        }
                                        table th {
                                            font-weight: 600;
                                            color: #475569;
                                            text-transform: uppercase;
                                            font-size: 11px;
                                            letter-spacing: 0.05em;
                                        }
                                        table tbody tr:nth-child(even) {
                                            background: #f8fafc;
                                        }
                                        table tbody tr:hover {
                                            background: #f1f5f9;
                                        }
                                    `}</style>
                                </table>
                            </div>
                        ),
                        thead: ({node, ...props}) => <thead className="bg-slate-50 border-b border-slate-200" {...props} />,
                        tbody: ({node, ...props}) => <tbody className="divide-y divide-slate-200" {...props} />,
                        tr: ({node, ...props}) => <tr className="hover:bg-slate-50 transition-colors" {...props} />,
                        th: ({node, ...props}) => <th className="px-4 py-3 text-left font-semibold text-slate-700 text-xs border-r border-slate-200 last:border-r-0" {...props} />,
                        td: ({node, ...props}) => <td className="px-4 py-3 text-slate-600 text-xs border-r border-slate-200 last:border-r-0 align-top" {...props} />,
                        code: ({node, ...props}) => {
                            const { className, children } = props;
                            if (className?.includes('language-mermaid')) return <MermaidDiagram code={String(children).replace(/\n$/, '')} />;
                            return <code className={`${className} px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs`}{...props}>{children}</code>
                        }
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
};

const ChatArea: React.FC<ChatAreaProps> = ({
    messages, isLoading, onSend, onCancel, placeholder, emptyState, readOnly, currentNodeName, conversationId,
    workflowState, onStageTransition, updateStageData, onSupplierFavorited, onProductBookmarked, userId, user, mode, onNavigateToStage
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
  const [isExtractingRequirements, setIsExtractingRequirements] = useState(false);
  const [isParsingExcel, setIsParsingExcel] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelUploadInputRef = useRef<HTMLInputElement>(null);
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

  // 继续文件的其余代码...
  const handleSend = async () => {
    if (!inputText.trim() && selectedFiles.length === 0) return;

    try {
      onSend(inputText.trim(), selectedFiles);
      setInputText('');
      setSelectedFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('[ChatArea] Send failed:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 200) + 'px';
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileRemove = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCopy = async (content: string, msgId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(msgId);
      showNotification('已复制到剪贴板', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('[ChatArea] Copy failed:', err);
      showNotification('复制失败', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white z-50 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  return (
    <>
      <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 via-white to-slate-50 relative">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
          backgroundImage: `linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}></div>

        {/* Stage Transition Notification */}
        {stageTransitionNotification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-fadeIn">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="font-medium">已进入 <span className="font-bold">{stageTransitionNotification}</span> 阶段</span>
          </div>
        )}

        {!readOnly && messages.length > 0 && !isSelectionMode && (
          <button onClick={toggleSelectionMode} className="absolute top-4 right-6 z-10 p-2 bg-white/80 backdrop-blur text-slate-500 hover:text-blue-600 rounded-full border border-slate-200 shadow-sm transition-all">
            <ShareSquareIcon className="w-5 h-5" />
          </button>
        )}

        <div ref={scrollContainerRef} onScroll={handleScroll} className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-6 min-h-0 ${isSelectionMode ? 'pb-24' : ''}`}>
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-80 text-center px-6">
              <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center shadow-inner ring-1 ring-slate-100">
                <RobotIcon className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-xl font-semibold mb-2 text-slate-600">{emptyState?.title}</p>
              <p className="text-sm leading-relaxed max-w-md mx-auto">{emptyState?.description}</p>
            </div>
          )}

          {messages.map((msg) => {
            const displayContent = cleanDSML(msg.content);
            const showBubble = displayContent.trim() !== "" || !!msg.isTyping;
            const isSelected = selectedMessageIds.has(msg.id);

            return (
              <div key={msg.id} className={`flex items-start gap-3 group relative transition-all duration-300 animate-fadeIn ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* 选择模式下的复选框 */}
                {isSelectionMode && (
                  <div className="flex items-center self-center shrink-0">
                    {isSelected ? <div className="text-blue-600"><CheckCircleIcon className="w-6 h-6" /></div> : <div className="text-slate-300 hover:text-slate-400"><CircleIcon className="w-6 h-6" /></div>}
                  </div>
                )}

                {/* 头像 - 用户消息和普通AI消息显示 */}
                {msg.role === 'user' ? (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-all duration-300">
                    <UserAvatar avatarType={user?.avatar || 'blue'} size="md" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-all duration-300 bg-gradient-to-br from-emerald-400 to-emerald-500">
                    <RobotIcon className="w-6 h-6 text-white" />
                  </div>
                )}

                {/* 消息内容 */}
                {msg.role === 'user' ? (
                  <div className="relative px-5 py-3 rounded-2xl shadow-md leading-relaxed pb-9 min-w-[60px] min-h-[44px] max-w-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-2xl rounded-br-sm">
                    <div className="prose prose-sm max-w-none prose-invert">
                      {displayContent}
                    </div>
                  </div>
                ) : (
                  <SimpleAIResponse content={displayContent} mode={mode} />
                )}

                {/* 打字指示器 */}
                {msg.isTyping && (
                  <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium animate-pulse ${mode === 'standard'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                    : mode === 'casual'
                      ? 'bg-pink-50 border border-pink-200 text-pink-600'
                      : 'bg-blue-50 border border-blue-100 text-blue-600'
                  }`}>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 0 12 0h4zm1.529 6.848l-1.758-1.758a8 8 0 111.758-1.758L12 12.529z"></path>
                    </svg>
                    {currentNodeName || '思考中'}
                  </div>
                )}

                {/* AI消息的操作按钮 */}
                {!msg.isTyping && displayContent && !isSelectionMode && (
                  <button onClick={(e) => { e.stopPropagation(); handleCopy(displayContent, msg.id); }} className={`absolute bottom-2 right-2 p-1.5 rounded-lg transition-all duration-200 z-10 text-slate-300 hover:bg-slate-100 hover:text-slate-500 ${copiedId === msg.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {copiedId === msg.id ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            );
          })}

          {messagesEndRef.current && <div ref={messagesEndRef} className="h-4" />}
        </div>

        {/* 输入区域 */}
        {!readOnly && (
          <div className="flex-shrink-0 bg-white border-t border-slate-200 p-4">
            <div className="max-w-4xl mx-auto">
              {selectedFiles.length > 0 && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-slate-50 rounded-lg">
                  <div className="flex gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-slate-200 text-sm">
                        <span className="truncate max-w-[200px]">{file.name}</span>
                        <button onClick={() => handleFileRemove(index)} className="text-slate-400 hover:text-red-500">
                          <CloseIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {selectedFiles.length > 0 && <span className="text-xs text-slate-400">{selectedFiles.length} 个文件</span>}
                </div>
              )}

              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onInput={handleTextareaResize}
                    placeholder={placeholder}
                    disabled={isLoading === 'loading'}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none bg-slate-50"
                    rows={1}
                  />
                  {inputText && (
                    <button onClick={handleSend} className="absolute right-3 bottom-3 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                      <SendIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading === 'loading'}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                    title="上传文件"
                  >
                    <PaperclipIcon className="w-5 h-5" />
                  </button>
                  {onCancel && (
                    <button
                      onClick={onCancel}
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                      title="取消"
                    >
                      <StopIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 回到顶部按钮 */}
        {showScrollTop && (
          <button
            onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all z-20"
          >
            <ArrowUpIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />
    </>
  );
};

export default ChatArea;
