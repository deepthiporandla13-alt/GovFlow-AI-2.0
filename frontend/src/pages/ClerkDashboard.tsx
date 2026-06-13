import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Timeline } from '../components/Timeline';
import { 
  FileText, Search, ArrowRight, CornerDownLeft, Eye, CheckSquare, 
  Square, AlertCircle, RefreshCw, MessageSquare, ClipboardCheck 
} from 'lucide-react';

export const ClerkDashboard: React.FC = () => {
  const { token, user } = useStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedReqDetails, setSelectedReqDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/requests?status=Submitted', {
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

  useEffect(() => {
    fetchRequests();
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
        
        // Reset check status
        const initialChecked: Record<string, boolean> = {};
        data.aiReview?.checklist?.forEach((item: any) => {
          initialChecked[item.document] = item.status === 'Uploaded';
        });
        setCheckedDocs(initialChecked);
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

  const handleForward = async () => {
    if (!selectedRequest) return;
    setError('');
    setActionLoading(true);

    try {
      const res = await fetch('/api/workflow/forward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          request_id: selectedRequest.id,
          remarks: remarks || 'Initial documents reviewed and verified by Clerk.'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedRequest(null);
        setSelectedReqDetails(null);
        fetchRequests();
      } else {
        setError(data.error || 'Failed to forward application.');
      }
    } catch (e) {
      setError('Connection error forwarding file.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedRequest) return;
    if (!remarks.trim()) {
      setError('Correction remarks are required so that the citizen knows what to correct.');
      return;
    }
    setError('');
    setActionLoading(true);

    try {
      const res = await fetch('/api/workflow/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          request_id: selectedRequest.id,
          remarks
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedRequest(null);
        setSelectedReqDetails(null);
        fetchRequests();
      } else {
        setError(data.error || 'Failed to return request.');
      }
    } catch (e) {
      setError('Connection error returning file.');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleDocCheck = (docName: string) => {
    setCheckedDocs(prev => ({
      ...prev,
      [docName]: !prev[docName]
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Clerk Verification Desk</h2>
          <p className="text-xs text-slate-400">Perform initial document checks and forward matching claims</p>
        </div>
        <button 
          onClick={fetchRequests}
          className="p-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
        >
          <RefreshCw className="w-4.5 h-4.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Processing Queue */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel rounded-2xl border border-slate-800/60 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-blue-400" />
              <span>Pending Inbox ({requests.length})</span>
            </h3>

            {requests.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                Your queue is clean! No pending applications require verification.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {requests.map(req => (
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
                        ${req.priority === 'Critical' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse' : ''}
                        ${req.priority === 'High' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : ''}
                        ${req.priority === 'Medium' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : ''}
                        ${req.priority === 'Low' ? 'bg-slate-800 text-slate-400 border-slate-700' : ''}
                      `}>
                        {req.priority}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-200 mt-1.5 truncate">{req.type}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Submitted: {new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Columns - Details, Documents & Decision Panel */}
        <div className="lg:col-span-2 space-y-4">
          {selectedRequest ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Application Details */}
              <div className="glass-panel rounded-2xl border border-slate-800/60 p-5 space-y-4">
                <div className="border-b border-slate-800/80 pb-3">
                  <span className="text-[10px] font-mono text-blue-400 font-bold">{selectedRequest.reference_number}</span>
                  <h3 className="font-bold text-lg text-slate-100 mt-0.5">{selectedRequest.type}</h3>
                  <p className="text-xs text-slate-400 mt-1">Applicant: {selectedRequest.citizen_name} ({selectedRequest.citizen_category} Category)</p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Statement / Purpose</span>
                  <p className="text-xs text-slate-300 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/40 leading-relaxed max-h-40 overflow-y-auto">
                    {selectedRequest.description || "No description provided."}
                  </p>
                </div>

                {/* Urgencies details */}
                <div className="flex gap-4">
                  {selectedRequest.medical_urgency && (
                    <span className="flex items-center gap-1.5 text-xs text-rose-400 font-bold bg-rose-500/10 px-2.5 py-1 border border-rose-500/20 rounded-xl">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Medical Urgency</span>
                    </span>
                  )}
                  {selectedRequest.legal_urgency && (
                    <span className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 border border-amber-500/20 rounded-xl">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Legal Deadline</span>
                    </span>
                  )}
                </div>

                {/* Attached files */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attached Proofs</span>
                  {selectedReqDetails?.documents?.length === 0 ? (
                    <p className="text-xs text-slate-500">No documents uploaded.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedReqDetails?.documents?.map((doc: any) => (
                        <div key={doc.id} className="flex justify-between items-center p-2 rounded-xl bg-slate-900/30 border border-slate-800/50 text-xs">
                          <span className="text-slate-300 font-semibold truncate max-w-[70%]">{doc.name}</span>
                          <a 
                            href={`/${doc.file_path}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-bold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View file</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Checklist & Action Form */}
              <div className="glass-panel rounded-2xl border border-slate-800/60 p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800/80 pb-2">Clerk Verification Form</h3>
                  
                  {error && (
                    <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-xs">
                      {error}
                    </div>
                  )}

                  {/* Manual checklist verification */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Checklist Compliance</span>
                    {loadingDetails ? (
                      <div className="h-20 bg-slate-900/50 rounded-xl animate-pulse" />
                    ) : (
                      <div className="space-y-2">
                        {selectedReqDetails?.aiReview?.checklist?.map((item: any) => (
                          <div 
                            key={item.document}
                            onClick={() => toggleDocCheck(item.document)}
                            className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs cursor-pointer select-none"
                          >
                            {checkedDocs[item.document] ? (
                              <CheckSquare className="w-4.5 h-4.5 text-blue-400" />
                            ) : (
                              <Square className="w-4.5 h-4.5 text-slate-600" />
                            )}
                            <span className={checkedDocs[item.document] ? 'text-slate-200 font-semibold' : 'text-slate-500'}>
                              {item.document}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Remarks Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Verification Remarks</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Remarks (mandatory for return, e.g. Aadhar card missing...)"
                      rows={3.5}
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Actions Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80 mt-4">
                  <button
                    onClick={handleReturn}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/30 text-amber-400 font-bold p-3 rounded-xl text-xs transition-colors"
                  >
                    <CornerDownLeft className="w-4 h-4" />
                    <span>Return for Correction</span>
                  </button>
                  <button
                    onClick={handleForward}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold p-3 rounded-xl text-xs transition-all duration-300 disabled:opacity-50"
                  >
                    <span>Verify & Forward</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>

            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-slate-800/60 p-12 text-center text-slate-500 text-xs">
              Select an application from the pending list to view documents and perform verification.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
