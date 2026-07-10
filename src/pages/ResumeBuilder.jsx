import React, { useState, useEffect } from 'react';
import '../modal.css';
import EditorPanel from '../components/EditorPanel';
import ResumePreview from '../components/ResumePreview';
import { generateResumeApi } from '../utils/api';
import { downloadDocx } from '../utils/docxGenerator';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { LogOut, LayoutDashboard, UserCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import UserDashboard from '../components/UserDashboard/UserDashboard';
import InsufficientCreditsModal from '../components/InsufficientCreditsModal';
import PurchaseSuccessModal from '../components/PurchaseSuccessModal';

export default function ResumeBuilder() {
  const { addToast } = useToast();
  const { user, isAdmin, signOut, signInWithGoogle } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;
  const showUserDashboard = path !== '/';
  
  let dashboardTab = 'profile';
  if (path === '/loadprofile') dashboardTab = 'settings';
  else if (path === '/savedresumes') dashboardTab = 'resumes';
  else if (path === '/credits') dashboardTab = 'credits';
  const [userAvatar, setUserAvatar] = useState(null);
  const [profileText, setProfileText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeData, setResumeData] = useState(null);
  const [status, setStatus] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [currentResumeId, setCurrentResumeId] = useState(null);
  const [isSavingResume, setIsSavingResume] = useState(false);
  const [credits, setCredits] = useState(null);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [successPurchaseData, setSuccessPurchaseData] = useState(null);

  // Fetch active profile and credits on load
  useEffect(() => {
    if (!user) {
      setProfileText('');
      setJobDescription('');
      setResumeData(null);
      setUserAvatar(null);
      setStatus({ type: '', text: '' });
      setCredits(null);
      return;
    }
    const fetchUserData = async () => {
      // Fetch credits
      const { data: profileData } = await supabase
        .from('profiles')
        .select('credits, active_profile_id')
        .eq('id', user.id)
        .single();
        
      if (profileData) {
        setCredits(profileData.credits);
        
        if (profileData.active_profile_id) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('raw_text, avatar_url')
            .eq('id', profileData.active_profile_id)
            .single();
          
          if (profile) {
            if (profile.raw_text) setProfileText(profile.raw_text);
            setUserAvatar(profile.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null);
          } else {
            setUserAvatar(user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null);
          }
        } else {
          setUserAvatar(user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null);
        }
      } else {
        setUserAvatar(user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null);
      }
    };
    fetchUserData();
  }, [user]);

  // Poll for approved, unacknowledged credit purchases
  useEffect(() => {
    if (!user) return;
    
    const checkApprovedPurchases = async () => {
      const { data, error } = await supabase
        .from('credit_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('acknowledged', false)
        .limit(1);

      if (data && data.length > 0) {
        const sub = data[0];
        setSuccessPurchaseData(sub);
        
        // Mark as acknowledged
        await supabase
          .from('credit_subscriptions')
          .update({ acknowledged: true })
          .eq('id', sub.id);
          
        // Refresh credits
        const { data: profileData } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', user.id)
          .single();
          
        if (profileData) {
          setCredits(profileData.credits);
        }
      }
    };

    // Check immediately, then every 10 seconds
    checkApprovedPurchases();
    const interval = setInterval(checkApprovedPurchases, 10000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Handle restoring job description after OAuth redirect
  useEffect(() => {
    const savedJobDesc = localStorage.getItem('savedJobDescription');
    if (savedJobDesc) {
      setJobDescription(savedJobDesc);
      localStorage.removeItem('savedJobDescription');
    }
  }, [user]);

  const handleGenerate = async (overrideJobDesc = null) => {
    const jdToUse = typeof overrideJobDesc === 'string' ? overrideJobDesc : jobDescription;
    
    if (!jdToUse.trim()) {
      setStatus({ type: 'err', text: 'Paste a job description first.' });
      return;
    }

    if (!profileText.trim()) {
      setStatus({ type: 'err', text: 'Please load a profile first. You can manage profiles in the dashboard.' });
      addToast('Profile missing. Please load a profile first.', 'error');
      return;
    }

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setIsLoading(true); // show quick loading state while checking credits
    const { data: profile, error: profileErr } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
    if (profileErr || !profile || profile.credits <= 0) {
      setIsLoading(false);
      setShowInsufficientModal(true);
      return;
    }

    setCurrentResumeId(null);
    setStatus({ type: 'info', text: 'Analyzing job description and tailoring resume...' });
    
    // Simulate loading steps visually
    const steps = ["Analyzing profile and job description...", "Extracting key skills...", "Drafting ATS-optimized bullets...", "Formatting your resume..."];
    let stepIdx = 0;
    setLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      setLoadingStep(steps[stepIdx]);
    }, 4000);

    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session) {
        throw new Error('You must be logged in to generate a resume.');
      }

      const data = await generateResumeApi(profileText, jdToUse, session.access_token);
      
      // Backend handles credit deduction now
      setCredits(prev => (prev > 0 ? prev - 1 : 0));

      setResumeData(data);
      setStatus({ type: 'success', text: '' });
      addToast('Resume generated successfully! 1 Credit used.', 'success');
    } catch (err) {
      console.error(err);
      setStatus({ type: 'err', text: 'Error: ' + err.message });
      addToast(err.message, 'error');
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (resumeData) {
      try {
        await downloadDocx(resumeData);
        addToast('DOCX download started!', 'info');
      } catch (err) {
        addToast(err.message, 'error');
      }
    }
  };

  const handleSaveResume = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (!resumeData) return;

    setIsSavingResume(true);
    try {
      const payload = {
        user_id: user.id,
        target_role: resumeData.target_role || jobDescription.substring(0, 50) || 'Tailored Resume',
        job_description: jobDescription,
        full_name: resumeData.full_name,
        contact_line: resumeData.contact_line,
        summary: resumeData.summary,
        skills: resumeData.skills,
        experience: resumeData.experience,
        projects: resumeData.projects,
        education: resumeData.education,
        certifications: resumeData.certifications,
        hide_projects: resumeData.hide_projects || false,
        hide_education: resumeData.hide_education || false,
        hide_certifications: resumeData.hide_certifications || false
      };

      if (currentResumeId) {
        payload.id = currentResumeId;
      }

      const { data, error } = await supabase
        .from('resumes')
        .upsert(payload)
        .select('id')
        .single();

      if (error) throw error;

      if (data?.id) {
        setCurrentResumeId(data.id);
      }
      
      addToast('Resume saved successfully!', 'success');
    } catch (err) {
      console.error('Error saving resume:', err);
      addToast('Failed to save resume. Please try again.', 'error');
    } finally {
      setIsSavingResume(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      localStorage.setItem('savedJobDescription', jobDescription);
      await signInWithGoogle();
    } catch (error) {
      console.error('Error logging in with Google:', error);
      addToast('Failed to login with Google.', 'error');
    }
  };

  // Removed handleUpdateResumeData

  return (
    <div className="layout-container">
      {/* Top Navbar */}
      <nav className="top-nav">
        <div 
          className="nav-logo cursor-pointer" 
          onClick={() => navigate('/')}
        >
          <span className="font-bold tracking-tight">AI Resume Builder</span>
        </div>
        <div className="nav-actions">
          {user ? (
            <>
              {isAdmin && (
                <Link 
                  to="/admin/dashboard"
                  className="nav-link"
                >
                  <LayoutDashboard size={16} />
                  Admin
                </Link>
              )}
              
              <button 
                onClick={() => navigate('/contactcard')}
                className="nav-profile-btn"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="Profile" className="nav-avatar" />
                ) : (
                  <div className="nav-avatar fallback">
                    <UserCircle size={20} />
                  </div>
                )}
                <span className="font-medium" style={{ fontSize: '15px' }}>Profile</span>
              </button>
            </>
          ) : (
            <button 
              onClick={() => setShowLoginModal(true)}
              className="nav-btn primary"
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {showUserDashboard ? (
        <UserDashboard 
          onClose={() => navigate('/')} 
          initialTab={dashboardTab}
          onProfileSelect={(profile) => {
            if (profile.raw_text) setProfileText(profile.raw_text);
            setUserAvatar(profile.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null);
            addToast('Profile loaded into builder!', 'success');
          }}
          onSelectResume={(resume) => {
            setResumeData({
              target_role: resume.target_role,
              full_name: resume.full_name,
              contact_line: resume.contact_line,
              summary: resume.summary,
              skills: resume.skills,
              experience: resume.experience,
              projects: resume.projects,
              education: resume.education,
              certifications: resume.certifications,
              hide_projects: resume.hide_projects || false,
              hide_education: resume.hide_education || false,
              hide_certifications: resume.hide_certifications || false
            });
            setJobDescription(resume.job_description || '');
            setCurrentResumeId(resume.id);
            addToast('Saved resume loaded!', 'success');
            navigate('/');
          }}
          userAvatar={userAvatar}
          onAvatarUpdate={setUserAvatar}
        />
      ) : (
        <div className="shell">
          <EditorPanel 
            profileText={profileText} 
            setProfileText={setProfileText}
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            onOpenDashboard={(tab = 'profile') => {
              if (!user) {
                setShowLoginModal(true);
                return;
              }
              if (tab === 'profile') navigate('/contactcard');
              else if (tab === 'settings') navigate('/loadprofile');
              else if (tab === 'resumes') navigate('/savedresumes');
              else if (tab === 'credits') navigate('/credits');
            }}
          />
          <ResumePreview 
            user={user}
            resumeData={resumeData}
            setResumeData={setResumeData}
            isLoading={isLoading}
            loadingStep={loadingStep}
            onDownloadDocx={handleDownloadDocx}
            onSaveResume={handleSaveResume}
            isSavingResume={isSavingResume}
            profileText={profileText}
            jobDescription={jobDescription}
            onGenerate={handleGenerate}
            status={status}
            credits={credits}
            onGenerateAnother={() => {
              setResumeData(null);
              setJobDescription('');
            }}
          />
        </div>
      )}

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Almost there!</h2>
            <p>Sign in to generate and securely save your ATS-optimized resumes.</p>
            
            <button
              onClick={handleGoogleLogin}
              className="google-btn"
            >
              <svg viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      )}

      {showInsufficientModal && (
        <InsufficientCreditsModal 
          onClose={() => setShowInsufficientModal(false)}
          onBuyCredits={() => {
            setShowInsufficientModal(false);
            setDashboardTab('credits');
            setShowUserDashboard(true);
          }}
        />
      )}

      {successPurchaseData && (
        <PurchaseSuccessModal 
          creditsAmount={successPurchaseData.credits_amount}
          onClose={() => setSuccessPurchaseData(null)}
        />
      )}
    </div>
  );
}
