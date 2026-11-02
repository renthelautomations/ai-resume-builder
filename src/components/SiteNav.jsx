import React from 'react';
import { BriefcaseBusiness, LayoutDashboard, UserCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SiteNav({ userAvatar, onSignIn }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isRemoteJobsActive = location.pathname === '/remote-jobs';
  const isBuilderActive = !isRemoteJobsActive && !location.pathname.startsWith('/admin');
  const avatar = userAvatar
    || user?.user_metadata?.avatar_url
    || user?.user_metadata?.picture;

  return (
    <nav className="top-nav" aria-label="Primary navigation">
      <Link to="/" className="nav-logo cursor-pointer" aria-label="AI Resume Builder home">
        <img src="/favicon.png" alt="" aria-hidden="true" style={{ width: '24px', height: '24px' }} />
      </Link>

      <div className="nav-primary">
        <Link
          to="/"
          className={`nav-primary-link ${isBuilderActive ? 'active' : ''}`}
          aria-current={isBuilderActive ? 'page' : undefined}
        >
          <span className="desktop-nav-label">AI Resume Builder</span>
          <span className="mobile-nav-label">Resume Builder</span>
        </Link>
        <Link
          to="/remote-jobs"
          className={`nav-primary-link ${isRemoteJobsActive ? 'active' : ''}`}
          aria-current={isRemoteJobsActive ? 'page' : undefined}
        >
          <BriefcaseBusiness size={16} aria-hidden="true" />
          <span className="desktop-nav-label">Find Remote Jobs</span>
          <span className="mobile-nav-label">Remote Jobs</span>
        </Link>
      </div>

      <div className="nav-actions">
        {user ? (
          <>
            {isAdmin && (
              <Link to="/admin/dashboard" className="nav-link">
                <LayoutDashboard size={16} aria-hidden="true" />
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={() => navigate('/contactcard')}
              className="nav-profile-btn"
            >
              {avatar ? (
                <img src={avatar} alt="Profile" className="nav-avatar" />
              ) : (
                <span className="nav-avatar fallback" aria-hidden="true">
                  <UserCircle size={20} />
                </span>
              )}
              <span className="font-medium nav-profile-text">Profile</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onSignIn || (() => navigate('/'))}
            className="nav-btn primary"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
