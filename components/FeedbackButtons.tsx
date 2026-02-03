import React, { useState } from 'react';
import { FeedbackReason } from '../types';

interface FeedbackButtonsProps {
  messageId: string;
  conversationId: string;
  onSubmit?: (rating: number, reason?: FeedbackReason, reasonText?: string) => void;
  disabled?: boolean;
}

const FeedbackButtons: React.FC<FeedbackButtonsProps> = ({
  messageId,
  conversationId,
  onSubmit,
  disabled = false
}) => {
  const [rating, setRating] = useState<number | null>(null);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState<FeedbackReason | undefined>();
  const [reasonText, setReasonText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRate = async (score: number) => {
    if (disabled) return;

    setRating(score);

    if (score <= 2) {
      // 低分询问原因
      setShowReasonInput(true);
    } else {
      // 高分直接提交
      await submitFeedback(score);
    }
  };

  const submitFeedback = async (score: number) => {
    if (!onSubmit) return;

    setSubmitting(true);
    try {
      await onSubmit(score, reason, reasonText);
      // 重置状态
      setTimeout(() => {
        setShowReasonInput(false);
        setReason(undefined);
        setReasonText('');
      }, 2000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReasonSubmit = async () => {
    if (!rating) return;
    await submitFeedback(rating);
  };

  return (
    <div className="flex items-start gap-2 mt-3">
      <span className="text-sm text-slate-500 mt-1">评价回复：</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(score => (
          <button
            key={score}
            onClick={() => handleRate(score)}
            disabled={disabled || submitting}
            className={`text-xl transition-all px-1 py-1 rounded ${
              disabled
                ? 'text-slate-300 cursor-not-allowed'
                : rating === score
                ? 'text-yellow-400 scale-110'
                : 'text-slate-300 hover:text-yellow-300 hover:scale-105'
            }`}
            title={`${score}星`}
          >
            {rating && rating >= score ? '★' : '☆'}
          </button>
        ))}
      </div>

      {/* 原因选择（低分时显示） */}
      {showReasonInput && !submitting && (
        <div className="ml-2 bg-white rounded-lg border border-slate-200 shadow-lg p-4 min-w-[300px]">
          <div className="text-sm font-medium text-slate-700 mb-2">
            请告诉我们哪里需要改进：
          </div>

          {/* 原因选项 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { id: 'not_relevant', label: '不相关' },
              { id: 'inaccurate', label: '内容不准确' },
              { id: 'too_long', label: '回复太长' },
              { id: 'too_short', label: '回复太简短' },
              { id: 'missing_info', label: '缺少信息' },
              { id: 'other', label: '其他' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setReason(opt.id as FeedbackReason)}
                className={`text-sm px-3 py-2 rounded border transition-all ${
                  reason === opt.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 其他原因文本输入 */}
          {reason === 'other' && (
            <textarea
              placeholder="请详细描述..."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              className="w-full text-sm p-2 border border-slate-300 rounded mb-3 resize-none"
              rows={2}
            />
          )}

          {/* 提交按钮 */}
          <button
            onClick={handleReasonSubmit}
            disabled={!reason}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
              !reason
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            提交反馈
          </button>
        </div>
      )}

      {/* 提交成功提示 */}
      {submitting && (
        <div className="ml-2 text-sm text-green-600 flex items-center gap-1">
          <span className="inline-block w-4 h-4 bg-green-500 rounded-full animate-pulse"></span>
          感谢您的反馈！
        </div>
      )}
    </div>
  );
};

export default FeedbackButtons;
