import React, { useState } from 'react';
import '../../modal.css';
import { X, ChevronRight, CheckCircle, Info, CreditCard, Smartphone, Check, Upload } from 'lucide-react';

export default function BuyCreditsModal({ onClose, selectedPack, onSubmitPurchase, isSubmitting }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    pack: selectedPack?.name || 'Basic',
    fullName: '',
    mobileNumber: '',
    referenceNumber: '',
    receiptFile: null
  });

  const packs = [
    { name: 'Basic', credits: 20, price: 20, desc: 'Perfect for tweaking an existing resume.' },
    { name: 'Pro', credits: 60, price: 50, desc: 'Ideal for crafting multiple tailored resumes.' },
    { name: 'Ultimate', credits: 120, price: 100, desc: 'For limitless generation and variations.' }
  ];

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.mobileNumber || !formData.referenceNumber || !formData.receiptFile) return;
    const packDetails = packs.find(p => p.name === formData.pack);
    const success = await onSubmitPurchase({
      credits_amount: packDetails.credits,
      price_php: packDetails.price,
      full_name: formData.fullName,
      mobile_number: formData.mobileNumber,
      reference_number: formData.referenceNumber,
      receipt_file: formData.receiptFile
    });
    if (success) {
      setStep(4);
    }
  };

  return (
    <div className="modal-overlay" onClick={step !== 4 ? onClose : undefined} style={{ zIndex: 10000, animation: 'fadeIn 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '520px', 
          width: '100%', 
          height: '620px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s ease', 
          position: 'relative',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
          background: 'linear-gradient(to bottom, #1e293b, #0f172a)'
        }}
      >
        {step !== 4 && (
          <button 
            className="modal-close" 
            onClick={onClose} 
            style={{ 
              position: 'absolute', top: '16px', right: '16px', left: 'auto', 
              margin: 0, width: 'auto', padding: '8px', background: 'rgba(255,255,255,0.05)', 
              borderRadius: '50%', border: 'none', color: 'var(--text-muted)', 
              cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            <X size={18} />
          </button>
        )}

        {/* Ensure step indicator doesn't overlap with X button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', marginTop: '24px', padding: '0 20px' }}>
          {[1, 2, 3].map((i, index) => (
            <React.Fragment key={i}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: '600',
                background: step >= i ? '#60A5FA' : 'rgba(255,255,255,0.05)',
                color: step >= i ? '#fff' : 'var(--text-muted)',
                boxShadow: step === i ? '0 0 0 4px rgba(96, 165, 250, 0.2)' : 'none',
                transition: 'all 0.3s ease',
                zIndex: 2
              }}>
                {step > i ? <Check size={16} strokeWidth={3} /> : i}
              </div>
              {index < 2 && (
                <div style={{
                  flex: 1, height: '2px',
                  background: step > i ? '#60A5FA' : 'rgba(255,255,255,0.05)',
                  transition: 'background 0.3s ease',
                  margin: '0 -4px'
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {step === 1 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0', color: '#fff' }}>Choose Your Pack</h2>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>Select the credit package that fits your needs.</p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {packs.map(pack => {
                    const isSelected = formData.pack === pack.name;
                    return (
                      <label key={pack.name} style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 20px', borderRadius: '16px', 
                        border: `2px solid ${isSelected ? '#60A5FA' : 'rgba(255,255,255,0.05)'}`,
                        background: isSelected ? 'rgba(96, 165, 250, 0.05)' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer', transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 4px 20px rgba(96, 165, 250, 0.15)' : 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, paddingRight: '16px' }}>
                          <div style={{ 
                            width: '20px', height: '20px', borderRadius: '50%', 
                            border: `2px solid ${isSelected ? '#60A5FA' : 'var(--text-muted)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginRight: '16px', flexShrink: 0
                          }}>
                            {isSelected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#60A5FA' }} />}
                          </div>
                          <input 
                            type="radio" 
                            name="pack" 
                            value={pack.name} 
                            checked={isSelected}
                            onChange={e => setFormData({ ...formData, pack: e.target.value })}
                            style={{ display: 'none' }}
                          />
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <div style={{ fontWeight: '800', fontSize: '17px', color: isSelected ? '#fff' : 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{pack.name} Pack</div>
                              {pack.name === 'Pro' && <div style={{ fontSize: '10px', background: 'linear-gradient(135deg, #60A5FA, #A78BFA)', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: '800', letterSpacing: '0.5px' }}>POPULAR</div>}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4', textTransform: 'none', fontWeight: '500', textAlign: 'left' }}>{pack.desc}</div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '20px', color: '#10B981' }}>₱{pack.price}</div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: isSelected ? '#60A5FA' : 'var(--text-muted)', background: isSelected ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px', border: `1px solid ${isSelected ? 'rgba(96,165,250,0.2)' : 'transparent'}` }}>{pack.credits} Credits</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              
              <div style={{ marginTop: '20px', padding: '0 8px', flexShrink: 0 }}>
                <button onClick={handleNext} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#60A5FA', color: '#fff', border: 'none', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'background 0.2s', boxShadow: '0 4px 15px rgba(96, 165, 250, 0.3)' }} onMouseOver={e => e.currentTarget.style.background = '#3B82F6'} onMouseOut={e => e.currentTarget.style.background = '#60A5FA'}>
                  Proceed to Payment <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px 0', color: '#fff' }}>Payment Process</h2>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>
                    Scan the QR code or send to the GCash number below.
                  </p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#fff', padding: '14px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                    <img src="/gcash-qr.png" alt="GCash QR Code" style={{ width: '170px', height: '170px', objectFit: 'contain', display: 'block' }} />
                  </div>
                  
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '16px', width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Smartphone size={14} /> GCash Number
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#60A5FA', letterSpacing: '2px', fontFamily: 'monospace' }}>0975 005 7000</div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '12px', color: '#F59E0B', fontSize: '12.5px', lineHeight: '1.5', width: '100%' }}>
                    <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Important:</strong> Save your receipt or take a screenshot. You will need your <strong>Mobile Number</strong> and the <strong>Reference Number</strong> for the next step.
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', padding: '0 8px', flexShrink: 0 }}>
                <button onClick={handleBack} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>Back</button>
                <button onClick={handleNext} style={{ flex: 2, padding: '14px', borderRadius: '12px', background: '#60A5FA', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 15px rgba(96, 165, 250, 0.3)' }} onMouseOver={e => e.currentTarget.style.background = '#3B82F6'} onMouseOut={e => e.currentTarget.style.background = '#60A5FA'}>I have paid</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0', color: '#fff' }}>Payment Details</h2>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>
                    Submit your payment details below for verification.
                  </p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Selected Pack</label>
                      <span onClick={() => setStep(1)} style={{ color: '#60A5FA', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', fontWeight: '600' }}>Change Pack</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'rgba(96, 165, 250, 0.1)', borderRadius: '12px', border: '1px solid rgba(96, 165, 250, 0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#fff' }}>
                        <CreditCard size={18} color="#60A5FA" />
                        {formData.pack} Pack ({packs.find(p => p.name === formData.pack)?.credits} Credits)
                      </div>
                      <div style={{ fontWeight: '800', color: '#10B981' }}>₱{packs.find(p => p.name === formData.pack)?.price}</div>
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Juan Dela Cruz"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: '#fff', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#60A5FA'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Mobile Number (Sender)</label>
                    <input 
                      type="text" 
                      required
                      value={formData.mobileNumber}
                      onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })}
                      placeholder="09123456789"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: '#fff', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#60A5FA'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>GCash Reference Number</label>
                    <input 
                      type="text" 
                      required
                      value={formData.referenceNumber}
                      onChange={e => setFormData({ ...formData, referenceNumber: e.target.value })}
                      placeholder="0001234567890"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: '#fff', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#60A5FA'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Upload Receipt</label>
                    <label style={{ 
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                      padding: '20px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', 
                      border: '1px dashed var(--border)', cursor: 'pointer', transition: 'all 0.2s',
                      color: formData.receiptFile ? '#10B981' : 'var(--text-muted)'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#60A5FA'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                      <Upload size={24} style={{ marginBottom: '8px' }} />
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>
                        {formData.receiptFile ? formData.receiptFile.name : 'Click to upload screenshot'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*"
                        required
                        style={{ display: 'none' }}
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setFormData({ ...formData, receiptFile: e.target.files[0] });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', padding: '0 8px', flexShrink: 0 }}>
                <button type="button" onClick={handleBack} disabled={isSubmitting} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>Back</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: '14px', borderRadius: '12px', background: '#10B981', color: '#fff', border: 'none', fontWeight: '700', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'background 0.2s', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }} onMouseOver={e => !isSubmitting && (e.currentTarget.style.background = '#059669')} onMouseOut={e => !isSubmitting && (e.currentTarget.style.background = '#10B981')}>
                  {isSubmitting ? <span className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span> : 'Submit Payment'}
                </button>
              </div>
            </form>
          )}

          {step === 4 && (
            <div className="no-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '20px 8px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '24px', borderRadius: '50%', color: '#10B981', animation: 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                  <CheckCircle size={64} />
                </div>
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '16px', color: '#fff' }}>Submission Received!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: '1.6', marginBottom: '32px', maxWidth: '400px' }}>
                Thank you for your purchase. Please wait <strong style={{ color: '#60A5FA' }}>15-30 minutes</strong> for our admins to verify your transaction. We appreciate your patience, and your credits will be added to your account as soon as the verification is complete!
              </p>
              <button 
                onClick={onClose} 
                style={{ width: '100%', maxWidth: '300px', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff', fontWeight: '700', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
