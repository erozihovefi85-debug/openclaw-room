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
      setShowReasonInput(true);
    } else {
      await submitFeedback(score);
    }
  };

  const submitFeedback = async (score: number) => {
    if (!onSubmit) return;

    setSubmitting(true);
    try {
      await onSubmit(score, reason, reasonText);
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
            className={`btn ${rating === score ? 'btn-primary' : 'btn-secondary'} ${rating && rating >= score ? 'ring-2 ring-offset-2 ring-blue-200' : ''}`}
            title={`${score}星`}
          >
            {rating && rating >= score ? '★' : '☆'}
          </button>
        ))}
      </div>

      {showReasonInput && !submitting && (
        <div className="ml-2 bg-white rounded-lg shadow-xl p-4 min-w-[300px] border border-slate-200">
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
                className={`btn btn-sm ${reason === opt.id ? 'btn-primary' : 'btn-secondary'}`}
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
              className="w-full text-sm p-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
              rows={2}
            />
          )}

          {/* 提交按钮 */}
          <button
            onClick={handleReasonSubmit}
            disabled={!reason}
            className={`btn btn-block btn-primary ${!reason ? 'btn-secondary' : 'btn-primary'}`}
          >
            提交反馈
          </button>
        </div>
      )}

      {submitting && (
        <div className="ml-2 text-sm text-green-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" className="animate-spin">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 0 12 0h4zm1.529 6.848l-1.758-1.758a8 8 0 111.758-1.758L12 12.529z"></path>
          </svg>
          谢谢您的反馈！
        </div>
      )}
    </div>
  );
};

export default FeedbackButtons;
