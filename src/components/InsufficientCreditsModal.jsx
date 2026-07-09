import React from 'react';
import '../modal.css';
import { AlertCircle, PlusCircle, X } from 'lucide-react';

export default function InsufficientCreditsModal({ onClose, onBuyCredits }) {
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000, animation: 'fadeIn 0.3s ease' }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', animation: 'slideUp 0.3s ease', position: 'relative' }}>
        <button className="modal-close" onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', left: 'auto', margin: 0, width: 'auto', padding: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', zIndex: 10 }}>
          <X size={20} />
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '50%', color: '#EF4444' }}>
            <AlertCircle size={48} />
          </div>
        </div>
        
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>Insufficient Credits</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
          You have run out of credits to generate or heavily optimize your resume. Please purchase more to continue using our advanced AI features.
        </p>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button 
            onClick={onClose}
            style={{ 
              padding: '10px 20px', 
              borderRadius: '8px', 
              border: '1px solid var(--border)', 
              background: 'transparent', 
              color: 'var(--text)', 
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button 
            onClick={onBuyCredits}
            style={{ 
              padding: '10px 20px', 
              borderRadius: '8px', 
              border: 'none', 
              background: 'linear-gradient(135deg, #60A5FA, #A78BFA)', 
              color: '#fff', 
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(96, 165, 250, 0.3)'
            }}
          >
            <PlusCircle size={18} />
            Buy Credits
          </button>
        </div>
      </div>
    </div>
  );
}
