import React, { useState } from 'react';
import { parseProfileText } from '../utils/parseProfileText';

export default function EditorPanel({ profileText, setProfileText, jobDescription, setJobDescription, onGenerate, isLoading, status, onOpenDashboard }) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [initialEditProfileText, setInitialEditProfileText] = useState('');

  const handleEditToggle = () => {
    if (isEditingProfile) {
      setIsEditingProfile(false);
    } else {
      setInitialEditProfileText(profileText);
      setIsEditingProfile(true);
    }
  };

  const hasProfileChanged = profileText !== initialEditProfileText;

  const parsedProfile = profileText ? parseProfileText(profileText) : null;

  return (
    <div className="panel">
      <div className="mobile-order-2" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        <div className="step-header" style={{ gap: '16px', marginBottom: '24px' }}>
          <div style={{ 
            background: 'rgba(59, 130, 246, 0.1)', 
            color: '#60A5FA', 
            padding: '4px 10px', 
            borderRadius: '100px', 
            fontSize: '11px', 
            fontWeight: '700', 
            letterSpacing: '0.05em', 
            border: '1px solid rgba(59, 130, 246, 0.2)',
            display: 'inline-block',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            STEP 1
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500', lineHeight: '1.4' }}>Select a profile to use and paste the job description.</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '16px' }}>
          <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af', fontWeight: 600, margin: 0, whiteSpace: 'nowrap' }}>
            Active Profile
          </label>
          
          {!profileText ? (
            <button 
              onClick={() => onOpenDashboard && onOpenDashboard('settings')}
              style={{ 
                padding: '6px 12px', 
                fontSize: '11px', 
                background: '#3b82f6', 
                color: '#fff', 
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                width: 'fit-content',
                flexShrink: 0
              }}
            >
              Load a Profile
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button 
                onClick={() => onOpenDashboard && onOpenDashboard('settings')}
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '11px', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  color: '#60a5fa', 
                  transition: 'all 0.2s ease', 
                  textAlign: 'center',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.2)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.1)'}
              >
                Load Other
              </button>
              <button 
                onClick={handleEditToggle}
                style={{ 
                  minWidth: '54px', 
                  padding: '5px 10px', 
                  fontSize: '11px', 
                  background: isEditingProfile ? (hasProfileChanged ? '#10B981' : 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.1)', 
                  color: '#fff', 
                  transition: 'all 0.3s ease', 
                  textAlign: 'center',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {isEditingProfile ? (hasProfileChanged ? 'Save' : 'Cancel') : 'Edit'}
              </button>
            </div>
          )}
        </div>

        <div className="profile-chip">
          {!profileText ? (
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>
              No profile loaded.
            </div>
          ) : (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {parsedProfile?.personal?.name || 'My Profile'}
                </div>
                {parsedProfile?.headline && (
                  <div style={{ fontSize: '13px', color: '#d1d5db', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                    {parsedProfile.headline}
                  </div>
                )}
              </div>
              {isEditingProfile && (
                <div style={{ marginTop: '12px' }}>
                  <textarea 
                    className="no-scrollbar"
                    style={{ minHeight: '200px', fontSize: '12px', width: '100%', padding: '10px' }}
                    value={profileText} 
                    onChange={(e) => setProfileText(e.target.value)}
                    placeholder="Paste your resume or LinkedIn profile here..."
                  />
                </div>
              )}
            </>
          )}
        </div>

      <label htmlFor="jd" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af', marginBottom: '12px', fontWeight: 600, display: 'block' }}>
        Job Description
      </label>
      <textarea 
        id="jd" 
        className="no-scrollbar"
        placeholder="Paste the full job posting here — title, responsibilities, requirements..."
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />
      </div>
      <div className="mobile-order-5" style={{ textAlign: 'center', marginTop: 'auto', paddingTop: '20px', fontSize: '13px', color: 'var(--text-muted)', opacity: 0.7, fontWeight: 300, letterSpacing: '0.5px' }}>
        Made by Renthel Automations
      </div>
    </div>
  );
}
