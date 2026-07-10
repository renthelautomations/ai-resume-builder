import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useToast } from '../../context/ToastContext';
import { CreditCard, Zap, Check, Star, Shield, Sparkles, Clock, CheckCircle } from 'lucide-react';
import './CreditsTab.css';
import BuyCreditsModal from './BuyCreditsModal';

export default function CreditsTab({ user }) {
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (!user) return;
    const fetchCredits = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        setCredits(data.credits);
      }
      setLoading(false);
    };

    const fetchSubscriptions = async () => {
      const { data, error } = await supabase
        .from('credit_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setSubscriptions(data);
      }
    };

    fetchCredits();
    fetchSubscriptions();
  }, [user]);

  const handleRequestPurchase = (packName) => {
    setSelectedPack({ name: packName });
    setShowBuyModal(true);
  };

  const handleSubmitPurchase = async (purchaseData) => {
    setIsRequesting(true);
    try {
      let receipt_url = null;
      if (purchaseData.receipt_file) {
        const file = purchaseData.receipt_file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);
          
        receipt_url = publicUrlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('credit_subscriptions')
        .insert([
          { 
            user_id: user.id, 
            credits_amount: purchaseData.credits_amount, 
            price_php: purchaseData.price_php, 
            status: 'pending',
            full_name: purchaseData.full_name,
            mobile_number: purchaseData.mobile_number,
            reference_number: purchaseData.reference_number,
            receipt_url: receipt_url
          }
        ])
        .select();

      if (error) throw error;
      
      setSubscriptions(prev => [data[0], ...prev]);
      return true;
    } catch (err) {
      console.error(err);
      addToast('Failed to submit purchase request.', 'error');
      return false;
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="credits-container">
      <div style={{ marginBottom: '24px' }}>
        <div className="credits-header" style={{ marginBottom: '4px' }}>
          <h2 className="credits-title" style={{ marginBottom: '0' }}>Your Credits</h2>
          <button 
            className="credits-buy-btn"
            onClick={() => handleRequestPurchase('Basic')}
          >
            <CreditCard size={18} /> Buy Credits
          </button>
        </div>
        <p className="credits-subtitle">Manage your balance and fuel your AI-powered career growth.</p>
      </div>

      <div className="balance-card">
        <div className="balance-info">
          <div className="balance-icon-wrap">
            <div className="balance-icon-bg"></div>
            <div className="balance-icon">
              <Zap size={32} />
            </div>
          </div>
          <div className="balance-text">
            <h3>Available Balance</h3>
            <p className="balance-amount">
              {loading ? '...' : credits} <span>credits</span>
            </p>
          </div>
        </div>
        
        <div className="balance-desc">
          Each credit allows you to generate or heavily optimize one professional resume section using our advanced AI.
        </div>
      </div>

      <div className="pricing-section-title" id="pricing-section">
        <Sparkles size={24} />
        <h3>Power Up Your Profile</h3>
        <Sparkles size={24} />
      </div>

      <div className="pricing-grid">
        {/* Tier 1 */}
        <div className="pricing-card">
          <div className="pricing-card-bg"></div>
          <div className="pricing-content">
            <div className="pricing-header">
              <div>
                <h4>Basic Pack</h4>
                <div className="pricing-credits">20 Credits</div>
              </div>
              <div className="pricing-price">₱20</div>
            </div>
            
            <p className="pricing-desc">
              Perfect for tweaking an existing resume or targeting a few specific job applications.
            </p>

            <ul className="pricing-features">
              <li><div className="feature-check"><Check size={14} strokeWidth={3} /></div><span>20 AI Generations</span></li>
              <li><div className="feature-check"><Check size={14} strokeWidth={3} /></div><span>Standard ATS Formatting</span></li>
            </ul>
            
            <button 
              className="pricing-btn btn-secondary"
              onClick={() => handleRequestPurchase('Basic')}
              disabled={isRequesting}
            >
              <CreditCard size={18} /> Request Purchase
            </button>
          </div>
        </div>

        {/* Tier 2 */}
        <div className="pricing-card popular">
          <div className="popular-badge">Most Popular</div>
          <div className="pricing-card-bg"></div>
          <div className="pricing-content">
            <div className="pricing-header">
              <div>
                <h4>Pro Pack</h4>
                <div className="pricing-credits">60 Credits</div>
              </div>
              <div className="pricing-price">₱50</div>
            </div>
            
            <p className="pricing-desc">
              The sweet spot. Great for active job seekers applying to multiple roles.
            </p>

            <ul className="pricing-features">
              <li><div className="feature-check"><Check size={14} strokeWidth={3} /></div><span>60 AI Generations</span></li>
              <li><div className="feature-check"><Check size={14} strokeWidth={3} /></div><span>Priority Processing</span></li>
              <li><div className="feature-check"><Check size={14} strokeWidth={3} /></div><span>Discounted Rate</span></li>
            </ul>
            
            <button 
              className="pricing-btn btn-primary"
              onClick={() => handleRequestPurchase('Pro')}
              disabled={isRequesting}
            >
              <Star size={18} fill="currentColor" /> Request Purchase
            </button>
          </div>
        </div>

        {/* Tier 3 */}
        <div className="pricing-card">
          <div className="pricing-card-bg"></div>
          <div className="pricing-content">
            <div className="pricing-header">
              <div>
                <h4>Ultimate Pack</h4>
                <div className="pricing-credits">130 Credits</div>
              </div>
              <div className="pricing-price">₱100</div>
            </div>
            
            <p className="pricing-desc">
              For serious professionals who want limitless generation power and variations.
            </p>

            <ul className="pricing-features">
              <li><div className="feature-check"><Check size={14} strokeWidth={3} /></div><span>130 AI Generations</span></li>
              <li><div className="feature-check"><Check size={14} strokeWidth={3} /></div><span>Best Value</span></li>
              <li><div className="feature-check"><Check size={14} strokeWidth={3} /></div><span>VIP Support</span></li>
            </ul>
            
            <button 
              className="pricing-btn btn-secondary"
              onClick={() => handleRequestPurchase('Ultimate')}
              disabled={isRequesting}
            >
              <Shield size={18} /> Request Purchase
            </button>
          </div>
        </div>
      </div>

      {subscriptions.length > 0 && (
        <div className="subscription-history" style={{ marginTop: '40px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: '#fff' }}>Purchase History</h3>
          <div className="dash-card" style={{ padding: 0, overflowX: 'auto', overflowY: 'hidden' }}>
            <table style={{ width: '100%', minWidth: '450px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Date</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Credits</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Price</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', color: '#fff' }}>{new Date(sub.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px', color: '#fff', fontWeight: '600' }}>{sub.credits_amount}</td>
                    <td style={{ padding: '12px 16px', color: '#fff' }}>₱{sub.price_php}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {sub.status === 'pending' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                          <Clock size={14} /> Pending
                        </span>
                      ) : sub.status === 'approved' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                          <CheckCircle size={14} /> Approved
                        </span>
                      ) : (
                        <span style={{ color: '#EF4444' }}>{sub.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showBuyModal && (
        <BuyCreditsModal 
          selectedPack={selectedPack}
          isSubmitting={isRequesting}
          onClose={() => setShowBuyModal(false)}
          onSubmitPurchase={handleSubmitPurchase}
        />
      )}
    </div>
  );
}
