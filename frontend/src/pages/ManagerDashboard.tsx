import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
  Building2, Users, AlertTriangle, ShieldCheck, Download, 
  FileSpreadsheet, ClipboardCheck, Play, RefreshCw, BarChart3, HelpCircle 
} from 'lucide-react';

export const ManagerDashboard: React.FC = () => {
  const { token, user } = useStore();
  
  // States
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Analytics States
  const [summary, setSummary] = useState<any>({});
  const [trends, setTrends] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [bottlenecks, setBottlenecks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'analytics' | 'anomalies' | 'bottlenecks'>('queue');
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      // Fetch manager pending queue
      const qRes = await fetch('/api/requests?status=In_Review_Manager', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const qData = await qRes.json();
      if (Array.isArray(qData)) {
        setRequests(qData);
      }

      // Fetch analytics summary
      const sumRes = await fetch('/api/analytics/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const sumData = await sumRes.json();
      if (sumData) {
        setSummary(sumData.summary || {});
        setTrends(sumData.trends?.map((t: any) => ({
          date: new Date(t.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          count: parseInt(t.count)
        })) || []);
        setDepartments(sumData.departments || []);
      }

      // Fetch officers list
      const offRes = await fetch('/api/analytics/officers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const offData = await offRes.json();
      if (Array.isArray(offData)) {
        setOfficers(offData);
      }

      // Fetch anomalies list
      const anomRes = await fetch('/api/analytics/corruption-anomalies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const anomData = await anomRes.json();
      if (Array.isArray(anomData)) {
        setAnomalies(anomData);
      }

      // Fetch bottlenecks list
      const bRes = await fetch('/api/analytics/bottlenecks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const bData = await bRes.json();
      if (Array.isArray(bData)) {
        setBottlenecks(bData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDecision = async (action: 'forward' | 'reject') => {
    if (!selectedRequest) return;
    setError('');
    setActionLoading(true);

    const endpoint = `/api/workflow/${action}`;
    const payload = {
      request_id: selectedRequest.id,
      remarks: remarks || `Final determination by Department Manager. Action: ${action.toUpperCase()}`
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
        setRemarks('');
        fetchData();
      } else {
        setError(data.error || 'Decision action failed.');
      }
    } catch (e) {
      setError('Connection failure submitting decision.');
    } finally {
      setActionLoading(false);
    }
  };

  // CSV Exporter for anomalies/bottlenecks
  const exportCSV = (data: any[], fileName: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => {
        let stringVal = String(val);
        // clean quotes
        if (stringVal.includes(',')) stringVal = `"${stringVal.replace(/"/g, '""')}"`;
        return stringVal;
      }).join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusColors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#64748b'];

  const getPieData = () => {
    if (!summary) return [];
    return [
      { name: 'Pending', value: parseInt(summary.pending_clerk || 0) + parseInt(summary.active_review || 0) },
      { name: 'Approved', value: parseInt(summary.approved_count || 0) },
      { name: 'Rejected', value: parseInt(summary.rejected_count || 0) },
      { name: 'Returned', value: parseInt(summary.returned_count || 0) }
    ].filter(item => item.value > 0);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Manager Analytics Console</h2>
          <p className="text-xs text-slate-400">Evaluate department queue timelines, bottlenecks, and corruption risk indicators</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData}
            className="p-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
          >
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200
            ${activeTab === 'queue' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}
          `}
        >
          Approval Queue ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200
            ${activeTab === 'analytics' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}
          `}
        >
          Department Analytics
        </button>
        <button
          onClick={() => setActiveTab('bottlenecks')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200
            ${activeTab === 'bottlenecks' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}
          `}
        >
          Bottlenecks (K-Means)
        </button>
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all duration-200
            ${activeTab === 'anomalies' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}
          `}
        >
          Corruption Risks (Isolation Forest)
        </button>
      </div>

      {/* Tab Contents */}

      {/* 1. APPROVAL QUEUE TAB */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-panel rounded-2xl border border-slate-800/60 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-blue-400" />
                <span>Escalated Inbox</span>
              </h3>
              
              {requests.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  Clean dashboard! No requests waiting for manager determination.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                  {requests.map(req => (
                    <div
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-300 text-left
                        ${selectedRequest?.id === req.id 
                          ? 'bg-blue-600/10 border-blue-500 shadow-lg' 
                          : 'bg-slate-900/30 border-slate-800/70 hover:border-slate-700'}
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-blue-400 font-bold">{req.reference_number}</span>
                        {req.is_escalated && (
                          <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase">
                            Escalated
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-slate-200 mt-1 truncate">{req.type}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Citizen: {req.citizen_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {selectedRequest ? (
              <div className="glass-panel rounded-2xl border border-slate-800/60 p-5 space-y-5">
                
                <div className="border-b border-slate-800/80 pb-3 flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-mono text-blue-400 font-bold">{selectedRequest.reference_number}</span>
                    <h3 className="font-bold text-lg text-slate-100 mt-0.5">{selectedRequest.type}</h3>
                    <p className="text-xs text-slate-400 mt-1">Applicant: {selectedRequest.citizen_name} | Target SLA: {new Date(selectedRequest.sla_deadline).toLocaleDateString()}</p>
                  </div>
                  {selectedRequest.risk_level && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">AI Delay Forecast</span>
                      <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold">
                        {selectedRequest.risk_level} Risk
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Application Content</span>
                  <p className="text-xs text-slate-300 bg-slate-900/40 p-4 rounded-xl border border-slate-800/40 leading-relaxed">
                    {selectedRequest.description || "No description provided."}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Manager Decision remarks</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter approval criteria, validation stamps, or rejection remarks..."
                    rows={4}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-xs">
                    {error}
                  </div>
                )}

                <div className="flex gap-4 justify-end pt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => handleDecision('reject')}
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 font-bold rounded-xl text-xs transition-colors"
                  >
                    Reject Application
                  </button>
                  <button
                    onClick={() => handleDecision('forward')}
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all duration-300 shadow-lg hover:shadow-emerald-500/10"
                  >
                    Grant Approval
                  </button>
                </div>

              </div>
            ) : (
              <div className="glass-panel rounded-2xl border border-slate-800/60 p-12 text-center text-slate-500 text-xs">
                Select an escalated file from the inbox to evaluate documents and grant final approval.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. ANALYTICS CENTER TAB */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          
          {/* Aggregated totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 border border-slate-800/60 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Filed Claims</span>
              <p className="text-2xl font-black text-slate-100 mt-1">{summary.total_requests || 0}</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800/60 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Reviews</span>
              <p className="text-2xl font-black text-blue-400 mt-1">{summary.active_review || 0}</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800/60 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Approved Certificates</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{summary.approved_count || 0}</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800/60 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SLA Breached Cases</span>
              <p className="text-2xl font-black text-rose-400 mt-1">{summary.sla_breached_count || 0}</p>
            </div>
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Submission trends (Line Chart) */}
            <div className="glass-panel rounded-2xl border border-slate-800/60 p-5 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Submission Trends</h4>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Request Status Share (Pie Chart) */}
            <div className="glass-panel rounded-2xl border border-slate-800/60 p-5 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workflow Distribution</h4>
              <div className="h-60 w-full flex items-center justify-between">
                <div className="h-full flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getPieData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {getPieData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={statusColors[index % statusColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5 pr-8">
                  {getPieData().map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors[index % statusColors.length] }} />
                      <span className="text-slate-400 font-semibold">{entry.name}:</span>
                      <span className="text-slate-200 font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Department speed performance */}
            <div className="glass-panel rounded-2xl border border-slate-800/60 p-5 space-y-2 lg:col-span-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Processing Days by Department</h4>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departments}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="department_name" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Bar dataKey="avg_resolution_days" name="Avg Processing Days" fill="#10b981" radius={[4, 4, 0, 0]}>
                      {departments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={parseFloat(entry.avg_resolution_days) > 15 ? '#ef4444' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Officer Rankings */}
          <div className="glass-panel rounded-2xl border border-slate-800/60 p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verifying Officer Rankings</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs font-bold uppercase">
                    <th className="py-2 px-2">Officer Name</th>
                    <th className="py-2 px-2">Department</th>
                    <th className="py-2 px-2 text-center">Pending Files</th>
                    <th className="py-2 px-2 text-center">Processed</th>
                    <th className="py-2 px-2 text-center">Avg Speed</th>
                    <th className="py-2 px-2 text-center">Escalated</th>
                    <th className="py-2 px-2 text-center">Rejection Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {officers.map(off => (
                    <tr key={off.id} className="hover:bg-slate-900/20 text-xs">
                      <td className="py-3 px-2 font-bold text-slate-200">{off.username}</td>
                      <td className="py-3 px-2 text-slate-400">{off.department_name}</td>
                      <td className="py-3 px-2 text-center font-bold text-blue-400">{off.pending_count}</td>
                      <td className="py-3 px-2 text-center text-slate-300">{off.processed_count}</td>
                      <td className="py-3 px-2 text-center text-slate-300 font-semibold">{off.avg_time_hours} hrs</td>
                      <td className="py-3 px-2 text-center text-amber-500 font-semibold">{off.escalation_count}</td>
                      <td className="py-3 px-2 text-center text-rose-400 font-semibold">{off.rejection_percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 3. BOTTLENECK CLUSTERING TAB */}
      {activeTab === 'bottlenecks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Department Backlog Clusters (K-Means Output)</h3>
              <p className="text-xs text-slate-400">Classifies organizational departments into performance segments based on backlog length and resolution speed.</p>
            </div>
            <button
              onClick={() => exportCSV(bottlenecks, 'department_bottlenecks')}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {bottlenecks.map(b => (
              <div 
                key={b.department_id}
                className={`glass-panel border rounded-2xl p-5 space-y-4 flex flex-col justify-between
                  ${b.severity === 'High' ? 'border-rose-500/20 bg-rose-500/5' : ''}
                  ${b.severity === 'Medium' ? 'border-amber-500/20 bg-amber-500/5' : ''}
                  ${b.severity === 'Low' ? 'border-emerald-500/20 bg-emerald-500/5' : ''}
                `}
              >
                <div>
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-mono font-bold text-blue-400">{b.department_code}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-wide
                      ${b.severity === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : ''}
                      ${b.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : ''}
                      ${b.severity === 'Low' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : ''}
                    `}>
                      {b.cluster_label}
                    </span>
                  </div>
                  <h4 className="font-bold text-md text-slate-200 mt-2">{b.department_name}</h4>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-800/80 pt-3">
                  <div>
                    <span className="text-slate-500">Backlog Queue</span>
                    <p className="font-bold text-slate-200 mt-0.5">{b.pending_queue} files</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Avg Resolution</span>
                    <p className="font-bold text-slate-200 mt-0.5">{b.avg_processing_days} days</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">SLA Breaches</span>
                    <p className="font-semibold text-rose-400 mt-0.5">{b.sla_breaches} incidents</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. CORRUPTION / ANOMALY DETECTIONS TAB */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Suspicious Processing Anomaly reports (Isolation Forest)</h3>
              <p className="text-xs text-slate-400">Identifies workflow events matching anomaly criteria: unusually fast approvals, excessive delays with high workloads, or elevated rejections.</p>
            </div>
            <button
              onClick={() => exportCSV(anomalies, 'corruption_risk_anomalies')}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>

          {anomalies.length === 0 ? (
            <div className="glass-panel border border-slate-800 p-12 text-center text-slate-500 text-xs">
              Excellent! No suspicious transaction patterns detected in this department.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {anomalies.map(anom => (
                <div key={anom.id} className="glass-panel border border-slate-800/80 rounded-2xl p-4.5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-blue-400 font-bold">{anom.reference_number}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold flex items-center gap-1
                      ${anom.risk_score > 0.8 ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}
                    `}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Risk: {Math.round(anom.risk_score * 100)}%</span>
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 bg-slate-900/30 p-3 rounded-xl border border-slate-800/50">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-500">Suspect Officer</span>
                        <p className="font-bold text-slate-200 mt-0.5">{anom.officer_name || 'System Operator'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Department</span>
                        <p className="font-bold text-slate-200 mt-0.5">{anom.department_name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1">
                    <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">AI Flags Description</span>
                    <p className="leading-relaxed bg-slate-950/20 p-2.5 rounded-lg border border-slate-850 text-slate-300">
                      {anom.reasons}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
