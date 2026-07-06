import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { CreditCard, Zap, Check, Star, Shield, Sparkles } from 'lucide-react';
import './CreditsTab.css';

export default function CreditsTab({ user }) {
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

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
    fetchCredits();
  }, [user]);

  return (
    <div className="credits-container">
      <div className="credits-header">
        <h2 className="credits-title">Your Credits</h2>
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

      <div className="pricing-section-title">
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
                <h4>Starter Pack</h4>
                <div className="pricing-credits">10 Credits</div>
              </div>
              <div className="pricing-price">$5</div>
            </div>
            
            <p className="pricing-desc">
              Perfect for tweaking an existing resume or targeting a few specific job applications.
            </p>

            <ul className="pricing-features">
              <li>
                <div className="feature-check"><Check size={14} strokeWidth={3} /></div>
                <span>10 AI Generations</span>
              </li>
              <li>
                <div className="feature-check"><Check size={14} strokeWidth={3} /></div>
                <span>Standard ATS Formatting</span>
              </li>
              <li>
                <div className="feature-check"><Check size={14} strokeWidth={3} /></div>
                <span>Email Support</span>
              </li>
            </ul>
            
            <button className="pricing-btn btn-secondary">
              <CreditCard size={18} /> Buy Starter
            </button>
          </div>
        </div>

        {/* Tier 2 */}
        <div className="pricing-card popular">
          <div className="popular-badge">
            <Star size={12} fill="#fff" /> MOST POPULAR
          </div>
          <div className="pricing-card-bg"></div>
          
          <div className="pricing-content">
            <div className="pricing-header">
              <div>
                <h4>Pro Pack</h4>
                <div className="pricing-credits">25 Credits</div>
              </div>
              <div className="pricing-price">$10</div>
            </div>
            
            <p className="pricing-desc">
              Best value. Comprehensive AI assistance for a full job search campaign and multiple roles.
            </p>

            <ul className="pricing-features">
              <li>
                <div className="feature-check"><Check size={14} strokeWidth={3} /></div>
                <span><strong>25 AI Generations</strong></span>
              </li>
              <li>
                <div className="feature-check"><Check size={14} strokeWidth={3} /></div>
                <span>Premium ATS Optimization</span>
              </li>
              <li>
                <div className="feature-check"><Check size={14} strokeWidth={3} /></div>
                <span>24/7 Priority Support</span>
              </li>
              <li>
                <div className="feature-check"><Check size={14} strokeWidth={3} /></div>
                <span>Cover Letter Gen <span className="new-tag">New</span></span>
              </li>
            </ul>
            
            <button className="pricing-btn btn-primary">
              <Zap size={18} fill="rgba(255,255,255,0.2)" /> Get Pro Pack
            </button>
          </div>
        </div>
      </div>
      
      <div className="secure-note">
        <Shield size={16} /> Payments are secure and encrypted.
      </div>
    </div>
  );
}
