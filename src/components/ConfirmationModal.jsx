import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export default function ConfirmationModal({ 
  isOpen, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  onConfirm, 
  onCancel,
  type = 'warning' // 'warning' or 'info'
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-dark, #0B0F19)',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
        borderRadius: '24px',
        padding: '32px',
        width: '90%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        animation: 'scaleUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background glow */}
        <div style={{
          position: 'absolute',
          top: '-50%', left: '-50%', width: '200%', height: '200%',
          background: type === 'warning' 
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, transparent 60%)'
            : 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 60%)',
          zIndex: 0, pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              background: type === 'warning' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              color: type === 'warning' ? '#EF4444' : '#3B82F6',
              padding: '12px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${type === 'warning' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`,
              boxShadow: `0 0 20px ${type === 'warning' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'}`
            }}>
              {type === 'warning' ? <AlertTriangle size={24} /> : <Info size={24} />}
            </div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.01em' }}>{title}</h3>
          </div>
          
          <p style={{ margin: 0, color: 'var(--text-muted, #94A3B8)', fontSize: '15px', lineHeight: '1.6' }}>
            {message}
          </p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', position: 'relative', zIndex: 1 }}>
          <button 
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              backgroundColor: type === 'warning' ? '#EF4444' : '#3B82F6',
              border: 'none',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: type === 'warning' ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
