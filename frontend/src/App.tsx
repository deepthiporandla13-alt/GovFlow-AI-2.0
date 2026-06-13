import React, { useState, useEffect } from 'react';
import { API_BASE } from './api';
import { useStore } from './store/useStore';
import { Timeline } from './components/Timeline';
import { Chatbot } from './components/Chatbot';
import { 
  Building2, LogOut, Moon, Sun, Bell, AlertTriangle, ShieldCheck, 
  User as UserIcon, RefreshCw, Layers, Cpu, HelpCircle, FileText 
} from 'lucide-react';

// Dashboard imports (we will write these pages next)
import { CitizenDashboard } from './pages/CitizenDashboard';
import { ClerkDashboard } from './pages/ClerkDashboard';
import { OfficerDashboard } from './pages/OfficerDashboard';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';

export default function App() {
  const { user, token, theme, notifications, setAuth, logout, toggleTheme, setNotifications } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Citizen' | 'Clerk' | 'Officer' | 'Manager' | 'Super Admin'>('Citizen');
  const [deptId, setDeptId] = useState<string>('');
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch departments for registration dropdown
  
  useEffect(() => {
  if (!isLogin) {
    setDepartments([
      { id: 1, name: 'Revenue Department' },
      { id: 2, name: 'Land Administration' },
      { id: 3, name: 'Social Welfare' },
      { id: 4, name: 'Complaints Portal' },
      { id: 5, name: 'Commercial & Licensing' }
    ]);

    setDeptId('1');
  }
}, [isLogin]);
  
 

  // Fetch user notifications periodically
  const fetchUserNotifications = async () => {
    if (!token) return;
    try {
      // Mock fetch or backend call
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        // Fetch active notifications
        // In the interest of keeping the seed simple, we can generate a few notifications
        const notifRes = await fetch(`${API_BASE}/api/requests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const requests = await notifRes.json();
        
        // Formulate notification items based on status changes
        const notifs: any[] = [];
        if (Array.isArray(requests)) {
          requests.forEach((r, idx) => {
            if (r.status === 'Approved') {
              notifs.push({
                id: idx,
                title: 'Application Approved',
                message: `Your request ${r.reference_number} has been approved. Download your certificate.`,
                type: 'approval',
                read: false,
                created_at: r.updated_at
              });
            } else if (r.status === 'Returned_For_Correction') {
              notifs.push({
                id: idx,
                title: 'Action Needed: Returned Request',
                message: `Application ${r.reference_number} returned for corrections.`,
                type: 'deadline_warning',
                read: false,
                created_at: r.updated_at
              });
            } else if (r.is_escalated) {
              notifs.push({
                id: idx,
                title: 'Task Escalated',
                message: `File ${r.reference_number} escalated to Department Supervisor.`,
                type: 'escalation',
                read: false,
                created_at: r.updated_at
              });
            }
          });
        }
        setNotifications(notifs);
      }
    } catch (e) {
      console.warn("Could not sync notifications.");
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserNotifications();
      const interval = setInterval(fetchUserNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin
  ? `${API_BASE}/api/auth/login`
  : `${API_BASE}/api/auth/register`;
    const body = isLogin 
      ? { email, password } 
      : { username, email, password, role, department_id: role !== 'Citizen' && role !== 'Super Admin' ? parseInt(deptId) : null };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (isLogin) {
        setAuth(data.user, data.token);
      } else {
        // Switch to login
        setIsLogin(true);
        setError('Registration successful! Please login with your credentials.');
        // Reset fields
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Server connection issue.');
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => {
    if (!user) return null;
    switch (user.role) {
      case 'Citizen':
        return <CitizenDashboard />;
      case 'Clerk':
        return <ClerkDashboard />;
      case 'Officer':
        return <OfficerDashboard />;
      case 'Manager':
        return <ManagerDashboard />;
      case 'Super Admin':
        return <SuperAdminDashboard />;
      default:
        return <div className="text-center p-8">Unknown user role configuration.</div>;
    }
  };

  // Theme application
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#0b1329';
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#f8fafc';
    }
  }, [theme]);

  // Auth Screen
  if (!token || !user) {
    return (
      <div className="min-h-screen flex items-center justify-between p-4 bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
        <div className="w-full max-w-md mx-auto glass-panel rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
          
          {/* Logo / Header */}
          <div className="text-center mb-8 relative">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-between p-3.5 mx-auto text-blue-400 mb-3 animate-pulse-ring">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">GovFlow AI 2.0</h1>
            <p className="text-xs text-slate-400 mt-1.5">Bureaucratic Bottleneck Detection & Automation</p>
          </div>

          {error && (
            <div className={`p-4 rounded-xl text-xs mb-5 font-semibold leading-relaxed border
              ${error.includes('successful') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}
            `}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="enter username"
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@institution.gov"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">System Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Citizen">Citizen</option>
                      <option value="Clerk">Department Clerk</option>
                      <option value="Officer">Verifying Officer</option>
                      <option value="Manager">Department Manager</option>
                      <option value="Super Admin">System Admin</option>
                    </select>
                  </div>

                  {role !== 'Citizen' && role !== 'Super Admin' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Department</label>
                      <select
                        value={deptId}
                        onChange={(e) => setDeptId(e.target.value)}
                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/20 text-sm mt-3"
            >
              {loading ? 'Processing Authentication...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Toggle Screen */}
          <div className="text-center mt-6 text-xs text-slate-400">
            {isLogin ? "Need access? " : "Already registered? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-blue-400 hover:underline font-bold"
            >
              {isLogin ? 'Register New Profile' : 'Back to Login'}
            </button>
          </div>

        </div>
      </div>
    );
  }

  // App Layout Screen
  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0b1329] text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Top Navigation Bar */}
      <nav className={`border-b ${theme === 'dark' ? 'bg-slate-900/90 border-slate-800/80' : 'bg-white border-slate-200'} sticky top-0 z-40 backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-between p-2">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-md text-slate-100 dark:text-slate-100 flex items-center gap-1.5">
                  GovFlow <span className="text-[10px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded font-mono border border-blue-500/20">2.0</span>
                </span>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">{user.role}</p>
              </div>
            </div>

            {/* Middle Nav Items or Indicators */}
            {user.role !== 'Citizen' && user.department_name && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/60 border border-slate-700/30 text-slate-300 text-xs font-semibold">
                <Layers className="w-3.5 h-3.5" />
                <span>{user.department_name}</span>
              </div>
            )}

            {/* Right Side Options */}
            <div className="flex items-center gap-3">
              
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className={`p-2 rounded-xl border transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 rounded-xl border transition-colors relative ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                >
                  <Bell className="w-4 h-4" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl glass-panel shadow-2xl border border-slate-700/60 p-4 space-y-3 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold uppercase text-slate-400">Notifications</span>
                      <button 
                        onClick={() => setNotifications([])}
                        className="text-[10px] text-blue-400 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2.5">
                      {notifications.length === 0 ? (
                        <p className="text-center text-xs text-slate-500 py-4">No new notifications</p>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="p-2 bg-slate-900/40 border border-slate-800/60 rounded-xl space-y-1">
                            <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              {n.type === 'escalation' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              {n.title}
                            </h5>
                            <p className="text-[10px] text-slate-400 leading-normal">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile details */}
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-between p-1.5">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-200 leading-tight">{user.username}</p>
                  <p className="text-[9px] text-slate-400">{user.email}</p>
                </div>
              </div>

              {/* Logout Button */}
              <button 
                onClick={logout}
                className="p-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all duration-300 ml-1.5 flex items-center gap-1.5 font-bold text-xs"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>

            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderDashboard()}
      </main>

      {/* Embedded Chatbot for Citizens */}
      {user.role === 'Citizen' && <Chatbot />}
    </div>
  );
}
