import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { Users, FileText, CreditCard, DollarSign } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function DatabaseStats() {
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  
  // KPI state
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalResumes, setTotalResumes] = useState(0);
  const [totalCreditsSold, setTotalCreditsSold] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  
  // Chart data state
  const [resumesOverTime, setResumesOverTime] = useState([]);
  const [signupsOverTime, setSignupsOverTime] = useState([]);

  useEffect(() => {
    fetchDatabaseStats();
  }, []);

  const fetchDatabaseStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_database_stats');
      if (error) throw error;

      if (data) {
        setTotalUsers(data.total_users || 0);
        setTotalResumes(data.total_resumes || 0);
        setTotalRevenue(data.total_revenue || 0);
        setTotalCreditsSold(data.total_credits_sold || 0);

        // Format dates and bucket missing days
        setSignupsOverTime(bucketDataByDate(data.signups_over_time || [], 30));
        setResumesOverTime(bucketDataByDate(data.resumes_over_time || [], 30));
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      addToast('Failed to load database statistics', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper to group records by 'MMM DD' format for the charts
  const bucketDataByDate = (records, days) => {
    const bucket = {};
    // Pre-fill last N days so empty days show 0
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      bucket[dateStr] = 0;
    }

    records?.forEach(record => {
      if (!record.created_at) return;
      const d = new Date(record.created_at);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (bucket[dateStr] !== undefined) {
        bucket[dateStr] += 1;
      }
    });

    return Object.keys(bucket).map(dateStr => ({
      name: dateStr,
      count: bucket[dateStr]
    }));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px' }}>
        <div className="spinner" style={{ width: '32px', height: '32px', marginBottom: '16px' }}></div>
        <div style={{ color: 'var(--text-muted)' }}>Analyzing Database Metrics...</div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="admin-header-container" style={{ marginBottom: '32px' }}>
        <h2 className="admin-header-title">Database Stats & Analytics</h2>
        <p className="admin-header-desc">Real-time usage metrics and system health indicators.</p>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '24px', 
        marginBottom: '40px' 
      }}>
        <KpiCard icon={<Users size={24} />} title="Total Users" value={totalUsers.toLocaleString()} color="#3B82F6" />
        <KpiCard icon={<FileText size={24} />} title="Resumes Generated" value={totalResumes.toLocaleString()} color="#10B981" />
        <KpiCard icon={<CreditCard size={24} />} title="Credits Sold" value={totalCreditsSold.toLocaleString()} color="#A855F7" />
        <KpiCard icon={<DollarSign size={24} />} title="Total Revenue" value={`₱${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="#F59E0B" />
      </div>

      {/* Charts Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '24px' 
      }}>
        {/* Resumes Over Time Chart */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF', marginBottom: '24px' }}>
            Resumes Generated (Last 30 Days)
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <LineChart data={resumesOverTime} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#10B981', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="count" name="Resumes" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#10B981', stroke: '#0F172A', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Signups Over Time Chart */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF', marginBottom: '24px' }}>
            New User Signups (Last 30 Days)
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <BarChart data={signupsOverTime} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#3B82F6', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" name="New Users" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Spacer */}
      <div style={{ height: '100px', flexShrink: 0, width: '100%' }} />
    </div>
  );
}

// Sub-component for KPI Card
function KpiCard({ icon, title, value, color }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Soft Glow */}
      <div style={{
        position: 'absolute',
        top: '-20px', right: '-20px',
        width: '100px', height: '100px',
        background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
        borderRadius: '50%'
      }} />

      <div style={{
        background: `${color}15`,
        color: color,
        padding: '12px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${color}30`
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '4px' }}>
          {title}
        </div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
          {value}
        </div>
      </div>
    </div>
  );
}
