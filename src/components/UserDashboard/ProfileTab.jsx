import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { parseProfileText } from '../../utils/parseProfileText';
import { stringifyProfileText } from '../../utils/stringifyProfileText';
import StructuredProfileView from './StructuredProfileView';
import { UserCircle, Upload, ArrowRight, Mail, Phone, Link as LinkIcon, FileText, FileJson, Zap } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function ProfileTab({ user, onAvatarUpdate, onSwitchTab }) {
  const { addToast } = useToast();
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [profileName, setProfileName] = useState('My AI Profile');
  const [profileData, setProfileData] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userStats, setUserStats] = useState({ profiles: 0, resumes: 0, credits: 0 });

  // For new users without a profile
  const [rawText, setRawText] = useState('');
  const [isParsed, setIsParsed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchActiveProfile = async () => {
      try {
        // Fetch stats
        const [profilesCountRes, resumesCountRes, userMetaRes] = await Promise.all([
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('resumes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('profiles').select('active_profile_id, credits').eq('id', user.id).single()
        ]);
        
        const userMeta = userMetaRes.data;
        
        setUserStats({
          profiles: profilesCountRes.count || 0,
          resumes: resumesCountRes.count || 0,
          credits: userMeta?.credits || 0
        });

        if (userMeta?.active_profile_id) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userMeta.active_profile_id)
            .single();

          if (profile) {
            setActiveProfileId(profile.id);
            setProfileName(profile.profile_name || user?.user_metadata?.full_name || 'My AI Profile');
            setAvatarUrl(profile.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '');
            setProfileData(profile.parsed_data);
            setIsParsed(true); // they have a profile
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
      
      // Fallback to empty if no active profile
      setProfileName(user?.user_metadata?.full_name || user?.user_metadata?.name || 'My AI Profile');
      setAvatarUrl(user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '');
      setProfileData(null);
      setIsParsed(false);
      setLoading(false);
    };
    fetchActiveProfile();
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(data.publicUrl);
      if (onAvatarUpdate) onAvatarUpdate(data.publicUrl);
      
      // Update active profile in db
      const { data: activeProfileData } = await supabase.from('profiles').select('active_profile_id').eq('id', user.id).single();
      if (activeProfileData?.active_profile_id) {
        await supabase.from('user_profiles').update({ avatar_url: data.publicUrl }).eq('id', activeProfileData.active_profile_id);
      }
      
      addToast('Avatar uploaded successfully!', 'success');
    } catch (error) {
      console.error(error);
      addToast('Error uploading avatar: ' + error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleParse = async () => {
    if (!rawText.trim()) {
      addToast('Please paste your profile text first.', 'error');
      return;
    }
    
    try {
      setSaving(true);
      const data = parseProfileText(rawText);
      const updatedRawText = stringifyProfileText(data);

      if (activeProfileId) {
        // Update existing profile
        const { error } = await supabase
          .from('user_profiles')
          .update({
            profile_name: profileName,
            avatar_url: avatarUrl,
            raw_text: updatedRawText,
            parsed_data: data
          })
          .eq('id', activeProfileId);
          
        if (error) throw error;
      } else {
        // Insert new profile
        const { data: insertedData, error } = await supabase
          .from('user_profiles')
          .insert([{
            user_id: user.id,
            profile_name: profileName,
            avatar_url: avatarUrl,
            raw_text: updatedRawText,
            parsed_data: data
          }])
          .select()
          .single();

        if (error) throw error;
        
        setActiveProfileId(insertedData.id);
        
        // Auto-set as active profile
        await supabase
          .from('profiles')
          .update({ active_profile_id: insertedData.id })
          .eq('id', user.id);
      }

      setProfileData(data);
      setIsParsed(true);
      addToast('Profile mapped and saved successfully!', 'success');
    } catch (error) {
      console.error(error);
      addToast('Error saving profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-gray-400">Loading your profile...</div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 w-full" style={{ paddingBottom: '80px' }}>

      {/* Hidden file input for avatar */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        style={{ display: 'none' }} 
      />

      {/* Digital Business Card */}
      <div className="business-card-container">
        <div className="business-card">
          
          {/* Left Side: Identity */}
          <div className="business-card-left">
            <div className="business-card-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" />
              ) : (
                <UserCircle size={64} color="#6b7280" />
              )}
            </div>
            
            <h1 className="business-card-name">
              {profileData?.personal?.name || profileName}
            </h1>
            
            <p className="business-card-location">
              {profileData?.personal?.location || 'Add your location below'}
            </p>

            <button 
              onClick={handleAvatarClick}
              disabled={uploading}
              style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Upload size={14} /> {uploading ? 'Uploading...' : 'Change Profile Picture'}
            </button>
          </div>

          {/* Right Side: Contact Details */}
          {(profileData?.personal?.email || profileData?.personal?.phone || profileData?.personal?.linkedin || profileData?.personal?.github || profileData?.personal?.website) && (
            <div className="business-card-right">
              {profileData?.personal?.email && (
                <div className="business-card-contact-item">
                  <div className="business-card-contact-icon"><Mail size={18} /></div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Email</div>
                    <div>{profileData.personal.email}</div>
                  </div>
                </div>
              )}
              {profileData?.personal?.phone && (
                <div className="business-card-contact-item">
                  <div className="business-card-contact-icon"><Phone size={18} /></div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Phone</div>
                    <div>{profileData.personal.phone}</div>
                  </div>
                </div>
              )}
              {profileData?.personal?.linkedin && (
                <div className="business-card-contact-item">
                  <div className="business-card-contact-icon"><LinkIcon size={18} /></div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>LinkedIn</div>
                    <div>{profileData.personal.linkedin}</div>
                  </div>
                </div>
              )}
              {(profileData?.personal?.github || profileData?.personal?.website) && (
                <div className="business-card-contact-item">
                  <div className="business-card-contact-icon"><LinkIcon size={18} /></div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Portfolio / GitHub</div>
                    <div>{profileData.personal.github || profileData.personal.website}</div>
                  </div>
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="kpi-grid user-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px', marginTop: '24px' }}>
        
        <div className="kpi-card-inner" style={{
          background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, #60a5fa22 0%, transparent 70%)', borderRadius: '50%' }} />
          <div style={{ background: '#60a5fa15', color: '#60a5fa', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #60a5fa30' }}>
            <FileJson size={24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="kpi-card-text" style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Profiles</div>
            <div className="kpi-card-value" style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userStats.profiles}</div>
          </div>
        </div>

        <div className="kpi-card-inner" style={{
          background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, #34d39922 0%, transparent 70%)', borderRadius: '50%' }} />
          <div style={{ background: '#34d39915', color: '#34d399', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #34d39930' }}>
            <FileText size={24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="kpi-card-text" style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Resumes</div>
            <div className="kpi-card-value" style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userStats.resumes}</div>
          </div>
        </div>

        <div className="kpi-card-inner" style={{
          background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, #a78bfa22 0%, transparent 70%)', borderRadius: '50%' }} />
          <div style={{ background: '#a78bfa15', color: '#a78bfa', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #a78bfa30' }}>
            <Zap size={24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="kpi-card-text" style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Credits</div>
            <div className="kpi-card-value" style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userStats.credits}</div>
          </div>
        </div>

      </div>

      {!profileData && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
          <button 
            onClick={() => onSwitchTab('settings')}
            className="dash-btn primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 32px', fontSize: '16px', background: '#3b82f6', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
          >
            Import Profile <ArrowRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
