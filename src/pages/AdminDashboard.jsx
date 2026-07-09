import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useToast } from '../context/ToastContext';
import { Settings, Users, Database, LogOut, LayoutDashboard, Eye, EyeOff, CreditCard, CheckCircle, XCircle, Activity, Globe, TrendingUp, AlertCircle, Award, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../components/UserDashboard/UserDashboard.css'; // Reuse dashboard styles
import './AdminDashboard.css'; // Admin specific styles
import DatabaseStats from '../components/AdminDashboard/DatabaseStats';

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showApiKey, setShowApiKey] = useState(false);
  const [pendingSubs, setPendingSubs] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [webAnalytics, setWebAnalytics] = useState({ pageViews: 0, visitors: 0, loading: true });
  
  // New state for Overview
  const [recentActivity, setRecentActivity] = useState([]);
  const [dbStats, setDbStats] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchPendingSubscriptions();
    } else if (activeTab === 'users') {
      fetchUsersStats();
    } else if (activeTab === 'overview') {
      fetchWebAnalytics();
      fetchOverviewData();
      fetchPendingSubscriptions(); // Needed for the 'Needs Attention' alert
      fetchUsersStats(); // Needed for the 'Leaderboard'
    }
  }, [activeTab]);

  const fetchWebAnalytics = async () => {
    setWebAnalytics(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        // The Vercel endpoint /visits/count returns something like { "pageviews": 100, "visitors": 50 }
        // We will just try to extract those values. Note: Vercel may return "total" depending on the exact route
        setWebAnalytics({
          pageViews: data.pageviews || data.total || 0,
          visitors: data.visitors || 0,
          loading: false
        });
      } else {
        setWebAnalytics({ pageViews: 0, visitors: 0, loading: false });
      }
    } catch (err) {
      console.error('Failed to fetch web analytics:', err);
      setWebAnalytics({ pageViews: 0, visitors: 0, loading: false });
    }
  };

  const fetchOverviewData = async () => {
    setLoadingOverview(true);
    // Fetch stats for chart
    const { data: statsData } = await supabase.rpc('get_database_stats');
    if (statsData) setDbStats(statsData);
    
    // Fetch recent activity
    const { data: activityData } = await supabase.rpc('get_recent_activity');
    if (activityData) setRecentActivity(activityData);
    
    setLoadingOverview(false);
  };

  const fetchUsersStats = async () => {
    setLoadingUsers(true);
    // Call the RPC function to get all user stats (bypassing RLS safely)
    const { data, error } = await supabase.rpc('get_admin_user_stats');
    
    if (!error && data) {
      setUsersList(data);
    } else {
      // Fallback if RPC is not installed (might only fetch admin's own profile due to RLS)
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select(`
          id, created_at, credits,
          resumes (count),
          user_profiles (count)
        `)
        .order('created_at', { ascending: false });

      if (!fallbackError && fallbackData) {
        const formattedData = fallbackData.map(u => ({
          id: u.id,
          created_at: u.created_at,
          credits: u.credits,
          resumes_count: u.resumes[0].count,
          profiles_count: u.user_profiles[0].count
        }));
        setUsersList(formattedData);
      }
    }
    setLoadingUsers(false);
  };

  const fetchPendingSubscriptions = async () => {
    setLoadingSubs(true);
    // Fetch pending subscriptions along with user info
    const { data, error } = await supabase
      .from('credit_subscriptions')
      .select(`
        id, credits_amount, price_php, status, created_at, full_name, mobile_number, reference_number, receipt_url,
        profiles ( id )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setPendingSubs(data);
    }
    setLoadingSubs(false);
  };

  const handleApprove = async (subId) => {
    try {
      const { error } = await supabase.rpc('approve_subscription', { p_subscription_id: subId });
      if (error) throw error;
      
      addToast('Subscription approved successfully', 'success');
      setPendingSubs(prev => prev.filter(s => s.id !== subId));
    } catch (err) {
      console.error(err);
      addToast('Error approving subscription', 'error');
    }
  };

  const handleReject = async (subId) => {
    try {
      const { error } = await supabase.rpc('reject_subscription', { p_subscription_id: subId });
      if (error) throw error;
      
      addToast('Subscription rejected', 'success');
      setPendingSubs(prev => prev.filter(s => s.id !== subId));
    } catch (err) {
      console.error(err);
      addToast('Error rejecting subscription', 'error');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <div className="admin-header-container" style={{ marginBottom: '32px' }}>
              <h1 className="admin-header-title">Platform Overview</h1>
              <p className="admin-header-desc">Manage your AI Resume Builder configurations and users.</p>
            </div>

            {/* Vercel Web Analytics KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              {/* Page Views Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px',
                position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: `radial-gradient(circle, #3B82F622 0%, transparent 70%)`, borderRadius: '50%' }} />
                <div style={{ background: `#3B82F615`, color: '#3B82F6', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid #3B82F630` }}>
                  <Globe size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '4px' }}>Total Page Views</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                    {webAnalytics.loading ? <div className="spinner" style={{width: '20px', height: '20px'}} /> : webAnalytics.pageViews.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Visitors Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px',
                position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: `radial-gradient(circle, #10B98122 0%, transparent 70%)`, borderRadius: '50%' }} />
                <div style={{ background: `#10B98115`, color: '#10B981', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid #10B98130` }}>
                  <Users size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '4px' }}>Unique Visitors</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                    {webAnalytics.loading ? <div className="spinner" style={{width: '20px', height: '20px'}} /> : webAnalytics.visitors.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* NEW OVERVIEW COMPONENTS */}
            <div className="admin-overview-layout">
              
              {/* Left Column: Chart and Leaderboard */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Needs Attention Alert (Only if there are pending subs) */}
                {pendingSubs.length > 0 && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ color: '#F59E0B' }}><AlertCircle size={24} /></div>
                      <div>
                        <h3 style={{ color: '#F59E0B', margin: 0, fontSize: '16px', fontWeight: '600' }}>Needs Attention</h3>
                        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>You have {pendingSubs.length} pending credit subscription{pendingSubs.length > 1 ? 's' : ''}.</p>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('subscriptions')} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>Review</button>
                  </div>
                )}

                {/* Growth Chart */}
                <div className="dash-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <TrendingUp size={20} color="#60A5FA" />
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: '600' }}>Platform Growth (30 Days)</h3>
                  </div>
                  <div style={{ height: '300px', width: '100%' }}>
                    {loadingOverview || !dbStats ? (
                      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dbStats.signups_over_time.map((s, i) => ({
                          date: new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                          Signups: i + 1, // Cumulative mockup for demo based on recent users
                          Resumes: dbStats.resumes_over_time[i] ? i + 1 : 0
                        }))}>
                          <defs>
                            <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorResumes" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                          <Area type="monotone" dataKey="Signups" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorSignups)" />
                          <Area type="monotone" dataKey="Resumes" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorResumes)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Power Users Leaderboard */}
                <div className="dash-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <Award size={20} color="#F59E0B" />
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: '600' }}>Power Users</h3>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', minWidth: '300px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>User</th>
                          <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Resumes</th>
                          <th style={{ padding: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>Credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingUsers ? (
                          <tr><td colSpan="3" style={{ padding: '12px', textAlign: 'center' }}><div className="spinner" /></td></tr>
                        ) : (
                          [...usersList].sort((a, b) => b.total_resumes - a.total_resumes).slice(0, 5).map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '12px', color: '#fff' }}>{u.full_name || u.email || u.id.substring(0,8)}</td>
                              <td style={{ padding: '12px', color: '#10B981', fontWeight: '600' }}>{u.total_resumes}</td>
                              <td style={{ padding: '12px', color: '#fff' }}>{u.credits}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Right Column: Activity Feed */}
              <div className="dash-card" style={{ height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <Clock size={20} color="#8B5CF6" />
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: '600' }}>Recent Activity</h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {loadingOverview ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><div className="spinner" /></div>
                  ) : recentActivity.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>No recent activity.</div>
                  ) : (
                    recentActivity.map((act, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '8px', height: '8px', borderRadius: '50%', marginTop: '6px',
                          background: act.type === 'signup' ? '#3B82F6' : act.type === 'resume' ? '#10B981' : '#F59E0B',
                          boxShadow: `0 0 10px ${act.type === 'signup' ? '#3B82F6' : act.type === 'resume' ? '#10B981' : '#F59E0B'}`
                        }} />
                        <div>
                          <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                            {act.detail}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'flex', gap: '8px' }}>
                            <span>User: {act.full_name || act.email || act.user_id.substring(0,8)}</span>
                            <span>•</span>
                            <span>{new Date(act.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Bottom Spacer */}
            <div style={{ height: '100px', flexShrink: 0, width: '100%' }} />
          </>
        );

      case 'users':
        return (
          <>
            <div className="admin-header-container">
              <h1 className="admin-header-title">User Management</h1>
              <p className="admin-header-desc">View platform users and their usage statistics.</p>
            </div>
            
            <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Date Joined</th>
                    <th style={{ padding: '16px', color: 'var(--text-muted)' }}>User</th>
                    <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Saved Profiles</th>
                    <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Saved Resumes</th>
                    <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Credits Left</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr><td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users...</td></tr>
                  ) : usersList.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</td></tr>
                  ) : (
                    usersList.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '16px', color: '#fff' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '16px', color: '#fff' }}>
                          <div style={{ fontWeight: '500' }}>{u.full_name || u.email || 'Unknown User'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.id}</div>
                        </td>
                        <td style={{ padding: '16px', color: '#fff', fontWeight: 'bold' }}>{u.total_profiles}</td>
                        <td style={{ padding: '16px', color: '#fff', fontWeight: 'bold' }}>{u.total_resumes}</td>
                        <td style={{ padding: '16px', color: '#10B981', fontWeight: 'bold' }}>{u.credits}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        );
      case 'database':
        return <DatabaseStats />;
      case 'subscriptions':
        return (
          <>
            <div className="admin-header-container">
              <h1 className="admin-header-title">Credit Subscriptions</h1>
              <p className="admin-header-desc">Manage and approve pending credit purchases.</p>
            </div>
            
            <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Date Request</th>
                    <th style={{ padding: '16px', color: 'var(--text-muted)' }}>User</th>
                    <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Payment Details</th>
                    <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Credits</th>
                    <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Price (PHP)</th>
                    <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSubs ? (
                    <tr><td colSpan="6" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
                  ) : pendingSubs.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>No pending subscriptions found.</td></tr>
                  ) : (
                    pendingSubs.map(sub => (
                      <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '16px', color: '#fff' }}>{new Date(sub.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '16px', color: '#fff' }} title={sub.profiles?.id}>
                          {sub.profiles?.id ? `${sub.profiles.id.substring(0,8)}...` : 'Unknown'}
                        </td>
                        <td style={{ padding: '16px', color: '#fff' }}>
                          <div style={{ fontSize: '13px' }}><strong>Name:</strong> {sub.full_name || 'N/A'}</div>
                          <div style={{ fontSize: '13px' }}><strong>Mob:</strong> {sub.mobile_number || 'N/A'}</div>
                          <div style={{ fontSize: '13px' }}><strong>Ref:</strong> {sub.reference_number || 'N/A'}</div>
                          {sub.receipt_url && (
                            <div style={{ fontSize: '13px', marginTop: '4px' }}>
                              <a href={sub.receipt_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60A5FA', textDecoration: 'underline' }}>View Receipt</a>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px', color: '#fff', fontWeight: 'bold' }}>{sub.credits_amount}</td>
                        <td style={{ padding: '16px', color: '#fff' }}>₱{sub.price_php}</td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => handleApprove(sub.id)}
                              style={{ 
                                background: '#10B981', color: '#fff', border: 'none', padding: '6px 12px', 
                                borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px'
                              }}
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                            <button 
                              onClick={() => handleReject(sub.id)}
                              style={{ 
                                background: 'transparent', color: '#EF4444', border: '1px solid #EF4444', padding: '6px 12px', 
                                borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px'
                              }}
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="shell">
      {/* Sidebar / Bottom Nav */}
      <div className="dashboard-sidebar panel" style={{ padding: 0 }}>
        <div className="dashboard-sidebar-header">
          <div className="sidebar-profile-card">
            <div className="dashboard-avatar">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div className="dashboard-user-info">
              <h3 className="dashboard-user-name">Admin Portal</h3>
              <div className="dashboard-user-credits">
                {user?.email}
              </div>
            </div>
          </div>
        </div>
        
        <div className="dashboard-nav dashboard-padded-section">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`dashboard-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} /> Overview
          </button>

          <button 
            onClick={() => setActiveTab('subscriptions')}
            className={`dashboard-nav-item ${activeTab === 'subscriptions' ? 'active' : ''}`}
          >
            <CreditCard size={18} /> Subscriptions
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`dashboard-nav-item ${activeTab === 'users' ? 'active' : ''}`}
          >
            <Users size={18} /> User Management
          </button>
          <button 
            onClick={() => setActiveTab('database')}
            className={`dashboard-nav-item ${activeTab === 'database' ? 'active' : ''}`}
          >
            <Database size={18} /> Database Stats
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="dashboard-content-area dashboard-padded-section panel" style={{ position: 'relative', overflowY: 'auto', background: 'transparent' }}>
        {renderContent()}
      </div>
    </div>
  );
}
