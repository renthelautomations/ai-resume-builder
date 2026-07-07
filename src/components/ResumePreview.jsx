import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { FileText, Settings, Wand2, Download } from 'lucide-react';
import ResumePDF from './ResumePDF';
import ResumeEditForm from './ResumeEditForm';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '../context/ToastContext';

class PDFErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("PDF generation error caught by boundary:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <button disabled style={{ width: 'auto', background: '#334155', color: '#EF4444', fontSize: '14px', padding: '10px 16px', borderRadius: '8px', border: '1px solid #EF4444' }}>
          PDF Error
        </button>
      );
    }
    return this.props.children;
  }
}

function LoadingView({ loadingStep }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 15000;
    const intervalTime = 100;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const rawProgress = 1 - Math.pow(1 - currentStep / steps, 3); 
      const currentPercentage = Math.min(Math.floor(rawProgress * 100), 98);
      setProgress(currentPercentage);
      
      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="right centered">
      <div className="mobile-order-4" style={{ width: '100%', margin: 'auto' }}>
        <div id="loadingState" style={{ margin: 'auto', width: '100%', maxWidth: '400px', textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <Settings size={56} strokeWidth={1.5} color="var(--accent)" className="icon-spin" />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontWeight: 500, fontSize: '15px', color: 'var(--text-main)' }}>
          <span>{loadingStep}</span>
          <span style={{ color: 'var(--accent)' }}>{progress}%</span>
        </div>
        
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
          <div 
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent), #A78BFA)',
              borderRadius: '4px',
              width: `${progress}%`,
              transition: 'width 0.2s ease-out'
            }} 
          />
        </div>
        </div>
      </div>
    </div>
  );
}

