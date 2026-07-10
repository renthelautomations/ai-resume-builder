import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { CheckCircle2, UserCircle, Plus, X, ArrowRight, Edit2, Search, Copy, Check, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { parseProfileText } from '../../utils/parseProfileText';
import { PROFILE_GENERATION_PROMPT } from '../../utils/prompts';
import StructuredProfileView from './StructuredProfileView';
import ConfirmationModal from '../ConfirmationModal';
import './SettingsTab.css';

export default function SettingsTab({ user, onProfileSelect }) {
  const { addToast } = useToast();
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [isCopied, setIsCopied] = useState(false);
  const [newRawText, setNewRawText] = useState('');
  
  const [profileToSetActive, setProfileToSetActive] = useState(null);
  const [profileToDelete, setProfileToDelete] = useState(null);
  
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editRawText, setEditRawText] = useState('');
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchSettings = async () => {
      let [userDataRes, profilesDataRes] = await Promise.all([
        supabase.from('profiles').select('active_profile_id').eq('id', user.id).maybeSingle(),
        supabase.from('user_profiles').select('id, profile_name, avatar_url, raw_text, parsed_data').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);

      // If user row is missing from profiles table, create it now to prevent foreign key constraint errors
      if (!userDataRes.data && !userDataRes.error) {
        await supabase.from('profiles').insert([{ id: user.id }]);
        userDataRes = await supabase.from('profiles').select('active_profile_id').eq('id', user.id).maybeSingle();
      }

      if (userDataRes.data) setActiveProfileId(userDataRes.data.active_profile_id);
      if (profilesDataRes.data) setProfiles(profilesDataRes.data);
      
      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  const handleSelectProfile = (profile) => {
    setProfileToSetActive(profile);
  };

  const confirmSetActiveProfile = async () => {
    if (!profileToSetActive) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ active_profile_id: profileToSetActive.id })
      .eq('id', user.id);
    
    setActiveProfileId(profileToSetActive.id);
    if (onProfileSelect) onProfileSelect(profileToSetActive);
    addToast('Active profile updated', 'success');
    
    setProfileToSetActive(null);
    setSaving(false);
  };

  const handleAddNewProfile = async () => {
    if (!newRawText.trim()) return;
    setSaving(true);
    
    const parsedData = parseProfileText(newRawText);
    const newProfileName = parsedData?.personal?.name || 'New Profile';
    
    const { data: newProfile, error } = await supabase
      .from('user_profiles')
      .insert([{
        user_id: user.id,
        profile_name: newProfileName,
        raw_text: newRawText,
        parsed_data: parsedData
      }])
      .select()
      .single();

    if (error) {
      addToast('Error saving profile', 'error');
    } else {
      setProfiles([newProfile, ...profiles]);
      addToast('Profile added successfully!', 'success');
      
      // If this is the first profile, automatically set it as active
      if (profiles.length === 0) {
        await supabase
          .from('profiles')
          .update({ active_profile_id: newProfile.id })
          .eq('id', user.id);
        
        setActiveProfileId(newProfile.id);
        if (onProfileSelect) onProfileSelect(newProfile);
        addToast('Profile set as active by default!', 'success');
      }
      
      setShowAddModal(false);
      setNewRawText('');
      setAddStep(1);
    }
    setSaving(false);
  };

  const handleUpdateProfile = async () => {
    if (!editRawText.trim()) return;
    setSaving(true);
    
    const parsedData = parseProfileText(editRawText);
    const updatedName = parsedData?.personal?.name || selectedProfile.profile_name;
    
    const { error } = await supabase
      .from('user_profiles')
      .update({
        profile_name: updatedName,
        raw_text: editRawText,
        parsed_data: parsedData
      })
      .eq('id', selectedProfile.id);

    if (error) {
      addToast('Error updating profile', 'error');
    } else {
      const updatedProfile = { ...selectedProfile, profile_name: updatedName, raw_text: editRawText, parsed_data: parsedData };
      setSelectedProfile(updatedProfile);
      setProfiles(profiles.map(p => p.id === selectedProfile.id ? updatedProfile : p));
      addToast('Profile updated successfully!', 'success');
      setIsEditing(false);
      
      if (activeProfileId === selectedProfile.id && onProfileSelect) {
         onProfileSelect(updatedProfile);
      }
    }
    setSaving(false);
  };

  // Close modals on clicking overlay
  const handleOverlayClick = (e, closeModal) => {
    if (e.target && typeof e.target.className === 'string' && e.target.className.includes('modal-overlay')) {
      closeModal();
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(PROFILE_GENERATION_PROMPT);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', gap: '12px' }}>
        <div className="spinner"></div> Loading settings...
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div style={{ marginBottom: '24px' }}>
        <div className="settings-header" style={{ marginBottom: '4px' }}>
          <h2 className="settings-title" style={{ marginBottom: '0' }}>Load Profile</h2>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-add-profile"
          >
            <Plus size={18} /> Add Profile
          </button>
        </div>
        <p className="settings-subtitle">Manage your profiles and set your active profile.</p>
      </div>

      {profiles.length === 0 ? (
        <div style={{ color: 'var(--text-muted)' }}>For new users, you can add a profile by clicking the "Add Profile" button and following the instructions.</div>
      ) : (
        <div className="profiles-grid">
          {profiles.map(profile => {
            const isActive = profile.id === activeProfileId;
            
            return (
              <div 
                key={profile.id}
                className={`profile-item ${isActive ? 'active' : ''}`}
              >
                <div 
                  onClick={() => { setSelectedProfile(profile); setIsEditing(false); setShowViewModal(true); }}
                  className="profile-item-header"
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="profile-avatar" />
                  ) : (
                    <div className="profile-avatar-fallback">
                      <UserCircle size={28} color="#9ca3af" />
                    </div>
                  )}
                  <div className="profile-info">
                    <div className="profile-name">
                      {profile.profile_name || 'Unnamed Profile'}
                      <Search size={14} color="#6b7280" />
                    </div>
                    <div className="profile-summary">
                      {profile.parsed_data?.summary || 'No summary available.'}
                    </div>
                  </div>
                </div>
                
                <div className="profile-actions">
                  {isActive ? (
                    <div className="active-badge">
                      <CheckCircle2 size={16} /> Active
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleSelectProfile(profile)}
                      className="btn-set-active"
                    >
                      Set Active
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Profile Modal */}
      {showAddModal && (
        <div 
          className="modal-overlay"
          onClick={(e) => handleOverlayClick(e, () => { setShowAddModal(false); setAddStep(1); })}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div className="animate-in zoom-in-95 duration-200" style={{ background: '#0B0E14', border: '1px solid #1f2937', borderRadius: '16px', width: '800px', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0, flex: 1, paddingRight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Add New Profile
              </h3>
              <button onClick={() => { setShowAddModal(false); setAddStep(1); }} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', flexShrink: 0, padding: '4px', width: 'fit-content' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '24px 24px 0 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: addStep === 1 ? '#3b82f6' : '#10b981', transition: 'all 0.3s ease' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: addStep === 1 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)', border: `1px solid ${addStep === 1 ? '#3b82f6' : '#10b981'}`, color: addStep === 1 ? '#3b82f6' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.3s ease' }}>
                    {addStep === 2 ? <Check size={16} /> : '1'}
                  </div>
                  <span style={{ fontWeight: '600', fontSize: '15px' }}>Generate Profile</span>
                </div>
                
                <div style={{ flex: 1, height: '1px', background: addStep === 2 ? '#10b981' : '#374151', margin: '0 16px', transition: 'background 0.3s ease' }} />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: addStep === 2 ? '#3b82f6' : '#6b7280', transition: 'all 0.3s ease' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: addStep === 2 ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: `1px solid ${addStep === 2 ? '#3b82f6' : '#374151'}`, color: addStep === 2 ? '#3b82f6' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.3s ease' }}>
                    2
                  </div>
                  <span style={{ fontWeight: '600', fontSize: '15px' }}>Paste & Save</span>
                </div>
              </div>
            </div>
            
            <div className="no-scrollbar" style={{ padding: '24px', overflowY: 'auto' }}>
              {addStep === 1 ? (
                <>
                  <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                    <p style={{ fontSize: '14px', color: '#d1d5db', margin: 0, lineHeight: '1.7' }}>
                      <strong style={{ color: '#3b82f6' }}>1.</strong> Copy the prompt below.<br/>
                      <strong style={{ color: '#3b82f6' }}>2.</strong> Go to <a href="https://chatgpt.com" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: '500' }}>ChatGPT</a> (opens in a new tab), upload your resume(s), paste the prompt, and click Send.<br/>
                      <strong style={{ color: '#3b82f6' }}>3.</strong> Copy the generated profile and paste it in the next step.
                    </p>
                  </div>
                  
                  <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <textarea 
                      className="dash-textarea no-scrollbar"
                      readOnly
                      style={{ minHeight: '300px', width: '100%', background: '#111827', color: '#9ca3af', fontSize: '13px', padding: '16px', lineHeight: '1.6' }}
                      value={PROFILE_GENERATION_PROMPT}
                    ></textarea>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                    <p style={{ fontSize: '14px', color: '#d1d5db', margin: 0, lineHeight: '1.7' }}>
                      <strong style={{ color: '#10b981' }}>Great!</strong> Now just paste the final profile text you received from ChatGPT into the box below.
                    </p>
                  </div>
                  <textarea 
                    className="dash-textarea no-scrollbar"
                    style={{ minHeight: '300px', width: '100%', background: '#111827', fontSize: '13px', padding: '16px', lineHeight: '1.6' }}
                    placeholder="PERSONAL: Name | Email..."
                    value={newRawText}
                    onChange={(e) => setNewRawText(e.target.value)}
                  ></textarea>
                </>
              )}
            </div>
            
            <div style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
              {addStep === 1 ? (
                <>
                  <button 
                    onClick={() => { setShowAddModal(false); setAddStep(1); }}
                    style={{ padding: '12px 24px', fontSize: '16px', background: 'transparent', color: 'white', borderRadius: '8px', border: '1px solid #374151', cursor: 'pointer', whiteSpace: 'nowrap', width: 'fit-content' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCopyPrompt}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '16px', background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}
                  >
                    {isCopied ? <><Check size={18} color="#10b981" /> Copied!</> : <><Copy size={18} /> Copy Prompt</>}
                  </button>
                  <button 
                    onClick={() => setAddStep(2)}
                    className="dash-btn primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 32px', fontSize: '16px', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', width: 'fit-content' }}
                  >
                    Next <ArrowRight size={20} />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setAddStep(1)}
                    style={{ padding: '12px 24px', fontSize: '16px', background: 'transparent', color: 'white', borderRadius: '8px', border: '1px solid #374151', cursor: 'pointer', whiteSpace: 'nowrap', width: 'fit-content' }}
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => {
                      handleAddNewProfile();
                    }}
                    disabled={saving || !newRawText.trim()}
                    className="dash-btn primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 32px', fontSize: '16px', background: '#10b981', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', opacity: saving || !newRawText.trim() ? 0.7 : 1, whiteSpace: 'nowrap', width: 'fit-content' }}
                  >
                    {saving ? 'Saving...' : 'Save Profile'} <CheckCircle2 size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View/Edit Profile Modal */}
      {showViewModal && selectedProfile && (
        <div 
          className="modal-overlay"
          onClick={(e) => handleOverlayClick(e, () => setShowViewModal(false))}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div className="animate-in zoom-in-95 duration-200" style={{ background: '#0B0E14', border: '1px solid #1f2937', borderRadius: '16px', width: '800px', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0, flex: 1, paddingRight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isEditing ? `Edit: ${selectedProfile.profile_name}` : selectedProfile.profile_name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                {!isEditing && (
                  <>
                    <button 
                      onClick={() => {
                        setProfileToDelete(selectedProfile);
                        setShowDeleteModal(true);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid #ef4444', padding: '6px 12px', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}
                    >
                      Delete
                    </button>
                    <button 
                      onClick={() => { setEditRawText(selectedProfile.raw_text); setIsEditing(true); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid #374151', padding: '6px 12px', borderRadius: '6px', color: '#d1d5db', cursor: 'pointer', fontSize: '14px' }}
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                  </>
                )}
                <button onClick={() => setShowViewModal(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px', flexShrink: 0, width: 'fit-content' }}>
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="no-scrollbar" style={{ padding: '24px', overflowY: 'auto' }}>
              {isEditing ? (
                <>
                  <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '16px' }}>Update your raw profile text. We will re-parse it when you save.</p>
                  <textarea 
                    className="dash-textarea no-scrollbar"
                    style={{ minHeight: '400px', width: '100%', background: '#111827' }}
                    value={editRawText}
                    onChange={(e) => setEditRawText(e.target.value)}
                  ></textarea>
                </>
              ) : (
                <StructuredProfileView profileData={selectedProfile.parsed_data || {}} />
              )}
            </div>
            
            {isEditing && (
              <div style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  onClick={() => { setIsEditing(false); setEditRawText(''); }}
                  style={{ padding: '12px 24px', fontSize: '16px', background: 'transparent', color: 'white', borderRadius: '8px', border: '1px solid #374151', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateProfile}
                  disabled={saving || !editRawText.trim() || editRawText === selectedProfile.raw_text}
                  className="dash-btn primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 32px', fontSize: '16px', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', opacity: saving || !editRawText.trim() || editRawText === selectedProfile.raw_text ? 0.7 : 1 }}
                >
                  {saving ? 'Saving...' : 'Save Changes'} <ArrowRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Set Active Modal */}
      {profileToSetActive && (
        <div 
          className="modal-overlay"
          onClick={(e) => handleOverlayClick(e, () => setProfileToSetActive(null))}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div className="animate-in zoom-in-95 duration-200" style={{ background: '#0B0E14', border: '1px solid #1f2937', borderRadius: '16px', width: '400px', maxWidth: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0, flex: 1, paddingRight: '16px', whiteSpace: 'nowrap' }}>Set Active Profile?</h3>
              <button onClick={() => setProfileToSetActive(null)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', flexShrink: 0, padding: '4px', width: 'fit-content' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '15px', color: '#d1d5db', margin: 0, lineHeight: '1.5' }}>
                Are you sure you want to set this as your active profile? This will immediately update the data loaded into the resume builder.
              </p>
            </div>
            
            <div style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setProfileToSetActive(null)}
                style={{ padding: '10px 20px', fontSize: '14px', background: 'transparent', color: 'white', borderRadius: '8px', border: '1px solid #374151', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmSetActiveProfile}
                disabled={saving}
                className="dash-btn primary"
                style={{ padding: '10px 20px', fontSize: '14px', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1, width: 'fit-content', whiteSpace: 'nowrap' }}
              >
                {saving ? 'Setting...' : 'Yes, Set Active'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Confirmation Modal for Delete */}
      <ConfirmationModal 
        isOpen={showDeleteModal} 
        title="Delete Profile" 
        message="Are you sure you want to delete this profile? This action cannot be undone." 
        onConfirm={async () => {
          if (!profileToDelete) return;
          setSaving(true);
          const { error } = await supabase.from('user_profiles').delete().eq('id', profileToDelete.id);
          if (!error) {
            setProfiles(profiles.filter(p => p.id !== profileToDelete.id));
            if (activeProfileId === profileToDelete.id) {
              setActiveProfileId(null);
              if (onProfileSelect) onProfileSelect('');
              await supabase.from('profiles').update({ active_profile_id: null }).eq('id', user.id);
            }
            setShowViewModal(false);
            addToast('Profile deleted', 'success');
          } else {
            addToast('Error deleting profile', 'error');
          }
          setSaving(false);
          setShowDeleteModal(false);
          setProfileToDelete(null);
        }} 
        onCancel={() => {
          setShowDeleteModal(false);
          setProfileToDelete(null);
        }} 
        confirmText="Delete"
        type="warning"
      />
    </div>
  );
}
