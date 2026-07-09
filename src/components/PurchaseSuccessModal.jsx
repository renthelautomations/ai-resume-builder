import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { CheckCircle, Zap } from 'lucide-react';
import '../modal.css';

export default function PurchaseSuccessModal({ onClose, creditsAmount }) {
  const [showContent, setShowContent] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    
    setTimeout(() => {
      setShowContent(true);
    }, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000, animation: 'fadeIn 0.5s ease', position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Confetti overlay for maximum celebration! */}
      {showContent && (
        <Confetti 
          width={windowSize.width} 
          height={windowSize.height}
          recycle={false}
          numberOfPieces={400}
          gravity={0.15}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 10001, pointerEvents: 'none' }}
        />
      )}

      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '480px', 
          textAlign: 'center', 
          animation: 'scaleIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          background: 'linear-gradient(145deg, #1A1C23 0%, #0F1115 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 60px rgba(96, 165, 250, 0.15)',
          padding: '40px 30px',
          borderRadius: '24px',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 10002
        }}
      >
        {/* Glow effect in the background */}
        <div style={{ position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }}></div>

        <div style={{
          opacity: showContent ? 1 : 0,
          transform: showContent ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s ease',
          position: 'relative',
          zIndex: 1
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))', padding: '20px', borderRadius: '50%', color: '#10B981', boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)' }}>
              <CheckCircle size={56} />
            </div>
          </div>

          <h2 style={{ 
            fontSize: '32px', 
            fontWeight: '800', 
            marginBottom: '12px',
            color: '#fff',
            letterSpacing: '-0.5px'
          }}>
            Payment Confirmed!
          </h2>
          
          <p style={{ color: 'var(--text-muted)', marginBottom: '28px', fontSize: '15px' }}>
            Your transaction was fully verified. You received:
          </p>

          <div style={{
            background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '32px',
            border: '1px solid rgba(96, 165, 250, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: 'inset 0 0 20px rgba(255,255,255,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '56px', fontWeight: '900', color: '#fff', marginBottom: '4px', textShadow: '0 4px 20px rgba(96,165,250,0.4)' }}>
              <Zap size={40} color="#60A5FA" style={{ fill: 'rgba(96, 165, 250, 0.2)' }} />
              +{creditsAmount}
            </div>
            <div style={{ color: '#60A5FA', fontSize: '15px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px' }}>
              Credits Added
            </div>
          </div>
          
          <button 
            onClick={onClose}
            style={{ 
              width: '100%', 
              fontSize: '16px', 
              padding: '16px',
              borderRadius: '14px',
              background: '#10B981',
              color: '#fff',
              border: 'none',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 25px rgba(16, 185, 129, 0.4)';
              e.currentTarget.style.background = '#059669';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.3)';
              e.currentTarget.style.background = '#10B981';
            }}
          >
            Awesome, let's go!
          </button>
        </div>
      </div>
    </div>
  );
}
