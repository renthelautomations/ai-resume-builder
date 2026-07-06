import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { User, CreditCard, Settings as SettingsIcon, LogOut, X, FileText, UserCircle } from 'lucide-react';
import ProfileTab from './ProfileTab';
import CreditsTab from './CreditsTab';
import SettingsTab from './SettingsTab';
import UserResumes from './UserResumes';
import './UserDashboard.css';

export default function UserDashboard({ onClose, onProfileSelect, onSelectResume, userAvatar, onAvatarUpdate, initialTab = 'profile' }) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchCredits = async () => {
      let { data, error } = await supabase.from('profiles').select('credits').eq('id', user.id).maybeSingle();
      if (!data && !error) {
        await supabase.from('profiles').insert([{ id: user.id }]);
        data = { credits: 0 };
      }
      if (data) setCredits(data.credits || 0);
    };
    fetchCredits();
  }, [user]);

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab user={user} onAvatarUpdate={onAvatarUpdate} />;
      case 'credits':
        return <CreditsTab user={user} />;
      case 'settings':
        return <SettingsTab user={user} onProfileSelect={onProfileSelect} />;
      case 'resumes':
        return <UserResumes user={user} onSelectResume={onSelectResume} />;
      default:
        return null;
    }
  };

  return (
    <div className="shell">
      
      {/* Sidebar */}
      <div className="panel" style={{ padding: 0 }}>
          <div className="dashboard-sidebar-header">
            <div className="sidebar-profile-card">
              <div className="dashboard-avatar">
                {userAvatar ? (
                  <img src={userAvatar} alt="Avatar" />
                ) : (
                  <UserCircle size={24} color="#9ca3af" />
                )}
              </div>
              <div className="dashboard-user-info">
                <h3 className="dashboard-user-name">{displayName}</h3>
                <div className="dashboard-user-credits">
                  <span style={{ fontSize: '12px' }}>⚡</span> {credits} Credits
                </div>
              </div>
            </div>
          </div>
          
          <div className="dashboard-nav">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`dashboard-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            >
              <User size={18} /> My Profile
            </button>
            <button 
              onClick={() => setActiveTab('resumes')}
              className={`dashboard-nav-item ${activeTab === 'resumes' ? 'active' : ''}`}
            >
              <FileText size={18} /> Saved Resumes
            </button>
            <button 
              onClick={() => setActiveTab('credits')}
              className={`dashboard-nav-item ${activeTab === 'credits' ? 'active' : ''}`}
            >
              <CreditCard size={18} /> Credits
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`dashboard-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            >
              <SettingsIcon size={18} /> Settings
            </button>
          </div>
          
          <div style={{ padding: '16px 40px', borderTop: '1px solid var(--border)' }}>
            <button 
              onClick={handleSignOut}
              className="dashboard-nav-item"
              style={{ color: '#ef4444' }}
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>
      {/* Content Area */}
      <div className="panel" style={{ position: 'relative', overflowY: 'auto', padding: '24px 40px', background: 'transparent' }}>
          {renderContent()}
        </div>
        
      </div>
  );
}