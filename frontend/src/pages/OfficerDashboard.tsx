import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { AiAssistantPanel } from '../components/AiAssistantPanel';
import { 
  ClipboardCheck, Clock, User, AlertTriangle, CheckCircle, 
  XCircle, CornerDownLeft, ArrowRight, ShieldAlert, Sparkles, RefreshCw, BarChart2 
} from 'lucide-react';

export const OfficerDashboard: React.FC = () => {
  const { token, user } = useStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedReqDetails, setSelectedReqDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Officer Stats counters
  const [stats, setStats] = useState({
    pending: 0,
    processed: 0,
    avgHours: 0.0,
    escalated: 0,
    rejections: 0.0
  });

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/requests?status=In_Review_Officer', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRequests(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOfficerMetrics = async () => {
    try {
      const res = await fetch('/api/analytics/officers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const myMetric = data.find(m => m.id === user?.id);
        if (myMetric) {
          setStats({
            pending: parseInt(myMetric.pending_count),
            processed: parseInt(myMetric.processed_count),
            avgHours: parseFloat(myMetric.avg_time_hours),
            escalated: parseInt(myMetric.escalation_count),
            rejections: parseFloat(myMetric.rejection_percent)
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch officer metrics", e);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchOfficerMetrics();
  }, []);

  const fetchDetails = async (id: number) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedReqDetails(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelectRequest = (req: any) => {
    setSelectedRequest(req);
    setRemarks('');
    fetchDetails(req.id);
  };

  const handleAction = async (action: 'forward' | 'reject' | 'return' | 'escalate') => {
    if (!selectedRequest) return;
    setError('');

    if ((action === 'reject' || action === 'return') && !remarks.trim()) {
      setError(`Remarks are mandatory when returning or rejecting application.`);
      return;
    }

    setActionLoading(true);
    const endpoint = `/api/workflow/${action}`;
    const payload = {
      request_id: selectedRequest.id,
      remarks: remarks || `Reviewed by Officer. Action: ${action.toUpperCase()}`
    };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedRequest(null);
        setSelectedReqDetails(null);
        fetchRequests();
        fetchOfficerMetrics();
      } else {
        setError(data.error || `Workflow operation '${action}' failed.`);
      }
    } catch (e) {
      setError('Connection failure updating workflow status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Computes SLA timers in days/hours
  const getSlaTimeLeft = (deadlineStr: string) => {
    const diff = new Date(deadlineStr).getTime() - new Date().getTime();
    if (diff < 0) {
      return { text: 'SLA BREACHED', urgent: true };
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) {
      return { text: `${days}d left`, urgent: days <= 2 };
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return { text: `${hours}h left`, urgent: true };
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Officer Verification Desk</h2>
          <p className="text-xs text-slate-400">Review document verifications and evaluate delay alerts</p>
        </div>
        <button 
          onClick={() => { fetchRequests(); fetchOfficerMetrics(); }}
          className="p-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
        >
          <RefreshCw className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Officer productivity indicators */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/50 border border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assigned Inbox</span>
          <p className="text-2xl font-black text-blue-400 mt-1">{requests.length}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Processed Lifetime</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{stats.processed || 0}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Processing Time</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{stats.avgHours ? `${stats.avgHours} hrs` : 'N/A'}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Escalation Count</span>
          <p className="text-2xl font-black text-orange-400 mt-1">{stats.escalated || 0}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rejection Rate</span>
          <p className="text-2xl font-black text-rose-400 mt-1">{stats.rejections ? `${stats.rejections}%` : '0%'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Inbox Queue list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel rounded-2xl border border-slate-800/60 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-blue-400" />
              <span>Assigned Queue</span>
            </h3>

            {requests.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                Perfect! No pending reviews at this stage.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {requests.map(req => {
                  const sla = getSlaTimeLeft(req.sla_deadline);
                  return (
                    <div
                      key={req.id}
                      onClick={() => handleSelectRequest(req)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-300 text-left
                        ${selectedRequest?.id === req.id 
                          ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/5' 
                          : 'bg-slate-900/30 border-slate-800/70 hover:border-slate-700'}
                      `}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-mono text-blue-400 font-bold">{req.reference_number}</span>
                        <span className={`px-2 py-0.5 rounded-full border text-[8px] font-bold tracking-wide uppercase
                          ${sla.urgent ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}
                        `}>
                          {sla.text}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-200 mt-1.5 truncate">{req.type}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Prioritized: <strong className="text-slate-400 font-semibold">{req.priority}</strong></p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Central File & Actions details */}
        <div className="lg:col-span-1 space-y-4">
          {selectedRequest ? (
            <div className="glass-panel rounded-2xl border border-slate-800/60 p-5 space-y-4 flex flex-col justify-between min-h-[500px]">
              
              <div className="space-y-4">
                <div className="border-b border-slate-800/80 pb-3">
                  <span className="text-[10px] font-mono text-blue-400 font-bold">{selectedRequest.reference_number}</span>
                  <h3 className="font-bold text-base text-slate-100 mt-0.5">{selectedRequest.type}</h3>
                  <p className="text-xs text-slate-400 mt-1">Citizen: {selectedRequest.citizen_name} | Priority: {selectedRequest.priority}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Application Detail</span>
                  <p className="text-xs text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-slate-800/40 leading-relaxed max-h-36 overflow-y-auto">
                    {selectedRequest.description || "No description provided."}
                  </p>
                </div>

                {/* Urgencies badges */}
                <div className="flex gap-4">
                  {selectedRequest.medical_urgency && (
                    <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 border border-rose-500/20 rounded-lg">
                      <span>Medical Alert</span>
                    </span>
                  )}
                  {selectedRequest.legal_urgency && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 rounded-lg">
                      <span>Legal Deadline</span>
                    </span>
                  )}
                </div>

                {/* Remarks logs */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Officer Decision Remarks</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter observations, checklist validation details, or rejection remarks..."
                    rows={4}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-xs">
                    {error}
                  </div>
                )}
              </div>

              {/* Action Buttons grid */}
              <div className="space-y-2 mt-4 pt-4 border-t border-slate-800/80">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAction('return')}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/30 text-amber-400 font-bold p-2.5 rounded-xl text-xs transition-colors"
                  >
                    <CornerDownLeft className="w-3.5 h-3.5" />
                    <span>Return Correction</span>
                  </button>
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 font-bold p-2.5 rounded-xl text-xs transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Request</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAction('escalate')}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-1 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/30 text-orange-400 font-bold p-2.5 rounded-xl text-xs transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Escalate File</span>
                  </button>
                  <button
                    onClick={() => handleAction('forward')}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-500 text-white font-bold p-2.5 rounded-xl text-xs transition-all duration-300 disabled:opacity-50"
                  >
                    <span>Forward Manager</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-slate-800/60 p-12 text-center text-slate-500 text-xs">
              Select an application queue to display logs and actions.
            </div>
          )}
        </div>

        {/* Right Column - AI Decision Assistant panel */}
        <div className="lg:col-span-1 space-y-4">
          <AiAssistantPanel 
            reviewData={selectedReqDetails?.aiReview || null}
            loading={loadingDetails}
          />
        </div>

      </div>

    </div>
  );
};
