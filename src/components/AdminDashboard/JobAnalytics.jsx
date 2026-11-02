import React, { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, ClipboardList, RefreshCw, SearchCheck, Sparkles } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '../../utils/supabaseClient';
import { useToast } from '../../context/ToastContext';
import CustomSelect from '../CustomSelect';
import './JobAnalytics.css';

export default function JobAnalytics() {
  const { addToast } = useToast();
  const [rangeDays, setRangeDays] = useState(30);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  useEffect(() => {
    fetchStats(rangeDays);
  }, [rangeDays]);

  const jobsOverTime = useMemo(() => buildDailySeries(stats?.jobs_over_time, rangeDays), [stats, rangeDays]);
  const applicationsOverTime = useMemo(() => buildDailySeries(stats?.applications_over_time, rangeDays), [stats, rangeDays]);
  const statusBreakdown = Array.isArray(stats?.status_breakdown) ? stats.status_breakdown : [];
  const sourceBreakdown = Array.isArray(stats?.source_breakdown) ? stats.source_breakdown : [];
  const categoryBreakdown = Array.isArray(stats?.category_breakdown) ? stats.category_breakdown : [];
  const recentJobs = Array.isArray(stats?.recent_jobs) ? stats.recent_jobs : [];

  const fetchStats = async days => {
    setLoading(true);
    setError('');
    const { data, error: statsError } = await supabase.rpc('get_job_admin_stats', { p_days: days });
    if (statsError) {
      console.error('Failed to load job analytics:', statsError);
      setStats(null);
      setError("Job insights are temporarily unavailable. Please try again shortly.");
      addToast('Could not load job analytics.', 'error');
    } else {
      setStats(data || null);
      setLastRefreshedAt(new Date());
    }
    setLoading(false);
  };

  return (
    <div className="job-analytics-page">
      <div className="admin-header-container">
        <div className="admin-header-row">
          <div>
            <h2 className="admin-header-title">Job insights</h2>
            <p className="admin-header-desc">Monitor job inventory and how users move roles through their tracker.</p>
          </div>
          <div className="admin-header-actions">
            <span className="admin-last-refreshed">
              {lastRefreshedAt ? `Updated ${lastRefreshedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : 'Not refreshed'}
            </span>
            <label className="admin-select-field">
              <span>Range</span>
              <CustomSelect
                value={rangeDays}
                onChange={setRangeDays}
                ariaLabel="Job analytics date range"
                options={[
                  { value: 7, label: '7 days' },
                  { value: 30, label: '30 days' },
                  { value: 90, label: '90 days' }
                ]}
              />
            </label>
            <button type="button" className="admin-icon-button" onClick={() => fetchStats(rangeDays)} disabled={loading} aria-label="Refresh job analytics" title="Refresh job analytics">
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="admin-inline-error" role="alert">
          <span>{error}</span>
          <button type="button" className="admin-text-button" onClick={() => fetchStats(rangeDays)}>Retry</button>
        </div>
      )}

      <div className="job-admin-kpi-grid">
        <JobKpi icon={<BriefcaseBusiness size={20} />} label="Total jobs" value={stats?.total_jobs} tone="blue" loading={loading} />
        <JobKpi icon={<Sparkles size={20} />} label="Active jobs" value={stats?.active_jobs} tone="green" loading={loading} />
        <JobKpi icon={<ClipboardList size={20} />} label="Tracked applications" value={stats?.tracked_applications} tone="purple" loading={loading} />
        <JobKpi icon={<SearchCheck size={20} />} label="Applications in progress" value={stats?.applied_applications} tone="amber" loading={loading} />
      </div>

      <div className="job-admin-chart-grid">
        <JobChart title={`Jobs added in last ${rangeDays} days`} data={jobsOverTime} color="#60a5fa" />
        <JobChart title={`Applications tracked in last ${rangeDays} days`} data={applicationsOverTime} color="#34d399" />
      </div>

      <div className="job-admin-breakdown-grid">
        <Breakdown title="Application status" items={statusBreakdown} labelKey="status" />
        <Breakdown title="Active job sources" items={sourceBreakdown} labelKey="source" />
        <Breakdown title="Active job niches" items={categoryBreakdown} labelKey="category" />
      </div>

      <div className="dash-card job-admin-recent-card">
        <div className="job-admin-section-heading">
          <div>
            <h3>Recently imported jobs</h3>
            <p>Latest records available to job seekers.</p>
          </div>
        </div>
        {loading ? (
          <div className="admin-loading-state"><div className="spinner" /><span>Loading job activity</span></div>
        ) : recentJobs.length === 0 ? (
          <div className="admin-empty-state">No job records yet.</div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-data-table" aria-label="Recently imported jobs">
              <thead>
                <tr>
                  <th scope="col">Role</th>
                  <th scope="col">Company</th>
                  <th scope="col">Source</th>
                  <th scope="col">Niche</th>
                  <th scope="col">Imported</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map(job => (
                  <tr key={job.id}>
                    <td className="admin-user-name">{job.title}</td>
                    <td>{job.company || 'Not listed'}</td>
                    <td>{formatSource(job.source)}</td>
                    <td>{job.category || 'Other'}</td>
                    <td>{formatDate(job.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ height: '100px', flexShrink: 0, width: '100%' }} />
    </div>
  );
}

function JobKpi({ icon, label, value, tone, loading }) {
  return (
    <div className={`job-admin-kpi tone-${tone}`}>
      <div className="job-admin-kpi-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{loading ? <span className="spinner" aria-label="Loading" /> : Number(value || 0).toLocaleString()}</strong>
      </div>
    </div>
  );
}

function JobChart({ title, data, color }) {
  return (
    <div className="dash-card job-admin-chart-card">
      <h3>{title}</h3>
      <div className="job-admin-chart">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id={`job-chart-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" fontSize={11} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.4)" fontSize={11} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="count" stroke={color} fill={`url(#job-chart-${color.slice(1)})`} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Breakdown({ title, items, labelKey }) {
  return (
    <div className="dash-card job-admin-breakdown-card">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="job-admin-muted">No data yet.</p>
      ) : (
        <div className="job-admin-breakdown-list">
          {items.map(item => (
            <div className="job-admin-breakdown-row" key={item[labelKey]}>
              <span>{formatSource(item[labelKey])}</span>
              <strong>{Number(item.count || 0).toLocaleString()}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function buildDailySeries(records = [], days = 30) {
  const points = [];
  const countsByDate = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    countsByDate.set(key, 0);
    points.push({ key, label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), count: 0 });
  }

  (Array.isArray(records) ? records : []).forEach(record => {
    const key = String(record?.day || record?.created_at || '').slice(0, 10);
    if (countsByDate.has(key)) countsByDate.set(key, countsByDate.get(key) + Number(record.count || 0));
  });

  return points.map(point => ({ ...point, count: countsByDate.get(point.key) || 0 }));
}

function formatSource(source) {
  if (!source) return 'Not listed';
  if (source.toLowerCase() === 'onlinejobs.ph') return 'OnlineJobs.ph';
  return source.replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'Not listed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not listed';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
