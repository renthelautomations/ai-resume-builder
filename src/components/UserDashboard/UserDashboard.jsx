import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { User, CreditCard, Settings as SettingsIcon, LogOut, X, FileText, UserCircle } from 'lucide-react';
import ProfileTab from './ProfileTab';
import CreditsTab from './CreditsTab';
import SettingsTab from './SettingsTab';
import UserResumes from './UserResumes';
import WelcomeModal from './WelcomeModal';
import ConfirmationModal from '../ConfirmationModal';
import './UserDashboard.css';

export default function UserDashboard({ onClose, onProfileSelect, onSelectResume, userAvatar, onAvatarUpdate }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const path = location.pathname;
  let activeTab = 'profile';
  if (path === '/loadprofile') activeTab = 'settings';
  else if (path === '/savedresumes') activeTab = 'resumes';
  else if (path === '/credits') activeTab = 'credits';

  const [credits, setCredits] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchCredits = async () => {
      let { data, error } = await supabase.from('profiles').select('credits, has_received_welcome_credits').eq('id', user.id).maybeSingle();
      if (!data && !error) {
        await supabase.from('profiles').insert([{ id: user.id }]);
        data = { credits: 0, has_received_welcome_credits: false };
      }
      if (data) {
        setCredits(data.credits || 0);
        if (data.has_received_welcome_credits === false) {
          setShowWelcome(true);
        }
      }
    };
    fetchCredits();
  }, [user]);

  const handleClaimed = () => {
    setShowWelcome(false);
    setCredits(prev => prev + 2);
  };

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;

  const handleSignOutClick = () => {
    setShowSignOutModal(true);
  };

  const confirmSignOut = async () => {
    await signOut();
    setShowSignOutModal(false);
    onClose();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab user={user} onAvatarUpdate={onAvatarUpdate} onSwitchTab={(tab) => {
          if (tab === 'settings') navigate('/loadprofile');
          else if (tab === 'resumes') navigate('/savedresumes');
          else if (tab === 'credits') navigate('/credits');
          else navigate('/contactcard');
        }} />;
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
      {showWelcome && <WelcomeModal user={user} onClaimed={handleClaimed} />}
      
      {/* Sidebar / Bottom Nav */}
      <div className="dashboard-sidebar panel" style={{ padding: 0 }}>

          <div className="dashboard-nav dashboard-padded-section">
            <button 
              onClick={() => navigate('/contactcard')}
              className={`dashboard-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            >
              <User size={18} /> Contact Card
            </button>
            <button 
              onClick={() => navigate('/loadprofile')}
              className={`dashboard-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            >
              <SettingsIcon size={18} /> Load Profile
            </button>
            <button 
              onClick={() => navigate('/savedresumes')}
              className={`dashboard-nav-item ${activeTab === 'resumes' ? 'active' : ''}`}
            >
              <FileText size={18} /> Saved Resumes
            </button>
            <button 
              onClick={() => navigate('/credits')}
              className={`dashboard-nav-item ${activeTab === 'credits' ? 'active' : ''}`}
            >
              <CreditCard size={18} /> Credits
            </button>
          </div>
          
          <div className="dashboard-signout dashboard-padded-section" style={{ borderTop: '1px solid var(--border)' }}>
            <button 
              onClick={handleSignOutClick}
              className="dashboard-nav-item"
              style={{ color: '#ef4444' }}
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>
      {/* Content Area */}
      <div className="dashboard-content-area dashboard-padded-section panel" style={{ position: 'relative', overflowY: 'auto', background: 'transparent' }}>
          {renderContent()}
        </div>
        
        <ConfirmationModal
          isOpen={showSignOutModal}
          title="Sign Out"
          message="Are you sure you want to sign out?"
          confirmText="Sign Out"
          cancelText="Cancel"
          onConfirm={confirmSignOut}
          onCancel={() => setShowSignOutModal(false)}
          type="info"
        />
      </div>
  );
}