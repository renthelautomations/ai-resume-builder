const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/UserDashboard/CreditsTab.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add useRef
content = content.replace(
  "import React, { useEffect, useState } from 'react';",
  "import React, { useEffect, useState, useRef } from 'react';"
);

// 2. Inject states and useEffects
const statesInjection = `  const [selectedPack, setSelectedPack] = useState(null);
  const { addToast } = useToast();
  
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);
  const stepperRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobileView) return;
    const container = stepperRef.current;
    if (!container) return;

    if (container.scrollLeft === 0) {
      const cards = Array.from(container.children).filter(c => c.classList.contains('step-column'));
      const startCard = cards[30];
      if (startCard) {
        const targetLeft = startCard.offsetLeft - (container.clientWidth / 2) + (startCard.clientWidth / 2);
        container.scrollTo({ left: targetLeft, behavior: 'auto' });
      }
    }

    let isTouching = false;
    const onTouchStart = () => { isTouching = true; };
    const onTouchEnd = () => { isTouching = false; };
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    const scrollToCard = (card, behavior = 'smooth') => {
      if (!card) return;
      const targetLeft = card.offsetLeft - (container.clientWidth / 2) + (card.clientWidth / 2);
      container.scrollTo({ left: targetLeft, behavior });
    };

    const interval = setInterval(() => {
      if (!stepperRef.current || isTouching) return;
      const cards = Array.from(container.children).filter(c => c.classList.contains('step-column'));
      if (cards.length === 0) return;
      
      const containerCenter = container.getBoundingClientRect().left + (container.clientWidth / 2);
      let closestCard = cards[0];
      let minDistance = Infinity;
      let currentIndex = 0;
      
      cards.forEach((card, index) => {
        const cardCenter = card.getBoundingClientRect().left + (card.clientWidth / 2);
        const distance = Math.abs(containerCenter - cardCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestCard = card;
          currentIndex = index;
        }
      });
      
      if (currentIndex > 50 || currentIndex < 10) {
        const equivalentIndex = 30 + (currentIndex % 3);
        scrollToCard(cards[equivalentIndex], 'auto');
        setTimeout(() => {
          scrollToCard(cards[equivalentIndex + 1], 'smooth');
        }, 50);
      } else {
        scrollToCard(cards[currentIndex + 1], 'smooth');
      }
    }, 5000);
    
    return () => {
      clearInterval(interval);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobileView]);

  const pricingPacks = [
    {
      id: 'Basic',
      title: 'Starter Pack',
      credits: 20,
      price: 20,
      desc: 'Perfect for tweaking an existing resume or targeting a few specific job applications.',
      icon: <CreditCard size={20} />,
      color: '#3B82F6',
      features: ['20 AI Generations', 'Standard ATS Formatting'],
      buttonVariant: 'btn-secondary',
      badge: null
    },
    {
      id: 'Pro',
      title: 'Pro Pack',
      credits: 60,
      price: 50,
      desc: 'The sweet spot. Great for active job seekers applying to multiple roles.',
      icon: <Star size={20} fill="currentColor" />,
      color: '#10B981',
      features: ['60 AI Generations', 'Priority Processing', 'Discounted Rate'],
      buttonVariant: 'btn-primary',
      badge: 'Most Popular'
    },
    {
      id: 'Ultimate',
      title: 'Ultimate Pack',
      credits: 130,
      price: 100,
      desc: 'For serious professionals who want limitless generation power and variations.',
      icon: <Shield size={20} />,
      color: '#8B5CF6',
      features: ['130 AI Generations', 'Best Value', 'VIP Support'],
      buttonVariant: 'btn-secondary',
      badge: null
    }
  ];

  const renderPacks = isMobileView ? Array(20).fill(pricingPacks).flat() : pricingPacks;
`;

content = content.replace(
  "  const [selectedPack, setSelectedPack] = useState(null);\n  const { addToast } = useToast();",
  statesInjection
);

// 3. Replace the pricing-grid
const startStr = `<div className="pricing-grid">`;
const endStr = `{/* Tier 3 */}`;
// we need to find where the pricing-grid ends
const parts = content.split('<div className="pricing-grid">');
const beforeGrid = parts[0];
const afterGridPart = parts[1].split('</div>\n      </div>\n\n      {subscriptions.length > 0 && (');
const afterGrid = '\n      {subscriptions.length > 0 && (' + afterGridPart[1];

const newGrid = `      <div className={isMobileView ? "stepper-container" : "pricing-grid"} ref={stepperRef}>
        {renderPacks.map((pack, index) => {
          const delay = isMobileView ? '0s' : \`\${(index % 3 + 1) * 0.1}s\`;
          const isPopular = pack.badge === 'Most Popular';
          
          return (
            <div 
              key={\`\${pack.id}-\${index}\`} 
              className={\`step-column \${isPopular ? 'popular' : ''}\`}
              style={{ 
                animationDelay: delay,
                ...(isPopular ? {
                  background: 'linear-gradient(180deg, rgba(26, 35, 51, 0.9) 0%, rgba(18, 24, 38, 0.9) 100%)',
                  borderColor: 'rgba(59, 130, 246, 0.4)',
                  transform: 'scale(1.03)',
                  zIndex: 2,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                } : {
                  background: 'var(--panel-bg)',
                  borderColor: 'var(--border)'
                })
              }}
            >
              {pack.badge && (
                <div className="popular-badge" style={{ top: '-12px' }}>{pack.badge}</div>
              )}
              
              <div className="step-icon-circle" style={{ border: \`2px solid \${pack.color}66\`, color: pack.color, boxShadow: \`0 0 20px \${pack.color}26\` }}>
                {pack.icon}
              </div>
              
              <div className="step-text-col" style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px 0', color: '#fff' }}>{pack.title}</h3>
                <div style={{ color: pack.color, fontWeight: '600', fontSize: '14px', marginBottom: '16px' }}>{pack.credits} Credits</div>
                
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#fff', marginBottom: '16px' }}>₱{pack.price}</div>
                
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 24px 0', minHeight: '40px' }}>
                  {pack.desc}
                </p>

                <ul className="pricing-features" style={{ textAlign: 'left', marginBottom: '24px', flex: 1, listStyle: 'none', padding: 0 }}>
                  {pack.features.map((feature, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px', color: '#E2E8F0', fontSize: '13px' }}>
                      <div className="feature-check" style={{ 
                        background: isPopular ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
                        color: isPopular ? '#C084FC' : '#60A5FA', 
                        borderRadius: '50%', padding: '4px', flexShrink: 0 
                      }}>
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button 
                  className={\`pricing-btn \${pack.buttonVariant}\`}
                  onClick={() => handleRequestPurchase(pack.id)}
                  disabled={isRequesting}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', border: pack.buttonVariant === 'btn-secondary' ? '1px solid rgba(255,255,255,0.1)' : 'none', color: '#fff' }}
                >
                  {pack.icon} Request Purchase
                </button>
              </div>
            </div>
          );
        })}
      </div>`;

fs.writeFileSync(filePath, beforeGrid + newGrid + afterGrid);
console.log('done');
