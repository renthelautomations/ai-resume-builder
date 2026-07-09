import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useToast } from '../context/ToastContext';
import { Settings, Users, Database, LogOut, LayoutDashboard, Eye, EyeOff, CreditCard, CheckCircle, XCircle, Activity, Globe } from 'lucide-react';
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

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchPendingSubscriptions();
    } else if (activeTab === 'users') {
      fetchUsersStats();
    } else if (activeTab === 'overview') {
      fetchWebAnalytics();
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


          </>
        );
      case 'settings':
        return (
          <>
            <div className="admin-header-container">
              <h1 className="admin-header-title">API Configurations</h1>
              <p className="admin-header-desc">Manage external API integrations and keys.</p>
            </div>
            <div className="dash-card admin-settings-card">
              <label className="dash-label">OpenRouter API Key (Placeholder)</label>
              <div className="admin-settings-input-group" style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%' }}>
                <div className="admin-input-wrapper" style={{ position: 'relative', flex: 1, display: 'flex' }}>
                  <input 
                    type={showApiKey ? "text" : "password"} 
                    value="sk-or-v1-***************************"
                    readOnly
                    className="dash-input"
                    style={{ width: '100%', paddingRight: '44px' }}
                  />
                  <button 
                    type="button" 
                    className="admin-toggle-visibility-btn"
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? "Hide API Key" : "Show API Key"}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                  >
                    {showApiKey ? <EyeOff size={18} color="var(--text-muted)" /> : <Eye size={18} color="var(--text-muted)" />}
                  </button>
                </div>
                <button className="admin-update-btn">
                  Update
                </button>
              </div>
            </div>
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
                    <th style={{ padding: '16px', color: 'var(--text-muted)' }}>User ID</th>
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
                        <td style={{ padding: '16px', color: '#fff' }}>{u.id}</td>
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
            onClick={() => setActiveTab('settings')}
            className={`dashboard-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <Settings size={18} /> API Configurations
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
