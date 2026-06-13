import React from 'react';
import { Sparkles, CheckCircle2, AlertCircle, HelpCircle, ThumbsUp, ThumbsDown, ShieldAlert, Cpu } from 'lucide-react';

interface ChecklistItem {
  document: string;
  status: 'Uploaded' | 'Missing';
}

interface AiReviewData {
  summary: string;
  checklist: ChecklistItem[];
  missing_documents: string[];
  recommended_action: 'Approve' | 'Reject' | 'Return for Correction' | 'Escalate / Approve';
  explanation: string;
  confidence_score: number;
}

interface AiAssistantPanelProps {
  reviewData: AiReviewData | null;
  loading: boolean;
}

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({ reviewData, loading }) => {
  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 animate-pulse">
        <div className="flex items-center gap-2 text-blue-400 font-bold border-b border-slate-800 pb-3">
          <Sparkles className="w-5 h-5 animate-spin" />
          <span>AI Decision Assistant Evaluating...</span>
        </div>
        <div className="h-4 bg-slate-800 rounded w-3/4" />
        <div className="h-24 bg-slate-800 rounded" />
        <div className="h-10 bg-slate-800 rounded" />
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 text-center text-slate-500 flex flex-col items-center gap-2">
        <Cpu className="w-10 h-10 text-slate-600 mb-2" />
        <span>No active review evaluation available.</span>
        <span className="text-xs text-slate-600">Select an application to trigger AI review checks.</span>
      </div>
    );
  }

  const { summary, checklist, recommended_action, explanation, confidence_score } = reviewData;
  const confPercent = Math.round(confidence_score * 100);

  const getActionStyles = (action: string) => {
    switch (action) {
      case 'Approve':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Reject':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'Return for Correction':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase">AI Decision Assistant</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
          <Cpu className="w-3.5 h-3.5" />
          <span>Confidence: {confPercent}%</span>
        </div>
      </div>

      {/* Dynamic Summary */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Application Summary</h4>
        <p className="text-sm text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-slate-800/40 leading-relaxed">
          {summary}
        </p>
      </div>

      {/* Document Checklist */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Audit Checklist</h4>
        <div className="grid grid-cols-1 gap-2">
          {checklist.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/20 border border-slate-800/50 text-xs">
              <span className="text-slate-300 font-semibold">{item.document}</span>
              <span className={`flex items-center gap-1.5 font-bold ${item.status === 'Uploaded' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {item.status === 'Uploaded' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>Missing</span>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Action */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recommended Action</h4>
        <div className={`border p-3.5 rounded-xl flex items-center justify-between font-bold text-sm ${getActionStyles(recommended_action)}`}>
          <span>{recommended_action}</span>
          <div className="flex gap-2">
            {recommended_action === 'Approve' ? (
              <ThumbsUp className="w-5 h-5 shrink-0" />
            ) : (
              <ThumbsDown className="w-5 h-5 shrink-0" />
            )}
          </div>
        </div>
      </div>

      {/* Explanation Reasoning */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reasoning & Explanation</h4>
        <div className="text-xs text-slate-400 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-slate-800/60">
          <p className="mb-2">{explanation}</p>
          <div className="flex items-start gap-1.5 text-[10px] text-blue-400/90 border-t border-slate-800/80 pt-2 mt-2">
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Note: This is an AI recommendation based on SLA history and file check. Final approval responsibility remains with the assigned officer.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
