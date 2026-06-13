import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Timeline } from '../components/Timeline';
import { 
  Plus, FileText, Search, Filter, Calendar, AlertTriangle, 
  Download, FileSpreadsheet, Send, Paperclip, CheckCircle2, Clock 
} from 'lucide-react';

export const CitizenDashboard: React.FC = () => {
  const { token, user } = useStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedReqDetails, setSelectedReqDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Submit Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Income Certificate');
  const [medicalUrgency, setMedicalUrgency] = useState(false);
  const [legalUrgency, setLegalUrgency] = useState(false);
  const [citizenCategory, setCitizenCategory] = useState('General');
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  const requestTypes = [
    'Income Certificate', 'Caste Certificate', 'Residence Certificate',
    'Complaint Registration', 'Business License', 'Land Approval',
    'Scholarship Request', 'Pension Request', 'General Service Request'
  ];

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/requests', {
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
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelectRequest = (req: any) => {
    setSelectedRequest(req);
    fetchDetails(req.id);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('type', type);
    formData.append('medical_urgency', medicalUrgency.toString());
    formData.append('legal_urgency', legalUrgency.toString());
    formData.append('citizen_category', citizenCategory);

    if (files) {
      for (let i = 0; i < files.length; i++) {
        formData.append('documents', files[i]);
      }
    }

    try {
      const res = await fetch('/api/requests/submit', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setShowSubmitModal(false);
        fetchRequests();
        // Reset Form
        setTitle('');
        setDescription('');
        setMedicalUrgency(false);
        setLegalUrgency(false);
        setFiles(null);
      } else {
        setError(data.error || 'Submitting request failed');
      }
    } catch (e) {
      setError('Connection failure submitting application.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Rejected':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'Returned_For_Correction':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Dashboard Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Citizen Application Portal</h2>
          <p className="text-xs text-slate-400">Register new certificates, check document checklists, and trace status</p>
        </div>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/10 text-sm"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>New Application</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Applications List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel rounded-2xl border border-slate-800/60 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Application History</h3>
            
            {requests.length === 0 ? (
              <div className="text-center py-16 text-slate-500 flex flex-col items-center gap-2">
                <FileText className="w-12 h-12 text-slate-700" />
                <span>You have no registered requests in the system.</span>
                <span className="text-xs">Click 'New Application' above to file certificate requests.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-2">Ref Number</th>
                      <th className="py-3 px-2">Service Type</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2">Deadline</th>
                      <th className="py-3 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-sm">
                    {requests.map(req => (
                      <tr 
                        key={req.id} 
                        onClick={() => handleSelectRequest(req)}
                        className={`hover:bg-slate-900/40 cursor-pointer transition-colors ${selectedRequest?.id === req.id ? 'bg-slate-900/60' : ''}`}
                      >
                        <td className="py-3 px-2 font-mono text-xs text-blue-400 font-bold">{req.reference_number}</td>
                        <td className="py-3 px-2 font-semibold text-slate-200">{req.type}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide uppercase ${getStatusBadgeClass(req.status)}`}>
                            {req.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs text-slate-400">
                          {new Date(req.sla_deadline).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRequest(req);
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                          >
                            Track Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Status Tracking & Details */}
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl border border-slate-800/60 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Courier Status Tracking</h3>
            
            {selectedRequest ? (
              <div className="space-y-5">
                {/* File summary */}
                <div className="border-b border-slate-800/80 pb-3">
                  <span className="text-[10px] font-mono text-blue-400 font-bold">{selectedRequest.reference_number}</span>
                  <h4 className="font-bold text-slate-200 mt-0.5">{selectedRequest.type}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{selectedRequest.title}</p>
                </div>

                {/* Timeline Component */}
                <Timeline 
                  currentStage={selectedRequest.current_stage} 
                  status={selectedRequest.status}
                  isEscalated={selectedRequest.is_escalated}
                />

                {/* AI Predictions */}
                {selectedRequest.status !== 'Approved' && selectedRequest.status !== 'Rejected' && (
                  <div className="bg-slate-900/60 border border-slate-800/60 p-4 rounded-xl space-y-3">
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>AI Delay Predictions</span>
                    </h5>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500">Delay Probability</span>
                        <p className={`font-bold mt-0.5 ${selectedRequest.delay_probability > 0.6 ? 'text-rose-400' : (selectedRequest.delay_probability > 0.3 ? 'text-amber-400' : 'text-emerald-400')}`}>
                          {Math.round(selectedRequest.delay_probability * 100)}%
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Delay Risk Level</span>
                        <p className={`font-bold mt-0.5 ${selectedRequest.risk_level === 'Critical' || selectedRequest.risk_level === 'High' ? 'text-rose-400' : 'text-slate-300'}`}>
                          {selectedRequest.risk_level || 'Low'}
                        </p>
                      </div>
                      <div className="col-span-2 border-t border-slate-800/80 pt-2 mt-1">
                        <span className="text-slate-500">Expected Resolution Date</span>
                        <p className="font-semibold text-slate-200 mt-0.5">
                          {selectedRequest.expected_completion_date ? new Date(selectedRequest.expected_completion_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions (like PDF certificate download) */}
                {selectedRequest.status === 'Approved' && (
                  <a
                    href={`/api/requests/${selectedRequest.id}/download`}
                    download
                    className="w-full flex items-center justify-between bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/10 text-xs"
                  >
                    <span>Download Approved Certificate</span>
                    <Download className="w-4 h-4" />
                  </a>
                )}

                {/* If returned for correction - show remarks */}
                {selectedRequest.status === 'Returned_For_Correction' && selectedReqDetails && (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-xs space-y-2">
                    <p className="font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Correction Action Required</span>
                    </p>
                    <p className="text-slate-300 font-semibold leading-relaxed">
                      Remarks: "{selectedReqDetails.auditLogs?.[0]?.remarks || 'Please verify document checklist.'}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-600 text-xs">
                Select an application to view live tracking details.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Submit Application Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-between p-4 z-50 animate-in fade-in duration-200">
          <div className="max-w-lg w-full mx-auto glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3 mb-4">File New Request</h3>
            
            {error && (
              <div className="p-3.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-xs mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Application Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Income Proof for Academic Scholarship"
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Service Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {requestTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Social Category</label>
                  <select
                    value={citizenCategory}
                    onChange={(e) => setCitizenCategory(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-2 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="Senior Citizen">Senior Citizen</option>
                    <option value="Differently Abled">Differently Abled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Details & Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide detailed description or reasons..."
                  rows={3}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Urgency Parameters */}
              <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/60 grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={medicalUrgency}
                    onChange={(e) => setMedicalUrgency(e.target.checked)}
                    className="rounded border-slate-800 text-blue-600 bg-slate-950 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs text-slate-300">Medical Urgency</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={legalUrgency}
                    onChange={(e) => setLegalUrgency(e.target.checked)}
                    className="rounded border-slate-800 text-blue-600 bg-slate-950 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs text-slate-300">Legal/Court Deadline</span>
                </label>
              </div>

              {/* File upload */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Upload Documentation checklist</span>
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20"
                />
                <p className="text-[10px] text-slate-500 mt-1">Upload ID cards, income proofs, or NOC certificates as required.</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-900/60 text-slate-300 rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all duration-300 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitLoading ? 'Filing Request...' : 'Submit Application'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
