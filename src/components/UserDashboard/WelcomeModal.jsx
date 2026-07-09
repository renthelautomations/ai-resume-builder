import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import Confetti from 'react-confetti';
import './WelcomeModal.css';

export default function WelcomeModal({ user, onClaimed }) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Prevent background scrolling while modal is open and track window resize
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      const { error } = await supabase.rpc('claim_welcome_credits');
      if (error) throw error;
      
      setIsSuccess(true);
      setTimeout(() => {
        onClaimed();
      }, 4000); // Wait 4s for confetti to fall before closing
    } catch (error) {
      console.error('Error claiming credits:', error);
      setIsClaiming(false);
    }
  };

  return (
    <div className="welcome-modal-overlay" style={{ zIndex: 10000 }}>
      {isSuccess && (
        <Confetti 
          width={windowSize.width} 
          height={windowSize.height}
          recycle={false}
          numberOfPieces={350}
          gravity={0.12}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 10001, pointerEvents: 'none' }}
        />
      )}
      <div className="welcome-modal-content" style={{ zIndex: 10002 }}>
        <div className="welcome-modal-bg"></div>
        <div className="welcome-modal-header">
          <div className="welcome-icon-wrapper" style={{ 
            boxShadow: isSuccess ? '0 0 30px rgba(16, 185, 129, 0.4)' : '0 0 20px rgba(96, 165, 250, 0.2)',
            background: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(96, 165, 250, 0.1)',
            transform: isSuccess ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            {isSuccess ? (
              <CheckCircle2 size={56} color="#10B981" className="success-icon" />
            ) : (
              <Sparkles size={48} color="#60A5FA" className="floating-icon" />
            )}
          </div>
        </div>

        <div className="welcome-modal-body">
          {isSuccess ? (
            <div style={{ animation: 'fadeIn 0.5s ease' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '800', background: 'linear-gradient(90deg, #10B981, #34D399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '12px' }}>Credits Claimed!</h2>
              <p style={{ fontSize: '18px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}>2 credits have been added to your balance.</p>
              <p className="welcome-subtext" style={{ fontSize: '15px' }}>You're all set to generate your first AI resume. Let's make it awesome!</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '28px', fontWeight: '800' }}>Welcome to AI Resume Builder!</h2>
              <p style={{ color: 'var(--text-muted)' }}>We're thrilled to have you here.</p>
              <div className="welcome-gift-box" style={{ margin: '24px auto' }}>
                <span className="gift-amount">+2</span>
                <span className="gift-text">Free Credits</span>
              </div>
              <p className="welcome-subtext">To get you started, we're giving you 2 free credits so you can generate your first ATS-optimized resume right away!</p>
              
              <button 
                className="welcome-claim-btn"
                onClick={handleClaim}
                disabled={isClaiming}
                style={{ fontSize: '16px', fontWeight: '700', padding: '16px', marginTop: '12px' }}
              >
                {isClaiming ? 'Claiming...' : 'Claim My Credits'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