function esc(s) {
  return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

export default function ResumePreview({ resumeData, setResumeData, isLoading, loadingStep, onDownloadDocx, onSaveResume, isSavingResume, profileText, jobDescription, onGenerate, status }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftData, setDraftData] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showBackModal, setShowBackModal] = useState(false);
  const containerRef = useRef(null);
  const { addToast } = useToast();

  useLayoutEffect(() => {
    if (!resumeData || !containerRef.current || isEditing) return;
    
    try {
      const pagesContainer = containerRef.current;
      pagesContainer.innerHTML = "";
      
      // We must ensure the container is visible to measure scrollHeight correctly
      pagesContainer.style.display = "flex";

      const PAGE_HEIGHT = 1248; // 13in at 96ppi (approx 1248px)
      let currentPage = createPage();
      pagesContainer.appendChild(currentPage);

      function createPage() {
        const p = document.createElement('div');
        p.className = 'page';
        return p;
      }

      function appendBlock(htmlString) {
        if(!htmlString) return;
        const temp = document.createElement('div');
        temp.innerHTML = htmlString.trim();
        const elements = Array.from(temp.childNodes);
        
        elements.forEach(el => {
          currentPage.appendChild(el);
          if(currentPage.scrollHeight > PAGE_HEIGHT) {
            currentPage.removeChild(el);
            currentPage = createPage();
            pagesContainer.appendChild(currentPage);
            currentPage.appendChild(el);
          }
        });
      }

      function appendList(items) {
        if(!items || !items.length) return;
        let ul = document.createElement('ul');
        ul.className = 'r-bullets';
        currentPage.appendChild(ul);

        items.forEach((item, index) => {
          let li = document.createElement('li');
          li.innerHTML = esc(item);
          ul.appendChild(li);
          if(currentPage.scrollHeight > PAGE_HEIGHT) {
            ul.removeChild(li);
            if(ul.childNodes.length === 0) {
              currentPage.removeChild(ul);
              // "Keep with next": if the first bullet doesn't fit, move the header block too
              if (index === 0 && currentPage.lastChild) {
                const headerBlock = currentPage.lastChild;
                currentPage.removeChild(headerBlock);
                currentPage = createPage();
                pagesContainer.appendChild(currentPage);
                currentPage.appendChild(headerBlock);
              } else {
                currentPage = createPage();
                pagesContainer.appendChild(currentPage);
              }
            } else {
              currentPage = createPage();
              pagesContainer.appendChild(currentPage);
            }
            ul = document.createElement('ul');
            ul.className = 'r-bullets';
            currentPage.appendChild(ul);
            ul.appendChild(li);
          }
        });
      }

      const r = resumeData;
      appendBlock(`<div class="r-name">${esc(r.full_name || "").toUpperCase()}</div>`);
      appendBlock(`<div class="r-contact">${esc(r.contact_line || "")}</div>`);
      
      if (r.summary) {
        appendBlock(`
          <div>
            <div class="r-section">Professional Summary</div>
            <div class="r-summary">${esc(r.summary)}</div>
          </div>
        `);
      }

      if (r.skills && r.skills.length) {
        appendBlock(`
          <div>
            <div class="r-section">Core Skills</div>
            <div class="r-skills">${r.skills.map(esc).join(" &nbsp;|&nbsp; ")}</div>
          </div>
        `);
      }

      if (r.experience && r.experience.length) {
        const first = r.experience[0];
        appendBlock(`
          <div>
            <div class="r-section">Work Experience</div>
            <div>
              <div class="r-row"><b>${esc(first.company)}</b><span>${esc(first.location||"")}</span></div>
              <div class="r-row"><i>${esc(first.title)}</i><i>${esc(first.dates)}</i></div>
            </div>
          </div>
        `);
        appendList(first.bullets);
        
        r.experience.slice(1).forEach((job) => {
          appendBlock(`
            <div>
              <div class="r-row"><b>${esc(job.company)}</b><span>${esc(job.location||"")}</span></div>
              <div class="r-row"><i>${esc(job.title)}</i><i>${esc(job.dates)}</i></div>
            </div>
          `);
          appendList(job.bullets);
        });
      }

      if (r.projects && r.projects.length) {
        const first = r.projects[0];
        appendBlock(`
          <div>
            <div class="r-section">Projects</div>
            <div>
              <div class="r-row"><b>${esc(first.name)}</b><i>${esc(first.dates)}</i></div>
              ${first.stack ? `<div class="r-stack">Tech Stack: ${esc(first.stack)}</div>` : ''}
            </div>
          </div>
        `);
        appendList(first.bullets);
        
        r.projects.slice(1).forEach((proj) => {
          appendBlock(`
            <div>
              <div class="r-row"><b>${esc(proj.name)}</b><i>${esc(proj.dates)}</i></div>
              ${proj.stack ? `<div class="r-stack">Tech Stack: ${esc(proj.stack)}</div>` : ''}
            </div>
          `);
          appendList(proj.bullets);
        });
      }

      if (r.education && r.education.length) {
        const first = r.education[0];
        appendBlock(`
          <div>
            <div class="r-section">Education</div>
            <div>
              <div class="r-row"><b>${esc(first.degree)}</b><span>${esc(first.location||"")}</span></div>
              <div class="r-row"><i>${esc(first.school)}</i><i>${esc(first.dates||"")}</i></div>
            </div>
          </div>
        `);
        appendList(first.details);
        
        r.education.slice(1).forEach((e) => {
          appendBlock(`
            <div>
              <div class="r-row"><b>${esc(e.degree)}</b><span>${esc(e.location||"")}</span></div>
              <div class="r-row"><i>${esc(e.school)}</i><i>${esc(e.dates||"")}</i></div>
            </div>
          `);
          appendList(e.details);
        });
      }

      if (r.certifications && r.certifications.length) {
        appendBlock(`
          <div>
            <div class="r-section">Certifications</div>
            <div class="r-skills">${r.certifications.map(esc).join(" &nbsp;|&nbsp; ")}</div>
          </div>
        `);
      }

    } catch (err) {
      console.error("Error building preview DOM:", err);
    }

  }, [resumeData, isEditing]); // Re-run when data changes (if not editing)

  const [buttonError, setButtonError] = useState('');
  const [buttonSuccess, setButtonSuccess] = useState('');

  const prevIsLoadingRef = useRef(isLoading);
  useEffect(() => {
    if (prevIsLoadingRef.current === true && isLoading === false) {
      if (status?.type === 'success') {
        setButtonSuccess('Successfully Generated!');
        setTimeout(() => setButtonSuccess(''), 3000);
      }
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, status]);

  const handleGenerateClick = () => {
    const hasProfile = Boolean(profileText && profileText.trim());
    const hasJD = Boolean(jobDescription && jobDescription.trim());
    
    if (!hasProfile && !hasJD) {
      setButtonError("Missing: Profile & Job Description");
      setTimeout(() => setButtonError(''), 3000);
      return;
    }
    if (!hasProfile) {
      setButtonError("Missing: Profile");
      setTimeout(() => setButtonError(''), 3000);
      return;
    }
    if (!hasJD) {
      setButtonError("Missing: Job Description");
      setTimeout(() => setButtonError(''), 3000);
      return;
    }
    
    if (onGenerate) onGenerate();
  };

  if (!resumeData && !isLoading) {
    return (
      <div className="right">
        <div className="empty-state-wrapper" style={{ width: '100%', padding: '20px 0' }}>
          <div id="how-it-works-headers" className="mobile-order-1" style={{ maxWidth: '850px', margin: '0 auto 12px auto', width: '100%', textAlign: 'center' }}>
            <h1 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.02em', color: '#fff', lineHeight: '1.2', paddingTop: '4px' }}>Generate a Tailored Resume</h1>
            <div style={{ fontSize: '18px', color: 'var(--text-muted)', marginBottom: '0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Harvard Resume Template</div>
          </div>

          <div className="mobile-order-3" style={{ width: '100%', maxWidth: '400px', margin: '0 auto 24px auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.1)', 
                color: '#10B981', 
                padding: '4px 10px', 
                borderRadius: '100px', 
                fontSize: '11px', 
                fontWeight: '700', 
                letterSpacing: '0.05em', 
                border: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'inline-block',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}>
                STEP 2
              </div>
            </div>

              <button 
                className="primary-btn" 
                onClick={handleGenerateClick} 
                disabled={isLoading}
                style={{ 
                  width: '100%', 
                  padding: '16px',
                  fontSize: '18px',
                  fontWeight: '700',
                  background: buttonError ? '#EF4444' : buttonSuccess ? '#10B981' : '', 
                  animation: buttonError ? 'errorGlowLoop 2s infinite ease-in-out' : buttonSuccess ? 'successGlowLoop 2s infinite ease-in-out' : 'buttonGlowLoop 2s infinite ease-in-out',
                  transition: 'all 0.3s ease'
                }}
              >
                {isLoading && <span className="spinner"></span>}
                <span>{buttonError ? buttonError : buttonSuccess ? buttonSuccess : (isLoading ? 'Generating...' : 'Generate Resume')}</span>
              </button>
              {status?.text && !buttonError && !buttonSuccess && (
                <div id="status" className={status.type === 'err' ? 'err' : ''} style={{ marginTop: '16px', textAlign: 'center' }}>
                  {status.text}
                </div>
              )}
          </div>

          <div id="how-it-works-steps" className="mobile-order-1" style={{ maxWidth: '850px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', background: 'linear-gradient(90deg, #60A5FA, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>How It Works</h2>
            
            <div className="stepper-container">
              {/* The Connecting Line */}
              <div className="stepper-line" style={{ background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(16, 185, 129, 0.2) 50%, rgba(139, 92, 246, 0.2) 100%)' }} />

              {/* Step 1 */}
              <div className="step-column" style={{ animationDelay: '0.1s' }}>
                <div className="step-icon-circle" style={{ border: '2px solid rgba(59, 130, 246, 0.4)', color: '#3B82F6', boxShadow: '0 0 20px rgba(59, 130, 246, 0.15)' }}>
                  <FileText size={20} />
                </div>
                <div className="step-text-col">
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#fff', letterSpacing: '-0.01em' }}>1. Load & Paste</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>Select one of your saved profiles, then paste the job description into the right panel. The AI will compare both to understand what the employer is looking for.</p>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="step-column" style={{ animationDelay: '0.2s' }}>
                <div className="step-icon-circle" style={{ border: '2px solid rgba(16, 185, 129, 0.4)', color: '#10B981', boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)' }}>
                  <Wand2 size={20} />
                </div>
                <div className="step-text-col">
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#fff', letterSpacing: '-0.01em' }}>2. Generate Resume</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>Click <strong>Generate Resume</strong> and wait a few moments while the AI creates your Harvard-style, ATS-friendly resume. You can review and edit it.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="step-column" style={{ animationDelay: '0.3s' }}>
                <div className="step-icon-circle" style={{ border: '2px solid rgba(139, 92, 246, 0.4)', color: '#8B5CF6', boxShadow: '0 0 20px rgba(139, 92, 246, 0.15)' }}>
                  <Download size={20} />
                </div>
                <div className="step-text-col">
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#fff', letterSpacing: '-0.01em' }}>3. Download</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>When you're satisfied with the result, click <strong>Download DOCX</strong> or <strong>Download PDF</strong> to save your completed resume.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingView loadingStep={loadingStep} />;
  }

  const safeTitle = (resumeData?.target_role || "Resume").replace(/[^a-zA-Z0-9_-]/g, "_");
  const finalPdfFilename = `Renthel_Cueto_${safeTitle}.pdf`;

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const blob = await pdf(<ResumePDF resumeData={resumeData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalPdfFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast('PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      addToast("Failed to generate PDF. Please try again.", 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveClick = () => {
    if (hasChanges) setShowSaveModal(true);
  };

  const executeSave = () => {
    setShowSaveModal(false);
    setSaveStatus('saving');
    // Save to global state
    setResumeData(draftData);
    
    setSaveStatus('saved');
    addToast('Resume changes saved successfully!', 'success');
    setIsEditing(false);
    setSaveStatus('idle');
  };

  const handleBackClick = () => {
    if (hasChanges) {
      setShowBackModal(true);
    } else {
      setIsEditing(false);
      setSaveStatus('idle');
    }
  };

  const executeBack = () => {
    setShowBackModal(false);
    setIsEditing(false);
    setSaveStatus('idle');
  };

  const handleEditClick = () => {
    setDraftData(JSON.parse(JSON.stringify(resumeData)));
    setIsEditing(true);
    setSaveStatus('idle');
  };

  const hasChanges = isEditing && JSON.stringify(draftData) !== JSON.stringify(resumeData);

  return (
    <div className="right">
      <div className="mobile-order-3" style={{ width: '100%', maxWidth: '8.5in', margin: '0 auto 16px auto' }}>
        <button 
          className="primary-btn" 
          onClick={handleGenerateClick} 
          disabled={isLoading}
          style={{ 
            width: '100%', 
            padding: '16px', 
            fontSize: '18px', 
            fontWeight: '700',
            background: buttonError ? '#EF4444' : buttonSuccess ? '#10B981' : '', 
            animation: buttonError ? 'errorGlowLoop 2s infinite ease-in-out' : buttonSuccess ? 'successGlowLoop 2s infinite ease-in-out' : 'buttonGlowLoop 2s infinite ease-in-out',
            transition: 'all 0.3s ease'
          }}
        >
          {isLoading && <span className="spinner"></span>}
          <span>{buttonError ? buttonError : buttonSuccess ? buttonSuccess : (isLoading ? 'Generating...' : 'Re-generate Resume')}</span>
        </button>
        {status?.text && !buttonError && !buttonSuccess && (
          <div id="status" className={status.type === 'err' ? 'err' : ''} style={{ textAlign: 'center', marginTop: '-4px', marginBottom: '8px' }}>
            {status.text}
          </div>
        )}
      </div>

      <div className="mobile-order-4" style={{ width: '100%', maxWidth: '8.5in', padding: '0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div id="preview-actions" style={{ width: '100%', maxWidth: '8.5in', padding: '16px 0 0 0', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', animation: 'fadeIn 0.5s ease' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', opacity: 0.8, flexShrink: 1 }}>
          💡 Tip: Click Edit to tweak text before downloading.
        </span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
          {isEditing ? (
            <>
              <button 
                onClick={handleBackClick}
                disabled={saveStatus !== 'idle'}
                style={{ 
                  width: '80px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.1)', 
                  color: '#fff', 
                  fontSize: '14px', padding: '10px 0', borderRadius: '8px', transition: 'all 0.3s ease',
                  cursor: saveStatus !== 'idle' ? 'not-allowed' : 'pointer'
                }}
              >
                Back
              </button>
              <button 
              onClick={handleSaveClick}
              disabled={saveStatus !== 'idle' || !hasChanges}
              style={{ 
                width: '100px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: saveStatus === 'saved' ? '#22C55E' : hasChanges ? '#22C55E' : '#334155', 
                color: hasChanges || saveStatus === 'saved' ? '#ffffff' : '#94A3B8', 
                fontSize: '14px', padding: '10px 0', borderRadius: '8px', transition: 'all 0.3s ease',
                cursor: (saveStatus !== 'idle' || !hasChanges) ? 'not-allowed' : 'pointer'
              }}
            >
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleEditClick}
                style={{ 
                  width: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.1)', 
                  color: '#fff', 
                  fontSize: '13px', padding: '6px 14px', borderRadius: '8px', transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
              >
                Edit
              </button>
              <button 
                onClick={onDownloadDocx} 
                disabled={isGeneratingPdf}
                style={{ 
                  width: 'auto', 
                  background: isGeneratingPdf ? '#334155' : 'rgba(255,255,255,0.1)', 
                  color: isGeneratingPdf ? '#94A3B8' : '#fff', 
                  fontSize: '13px', padding: '6px 14px', borderRadius: '8px', whiteSpace: 'nowrap',
                  cursor: isGeneratingPdf ? 'not-allowed' : 'pointer'
                }}
              >
                Download .docx
              </button>
              <button 
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                style={{ 
                  width: 'auto', 
                  background: isGeneratingPdf ? '#334155' : '#3B82F6', 
                  color: isGeneratingPdf ? '#94A3B8' : '#ffffff', 
                  fontSize: '13px', padding: '6px 14px', borderRadius: '8px', whiteSpace: 'nowrap',
                  cursor: isGeneratingPdf ? 'not-allowed' : 'pointer'
                }}
              >
                {isGeneratingPdf ? 'Preparing PDF...' : 'Download .pdf'}
              </button>
              <button 
                onClick={onSaveResume}
                disabled={isSavingResume}
                style={{ 
                  width: 'auto', 
                  background: isSavingResume ? '#334155' : '#10B981', 
                  color: isSavingResume ? '#94A3B8' : '#ffffff', 
                  fontSize: '13px', padding: '6px 14px', borderRadius: '8px', whiteSpace: 'nowrap',
                  cursor: isSavingResume ? 'not-allowed' : 'pointer'
                }}
              >
                {isSavingResume ? 'Saving...' : 'Save Resume'}
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <ResumeEditForm 
          resumeData={draftData} 
          setResumeData={setDraftData} 
          profileText={profileText}
          jobDescription={jobDescription}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }} ref={containerRef}>
          {/* Pages will be imperatively injected here by useLayoutEffect */}
        </div>
      )}

      <ConfirmationModal
        isOpen={showSaveModal}
        title="Save Changes"
        message="Are you sure you want to save these changes? This will update your resume draft."
        confirmText="Save Changes"
        cancelText="Cancel"
        type="info"
        onConfirm={executeSave}
        onCancel={() => setShowSaveModal(false)}
      />

      <ConfirmationModal
        isOpen={showBackModal}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to exit? All your edits will be discarded."
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        type="warning"
        onConfirm={executeBack}
        onCancel={() => setShowBackModal(false)}
      />
    </div>
    </div>
  );
}
