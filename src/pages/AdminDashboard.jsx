import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useToast } from '../context/ToastContext';
import { Users, Database, LogOut, LayoutDashboard, CreditCard, CheckCircle, XCircle, Globe, TrendingUp, AlertCircle, Award, Clock, FileText, Home, RefreshCw, Search, ChevronLeft, ChevronRight, BriefcaseBusiness } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import '../components/UserDashboard/UserDashboard.css'; // Reuse dashboard styles
import './AdminDashboard.css'; // Admin specific styles
import DatabaseStats from '../components/AdminDashboard/DatabaseStats';
import JobAnalytics from '../components/AdminDashboard/JobAnalytics';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionFilter, setSubscriptionFilter] = useState('pending');
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [userSort, setUserSort] = useState('newest');
  const [userPage, setUserPage] = useState(1);

  const [webAnalytics, setWebAnalytics] = useState({ pageViews: 0, visitors: 0, loading: true });
  const [analyticsError, setAnalyticsError] = useState('');
  
  const [recentActivity, setRecentActivity] = useState([]);
  const [dbStats, setDbStats] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const USERS_PER_PAGE = 25;

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    const filtered = usersList.filter(userItem => {
      if (!query) return true;
      return [userItem.full_name, userItem.email, userItem.id]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query));
    });

    return filtered.sort((a, b) => {
      if (userSort === 'resumes') return (b.total_resumes || 0) - (a.total_resumes || 0);
      if (userSort === 'credits') return (b.credits || 0) - (a.credits || 0);
      if (userSort === 'name') return (a.full_name || a.email || '').localeCompare(b.full_name || b.email || '');
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [usersList, userQuery, userSort]);

  const userPageCount = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const visibleUsers = filteredUsers.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE);

  const overviewChartData = buildDailySeries(
    dbStats?.signups_over_time,
    dbStats?.resumes_over_time,
    30
  );
  const hasOverviewActivity = overviewChartData.some(point => point.Signups > 0 || point.Resumes > 0);

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchSubscriptions(subscriptionFilter);
    } else if (activeTab === 'users') {
      fetchUsersStats();
    } else if (activeTab === 'overview') {
      refreshOverview();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userPage > userPageCount) setUserPage(userPageCount);
  }, [userPage, userPageCount]);

  const fetchWebAnalytics = async () => {
    setWebAnalytics(prev => ({ ...prev, loading: true }));
    setAnalyticsError('');
    try {
      const { data, error } = await supabase.rpc('get_web_analytics');
      if (error) throw error;
      setWebAnalytics({
        pageViews: data?.pageViews || 0,
        visitors: data?.visitors || 0,
        loading: false
      });
    } catch (err) {
      console.error('Failed to fetch web analytics:', err);
      setAnalyticsError('Analytics unavailable. Try refreshing.');
      setWebAnalytics(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchOverviewData = async () => {
    setLoadingOverview(true);
    setOverviewError('');
    try {
      const [statsResult, activityResult] = await Promise.all([
        (async () => {
          const currentResult = await supabase.rpc('get_database_stats', { p_days: 30 });
          return currentResult.error ? supabase.rpc('get_database_stats') : currentResult;
        })(),
        supabase.rpc('get_recent_activity')
      ]);

      if (statsResult.error) throw statsResult.error;
      if (activityResult.error) throw activityResult.error;

      setDbStats(statsResult.data || null);
      setRecentActivity(Array.isArray(activityResult.data) ? activityResult.data : []);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error('Failed to fetch overview data:', err);
      setOverviewError('Overview data unavailable. Try refreshing.');
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchUsersStats = async () => {
    setLoadingUsers(true);
    setUsersError('');
    try {
      // Call the RPC function to get all user stats (bypassing RLS safely)
      const { data, error } = await supabase.rpc('get_admin_user_stats');

      if (!error && data) {
        setUsersList(Array.isArray(data) ? data : []);
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
            total_resumes: u.resumes?.[0]?.count || 0,
            total_profiles: u.user_profiles?.[0]?.count || 0
          }));
          setUsersList(formattedData);
        } else {
          throw error || fallbackError || new Error('User data unavailable');
        }
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsersError('Users unavailable. Try refreshing.');
      setUsersList([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchSubscriptions = async (status = subscriptionFilter) => {
    setLoadingSubs(true);
    setSubscriptionError('');
    const applySubscriptions = nextSubscriptions => {
      setSubscriptions(nextSubscriptions);
      if (status === 'pending') setPendingCount(nextSubscriptions.length);
      if (status === 'all') setPendingCount(nextSubscriptions.filter(subscription => subscription.status === 'pending').length);
    };
    try {
      const { data, error } = await supabase.rpc('get_admin_subscriptions', { p_status: status });
      if (!error && data) {
        applySubscriptions(Array.isArray(data) ? data : []);
        return;
      }

      if (status === 'pending') {
        const legacyResult = await supabase.rpc('get_pending_subscriptions');
        if (!legacyResult.error && legacyResult.data) {
          applySubscriptions(Array.isArray(legacyResult.data) ? legacyResult.data : []);
          return;
        }
      }

      let fallbackQuery = supabase
        .from('credit_subscriptions')
        .select(`
          id, user_id, credits_amount, price_php, status, created_at, full_name, mobile_number, reference_number, receipt_url,
          profiles ( id )
        `)
        .order('created_at', { ascending: false });

      if (status !== 'all') fallbackQuery = fallbackQuery.eq('status', status);

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      if (!fallbackError && fallbackData) {
        applySubscriptions(fallbackData);
        return;
      }

      throw error || fallbackError || new Error('Subscription data unavailable');
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
      setSubscriptionError('Subscriptions unavailable. Try refreshing.');
      setSubscriptions([]);
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleApprove = async (subId) => {
    if (!window.confirm('Approve this purchase and add credits to the user?')) return;
    setActionLoadingId(subId);
    try {
      const { error } = await supabase.rpc('approve_subscription', { p_subscription_id: subId });
      if (error) throw error;
      
      addToast('Subscription approved', 'success');
      await fetchSubscriptions(subscriptionFilter);
    } catch (err) {
      console.error(err);
      addToast('Could not approve subscription', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (subId) => {
    if (!window.confirm('Reject this purchase?')) return;
    setActionLoadingId(subId);
    try {
      const { error } = await supabase.rpc('reject_subscription', { p_subscription_id: subId });
      if (error) throw error;
      
      addToast('Subscription rejected', 'success');
      await fetchSubscriptions(subscriptionFilter);
    } catch (err) {
      console.error(err);
      addToast('Could not reject subscription', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const refreshOverview = async () => {
    await Promise.all([
      fetchWebAnalytics(),
      fetchOverviewData(),
      fetchSubscriptions('pending'),
      fetchUsersStats()
    ]);
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
            <div className="admin-header-container">
              <div className="admin-header-row">
                <div>
                  <h1 className="admin-header-title">Platform Overview</h1>
                  <p className="admin-header-desc">Manage your AI Resume Builder configurations and users.</p>
                </div>
                <div className="admin-header-actions">
                  <span className="admin-last-refreshed">
                    {lastRefreshedAt ? `Updated ${formatRelativeTime(lastRefreshedAt)}` : 'Loading data'}
                  </span>
                  <button
                    type="button"
                    className="admin-icon-button"
                    onClick={refreshOverview}
                    disabled={loadingOverview || webAnalytics.loading}
                    aria-label="Refresh overview"
                    title="Refresh overview"
                  >
                    <RefreshCw size={18} className={loadingOverview || webAnalytics.loading ? 'spin' : ''} />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-button"
                    onClick={() => navigate('/')}
                    aria-label="Return to home"
                    title="Return to home"
                  >
                    <Home size={20} />
                  </button>
                </div>
              </div>
            </div>

            <div className="admin-kpi-grid">
              <OverviewKpi
                icon={<Globe size={22} />}
                label="Total page views"
                value={webAnalytics.loading ? null : webAnalytics.pageViews.toLocaleString()}
                tone="blue"
                error={analyticsError}
              />
              <OverviewKpi
                icon={<Users size={22} />}
                label="Unique visitors"
                value={webAnalytics.loading ? null : webAnalytics.visitors.toLocaleString()}
                tone="green"
                error={analyticsError}
              />
              <OverviewKpi
                icon={<Users size={22} />}
                label="Total users"
                value={loadingOverview || !dbStats ? null : Number(dbStats.total_users || 0).toLocaleString()}
                tone="purple"
                error={overviewError}
              />
              <OverviewKpi
                icon={<FileText size={22} />}
                label="Resumes generated"
                value={loadingOverview || !dbStats ? null : Number(dbStats.total_resumes || 0).toLocaleString()}
                tone="teal"
                error={overviewError}
              />
              <OverviewKpi
                icon={<CreditCard size={22} />}
                label="Revenue"
                value={loadingOverview || !dbStats ? null : `₱${Number(dbStats.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                tone="amber"
                error={overviewError}
              />
              <OverviewKpi
                icon={<AlertCircle size={22} />}
                label="Pending subscriptions"
                value={loadingSubs ? null : pendingCount.toLocaleString()}
                tone="red"
                error={subscriptionError}
              />
            </div>

            {/* NEW OVERVIEW COMPONENTS */}
            <div className="admin-overview-layout">
              
              {/* Left Column: Chart and Leaderboard */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Needs Attention Alert (Only if there are pending subs) */}
                {pendingCount > 0 && (
                  <div className="admin-attention-card">
                    <div className="admin-attention-content">
                      <div className="admin-attention-icon"><AlertCircle size={24} /></div>
                      <div>
                        <h3>Needs attention</h3>
                        <p>You have {pendingCount} pending credit subscription{pendingCount > 1 ? 's' : ''}.</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setActiveTab('subscriptions')} className="admin-secondary-button">Review</button>
                  </div>
                )}

                {/* Growth Chart */}
                <div className="dash-card admin-chart-card">
                  <div className="admin-card-heading">
                    <div className="admin-card-title-group">
                      <TrendingUp size={20} color="#60A5FA" />
                      <div>
                        <h3>Platform growth</h3>
                        <p>Daily signups and resume generations over the last 30 days.</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ height: '300px', width: '100%' }}>
                    {loadingOverview ? (
                      <div className="admin-loading-state"><div className="spinner" /><span>Loading growth data</span></div>
                    ) : overviewError ? (
                      <AdminInlineError message={overviewError} onRetry={refreshOverview} />
                    ) : !dbStats || !hasOverviewActivity ? (
                      <div className="admin-empty-state">No growth activity in the last 30 days.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={overviewChartData}>
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
                          <Legend wrapperStyle={{ color: 'var(--text-muted)', paddingTop: '8px' }} />
                          <Area type="monotone" dataKey="Signups" name="Signups" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorSignups)" />
                          <Area type="monotone" dataKey="Resumes" name="Resumes" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorResumes)" />
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
              <div className="admin-header-row">
                <div>
                  <h1 className="admin-header-title">User management</h1>
                  <p className="admin-header-desc">View platform users and their usage statistics.</p>
                </div>
                <div className="admin-header-actions">
                  <span className="admin-result-count">{filteredUsers.length} matching of {usersList.length} users</span>
                  <button type="button" className="admin-icon-button" onClick={fetchUsersStats} disabled={loadingUsers} aria-label="Refresh users" title="Refresh users">
                    <RefreshCw size={18} className={loadingUsers ? 'spin' : ''} />
                  </button>
                </div>
              </div>
            </div>

            <div className="admin-toolbar">
              <label className="admin-search-field">
                <Search size={17} aria-hidden="true" />
                <span className="sr-only">Search users</span>
                <input
                  type="search"
                  value={userQuery}
                  onChange={event => { setUserQuery(event.target.value); setUserPage(1); }}
                  placeholder="Search name, email, or ID"
                  aria-label="Search users"
                />
              </label>
              <label className="admin-select-field">
                <span>Sort</span>
                <select value={userSort} onChange={event => { setUserSort(event.target.value); setUserPage(1); }} aria-label="Sort users">
                  <option value="newest">Newest first</option>
                  <option value="name">Name</option>
                  <option value="resumes">Most resumes</option>
                  <option value="credits">Most credits</option>
                </select>
              </label>
            </div>

            <div className="dash-card admin-table-card">
              {usersError ? (
                <AdminInlineError message={usersError} onRetry={fetchUsersStats} />
              ) : (
                <div className="admin-table-scroll">
                  <table className="admin-data-table" aria-label="Platform users">
                    <caption className="sr-only">Platform users and usage statistics</caption>
                    <thead>
                      <tr>
                        <th scope="col">Date joined</th>
                        <th scope="col">User</th>
                        <th scope="col" className="hide-on-mobile">Saved profiles</th>
                        <th scope="col">Saved resumes</th>
                        <th scope="col">Credits left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingUsers ? (
                        <tr><td colSpan="5"><div className="admin-loading-state"><div className="spinner" /><span>Loading users</span></div></td></tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="5">
                            <div className="admin-empty-state">
                              <span>{userQuery ? 'No users match your search.' : 'No users found.'}</span>
                              {userQuery && <button type="button" className="admin-text-button" onClick={() => { setUserQuery(''); setUserPage(1); }}>Clear search</button>}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        visibleUsers.map(u => (
                          <tr key={u.id}>
                            <td>{new Date(u.created_at).toLocaleDateString()}</td>
                            <td>
                              <div className="admin-user-name">{u.full_name || 'Unknown user'}</div>
                              <div className="admin-user-email">{u.email || 'Email unavailable'}</div>
                            </td>
                            <td className="hide-on-mobile">{u.total_profiles || 0}</td>
                            <td>{u.total_resumes || 0}</td>
                            <td className="admin-credit-value">{u.credits || 0}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {filteredUsers.length > 0 && !usersError && (
                <div className="admin-pagination">
                  <span>Page {userPage} of {userPageCount}</span>
                  <div>
                    <button type="button" className="admin-pagination-button" onClick={() => setUserPage(page => Math.max(1, page - 1))} disabled={userPage === 1} aria-label="Previous page">
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <button type="button" className="admin-pagination-button" onClick={() => setUserPage(page => Math.min(userPageCount, page + 1))} disabled={userPage === userPageCount} aria-label="Next page">
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        );
      case 'database':
        return <DatabaseStats />;
      case 'jobs':
        return <JobAnalytics />;
      case 'subscriptions':
        return (
          <>
            <div className="admin-header-container">
              <div className="admin-header-row">
                <div>
                  <h1 className="admin-header-title">Credit subscriptions</h1>
                  <p className="admin-header-desc">Review purchases, approve credits, and inspect payment history.</p>
                </div>
                <div className="admin-header-actions">
                  <span className="admin-result-count">{pendingCount} pending</span>
                  <button type="button" className="admin-icon-button" onClick={() => fetchSubscriptions(subscriptionFilter)} disabled={loadingSubs} aria-label="Refresh subscriptions" title="Refresh subscriptions">
                    <RefreshCw size={18} className={loadingSubs ? 'spin' : ''} />
                  </button>
                </div>
              </div>
            </div>

            <div className="admin-toolbar">
              <label className="admin-select-field">
                <span>Status</span>
                <select value={subscriptionFilter} onChange={event => { setSubscriptionFilter(event.target.value); fetchSubscriptions(event.target.value); }} aria-label="Filter subscriptions by status">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All history</option>
                </select>
              </label>
            </div>

            <div className="dash-card admin-table-card">
              {subscriptionError ? (
                <AdminInlineError message={subscriptionError} onRetry={() => fetchSubscriptions(subscriptionFilter)} />
              ) : (
                <div className="admin-table-scroll">
                  <table className="admin-data-table" aria-label="Credit subscriptions">
                    <caption className="sr-only">Credit subscription requests and review actions</caption>
                    <thead>
                      <tr>
                        <th scope="col" className="hide-on-mobile">Date requested</th>
                        <th scope="col" className="hide-on-mobile">User</th>
                        <th scope="col">Payment details</th>
                        <th scope="col" className="hide-on-mobile">Credits</th>
                        <th scope="col">Price (PHP)</th>
                        <th scope="col">Status</th>
                        <th scope="col">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingSubs ? (
                        <tr><td colSpan="7"><div className="admin-loading-state"><div className="spinner" /><span>Loading subscriptions</span></div></td></tr>
                      ) : subscriptions.length === 0 ? (
                        <tr><td colSpan="7"><div className="admin-empty-state">No {subscriptionFilter === 'all' ? '' : `${subscriptionFilter} `}subscriptions found.</div></td></tr>
                      ) : (
                        subscriptions.map(sub => {
                          const isActing = actionLoadingId === sub.id;
                          return (
                            <tr key={sub.id}>
                              <td className="hide-on-mobile">{new Date(sub.created_at).toLocaleDateString()}</td>
                              <td className="hide-on-mobile">
                                <div className="admin-user-name">{sub.full_name || 'Unknown user'}</div>
                                <div className="admin-user-email">{sub.user_email || 'Email unavailable'}</div>
                              </td>
                              <td>
                                <div className="admin-payment-details"><strong>Name</strong> {sub.full_name || 'N/A'}</div>
                                <div className="admin-payment-details"><strong>Mobile</strong> {sub.mobile_number || 'N/A'}</div>
                                <div className="admin-payment-details"><strong>Reference</strong> {sub.reference_number || 'N/A'}</div>
                                {sub.receipt_url && <a className="admin-receipt-link" href={sub.receipt_url} target="_blank" rel="noopener noreferrer">View receipt</a>}
                              </td>
                              <td className="hide-on-mobile">{sub.credits_amount}</td>
                              <td>₱{Number(sub.price_php || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td><span className={`admin-status-badge status-${sub.status}`}>{sub.status}</span></td>
                              <td>
                                {sub.status === 'pending' ? (
                                  <div className="admin-row-actions">
                                    <button type="button" className="admin-approve-button" onClick={() => handleApprove(sub.id)} disabled={isActing}>
                                      <CheckCircle size={14} /> {isActing ? 'Saving' : 'Approve'}
                                    </button>
                                    <button type="button" className="admin-reject-button" onClick={() => handleReject(sub.id)} disabled={isActing}>
                                      <XCircle size={14} /> Reject
                                    </button>
                                  </div>
                                ) : <span className="admin-muted-text">Reviewed</span>}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="shell admin-shell">
      {/* Sidebar / Bottom Nav */}
      <div className="dashboard-sidebar panel" style={{ padding: 0 }}>
        <div className="dashboard-sidebar-header">
          <button
            type="button"
            className="sidebar-profile-card" 
            onClick={() => navigate('/')}
            aria-label="Return to home"
          >
            <div className="dashboard-avatar" style={{ background: 'rgba(96, 165, 250, 0.15)' }}>
              <FileText size={22} color="#60A5FA" />
            </div>
            <div className="dashboard-user-info">
              <h3 className="dashboard-user-name" style={{ 
                fontSize: '16px', 
                fontWeight: '800', 
                background: 'linear-gradient(to right, #60A5FA, #A78BFA)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                letterSpacing: '0.5px'
              }}>
                AI Resume Builder
              </h3>
              <div className="dashboard-user-credits" style={{ color: '#9ca3af', fontSize: '12px' }}>
                Return to Home
              </div>
            </div>
          </button>
        </div>
        
        <div className="dashboard-nav dashboard-padded-section">
          <button 
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`dashboard-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} /> Overview
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`dashboard-nav-item ${activeTab === 'subscriptions' ? 'active' : ''}`}
          >
            <div className="nav-icon-container">
              <CreditCard size={18} />
              <span className="admin-nav-badge mobile-badge" style={{ background: pendingCount > 0 ? '#EF4444' : 'rgba(255,255,255,0.1)' }}>
                {pendingCount}
              </span>
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              Subscriptions
              <span className="admin-nav-badge desktop-badge" style={{ background: pendingCount > 0 ? '#EF4444' : 'rgba(255,255,255,0.1)' }}>
                {pendingCount}
              </span>
            </span>
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('users')}
            className={`dashboard-nav-item ${activeTab === 'users' ? 'active' : ''}`}
          >
            <div className="nav-icon-container">
              <Users size={18} />
              {usersList.length > 0 && (
                <span className="admin-nav-badge mobile-badge" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  {usersList.length}
                </span>
              )}
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              User Management
              {usersList.length > 0 && (
                <span className="admin-nav-badge desktop-badge" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  {usersList.length}
                </span>
              )}
            </span>
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('database')}
            className={`dashboard-nav-item ${activeTab === 'database' ? 'active' : ''}`}
          >
            <Database size={18} /> Database Stats
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className={`dashboard-nav-item ${activeTab === 'jobs' ? 'active' : ''}`}
          >
            <BriefcaseBusiness size={18} /> Job Insights
          </button>
        </div>

        <div className="dashboard-sidebar-footer">
          <button type="button" className="dashboard-signout" onClick={handleSignOut}>
            <LogOut size={18} /> Sign out
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

function getLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function buildDailySeries(signups = [], resumes = [], days = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const points = [];
  const pointByDate = new Map();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const point = {
      date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      Signups: 0,
      Resumes: 0,
      dateKey: getLocalDateKey(date)
    };
    points.push(point);
    pointByDate.set(point.dateKey, point);
  }

  const addRecords = (records, metric) => {
    (Array.isArray(records) ? records : []).forEach(record => {
      const point = pointByDate.get(getLocalDateKey(record?.created_at));
      if (!point) return;
      const amount = Object.prototype.hasOwnProperty.call(record || {}, 'count')
        ? Number(record.count) || 0
        : 1;
      point[metric] += amount;
    });
  };

  addRecords(signups, 'Signups');
  addRecords(resumes, 'Resumes');
  return points;
}

function formatRelativeTime(value) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (elapsedSeconds < 60) return 'just now';
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)}h ago`;
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function OverviewKpi({ icon, label, value, tone, error }) {
  return (
    <div className={`admin-kpi-card tone-${tone}`}>
      <div className="admin-kpi-glow" aria-hidden="true" />
      <div className="admin-kpi-icon">{icon}</div>
      <div className="admin-kpi-content">
        <span className="admin-kpi-label">{label}</span>
        <strong className="admin-kpi-value">
          {error ? '—' : value === null ? <span className="spinner" aria-label="Loading" /> : value}
        </strong>
        {error && <span className="admin-kpi-error">Unavailable</span>}
      </div>
    </div>
  );
}

function AdminInlineError({ message, onRetry }) {
  return (
    <div className="admin-inline-error" role="alert">
      <span>{message}</span>
      <button type="button" className="admin-text-button" onClick={onRetry}>Retry</button>
    </div>
  );
}
