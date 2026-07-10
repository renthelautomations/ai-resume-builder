import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import ConfirmationModal from './ConfirmationModal';

export default function ResumeEditForm({ resumeData, setResumeData, profileText, jobDescription }) {
  const { addToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);

  if (!resumeData) return null;

  const handleChange = (field, value) => {
    setResumeData(prev => ({ ...prev, [field]: value }));
  };

  const toggleHideSection = (section) => {
    const field = `hide_${section}`;
    const willBeHidden = !resumeData[field];
    setResumeData(prev => ({ ...prev, [field]: willBeHidden }));
    
    const sectionName = section.charAt(0).toUpperCase() + section.slice(1);
    addToast(`Success! ${sectionName} are ${willBeHidden ? 'hidden' : 'visible'}!`, 'success');
  };

  const confirmDeleteEntry = () => {
    if (!deleteTarget) return;
    const { section, index } = deleteTarget;
    setResumeData(prev => {
      const newArray = [...(prev[section] || [])];
      newArray.splice(index, 1);
      return { ...prev, [section]: newArray };
    });
    
    // Format section name for toast (e.g., "experience" -> "Experience")
    const sectionName = section === 'certifications' ? 'Certification' : 
                        section === 'experience' ? 'Experience' : 
                        section === 'projects' ? 'Project' : 
                        section === 'education' ? 'Education' : section;
                        
    addToast(`${sectionName} entry deleted`, 'success');
    setDeleteTarget(null);
  };

  const handleArrayChange = (arrayField, index, field, value) => {
    setResumeData(prev => {
      const newArray = [...(prev[arrayField] || [])];
      if (newArray[index]) {
        newArray[index] = { ...newArray[index], [field]: value };
      }
      return { ...prev, [arrayField]: newArray };
    });
  };

  const handleBulletChange = (arrayField, index, bulletIndex, value, subField = 'bullets') => {
    setResumeData(prev => {
      const newArray = [...(prev[arrayField] || [])];
      if (newArray[index]) {
        const newBullets = [...(newArray[index][subField] || [])];
        newBullets[bulletIndex] = value;
        newArray[index] = { ...newArray[index], [subField]: newBullets };
      }
      return { ...prev, [arrayField]: newArray };
    });
  };
  
  const addBullet = (arrayField, index, subField = 'bullets') => {
    setResumeData(prev => {
      const newArray = [...(prev[arrayField] || [])];
      if (newArray[index]) {
        const newBullets = [...(newArray[index][subField] || []), ""];
        newArray[index] = { ...newArray[index], [subField]: newBullets };
      }
      return { ...prev, [arrayField]: newArray };
    });
    addToast('New detail added!', 'success');
  };

  const removeBullet = (arrayField, index, bulletIndex, subField = 'bullets') => {
    setResumeData(prev => {
      const newArray = [...(prev[arrayField] || [])];
      if (newArray[index] && newArray[index][subField]) {
        const newBullets = newArray[index][subField].filter((_, i) => i !== bulletIndex);
        newArray[index] = { ...newArray[index], [subField]: newBullets };
      }
      return { ...prev, [arrayField]: newArray };
    });
  };

  const addSectionEntry = (arrayField, template) => {
    setResumeData(prev => ({
      ...prev,
      [arrayField]: [...(prev[arrayField] || []), template]
    }));
    const names = { experience: 'Experience', projects: 'Project', education: 'Education' };
    addToast(`New ${names[arrayField] || 'item'} added!`, 'success');
  };

  const removeSectionEntry = (arrayField, index) => {
    setResumeData(prev => ({
      ...prev,
      [arrayField]: (prev[arrayField] || []).filter((_, i) => i !== index)
    }));
  };

  const [skillsText, setSkillsText] = useState((resumeData.skills || []).join(" | "));
  const [certsText, setCertsText] = useState((resumeData.certifications || []).join(" | "));
  const [suggestedSkills, setSuggestedSkills] = useState([]);

  useEffect(() => {
    if (!profileText || !jobDescription) {
      setSuggestedSkills([]);
      return;
    }

    const allSkillsMatch = profileText.match(/CORE COMPETENCIES:([\s\S]*?)EXPERIENCE:/);
    let allSkills = [];
    if (allSkillsMatch) {
      const skillsLines = allSkillsMatch[1].split('\n');
      skillsLines.forEach(line => {
        if (line.includes(':')) {
          const skillsList = line.split(':')[1].split(',').map(s => s.trim()).filter(Boolean);
          allSkills.push(...skillsList);
        }
      });
    }

    const currentSkills = skillsText.split('|').map(s => s.trim().toLowerCase());
    const desc = jobDescription.toLowerCase();

    const suggested = allSkills.filter(skill => {
      if (currentSkills.includes(skill.toLowerCase())) return false;
      const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
      return regex.test(desc);
    });

    setSuggestedSkills(suggested);
  }, [profileText, jobDescription, skillsText]);

  const handleSkillsBlur = () => {
    const arr = skillsText.split(/[,|]/).map(s => s.trim()).filter(Boolean);
    setResumeData(prev => ({ ...prev, skills: arr }));
    setSkillsText(arr.join(" | "));
  };

  const handleCertsBlur = () => {
    const arr = certsText.split(/[,|]/).map(s => s.trim()).filter(Boolean);
    setResumeData(prev => ({ ...prev, certifications: arr }));
    setCertsText(arr.join(" | "));
  };

  return (
    <div className="edit-form" style={{
      width: '100%',
      background: 'white',
      padding: '40px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      color: '#0F172A',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 16px 0', borderBottom: '2px solid #E2E8F0', paddingBottom: '12px' }}>Edit Resume</h2>
      
      {/* Personal Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#334155' }}>Personal Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Full Name</label>
            <input 
              type="text" 
              value={resumeData.full_name || ''} 
              onChange={e => handleChange('full_name', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>Contact Line</label>
            <input 
              type="text" 
              value={resumeData.contact_line || ''} 
              onChange={e => handleChange('contact_line', e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
              placeholder="Email | Phone | LinkedIn"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#334155' }}>Professional Summary</h3>
        <textarea 
          value={resumeData.summary || ''} 
          onChange={e => handleChange('summary', e.target.value)}
          rows={4}
          style={{ width: '100%', padding: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
        />
      </div>

      {/* Skills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#334155' }}>Core Skills</h3>
        <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>Separate skills with commas or pipes (|)</p>
        <textarea 
          value={skillsText} 
          onChange={e => setSkillsText(e.target.value)}
          onBlur={handleSkillsBlur}
          rows={2}
          style={{ width: '100%', padding: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
        />
        
        {suggestedSkills.length > 0 && (
          <div style={{ marginTop: '4px', animation: 'fadeIn 0.5s ease' }}>
            <p style={{ fontSize: '12px', fontWeight: '500', color: '#64748B', marginBottom: '8px' }}>Suggested from Job Description:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {suggestedSkills.map(skill => (
                <button 
                  key={skill}
                  onClick={() => {
                    const separator = skillsText.trim() === '' || skillsText.trim().endsWith('|') ? '' : ' | ';
                    const newText = (skillsText.trim() + separator + skill).trim();
                    setSkillsText(newText);
                    setResumeData(prev => ({
                      ...prev,
                      skills: newText.split('|').map(s => s.trim()).filter(Boolean)
                    }));
                    addToast(`Skill "${skill}" added!`, 'success');
                  }}
                  style={{
                    width: 'max-content',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: '#3B82F6',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '20px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease',
                    animation: 'fadeIn 0.3s ease'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <Plus size={12} /> {skill}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Experience */}
      {resumeData.experience && resumeData.experience.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '16px 0 0 0', color: '#334155', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>Work Experience</h3>
          {resumeData.experience.map((job, idx) => (
            <div key={`exp-${idx}`} style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <input 
                  type="text" placeholder="Job Title" value={job.title || ''} onChange={e => handleArrayChange('experience', idx, 'title', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px', fontWeight: '500' }}
                />
                <input 
                  type="text" placeholder="Company Name" value={job.company || ''} onChange={e => handleArrayChange('experience', idx, 'company', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px', fontWeight: '500' }}
                />
                <input 
                  type="text" placeholder="Location" value={job.location || ''} onChange={e => handleArrayChange('experience', idx, 'location', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px' }}
                />
                <input 
                  type="text" placeholder="Dates (e.g. Jan 2020 - Present)" value={job.dates || ''} onChange={e => handleArrayChange('experience', idx, 'dates', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>Bullet Points</label>
                {(job.bullets || []).map((bullet, bIdx) => (
                  <div key={`exp-b-${idx}-${bIdx}`} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '8px', alignItems: 'start', width: '100%' }}>
                    <div style={{ padding: '8px 4px', color: '#94A3B8' }}><GripVertical size={16} /></div>
                    <textarea
                      value={bullet}
                      onChange={e => handleBulletChange('experience', idx, bIdx, e.target.value)}
                      rows={2}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                    <button onClick={() => removeBullet('experience', idx, bIdx)} style={{ padding: '8px', background: 'transparent', color: '#EF4444', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <button onClick={() => addBullet('experience', idx)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', background: 'transparent', color: '#3B82F6', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                    <Plus size={14} /> Add Bullet
                  </button>
                  <button onClick={() => setDeleteTarget({ section: 'experience', index: idx })} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', background: 'transparent', color: '#EF4444', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                    <Trash2 size={14} /> Delete Entry
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button 
            onClick={() => addSectionEntry('experience', { title: '', company: '', location: '', dates: '', bullets: [] })} 
            style={{ width: '100%', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', border: '1px dashed #3B82F6', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' }}
          >
            <Plus size={16} /> Add Experience
          </button>
        </div>
      )}

      {/* Projects */}
      {resumeData.projects && resumeData.projects.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#334155' }}>Projects</h3>
              <button onClick={() => toggleHideSection('projects')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: resumeData.hide_projects ? '#94A3B8' : '#3B82F6', cursor: 'pointer', padding: '4px' }} title={resumeData.hide_projects ? "Unhide Projects" : "Hide Projects"}>
                {resumeData.hide_projects ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: resumeData.hide_projects ? 0.4 : 1, pointerEvents: resumeData.hide_projects ? 'none' : 'auto', transition: 'all 0.2s ease' }}>
            {resumeData.projects.map((proj, idx) => (
            <div key={`proj-${idx}`} style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <input 
                  type="text" placeholder="Project Name" value={proj.name || ''} onChange={e => handleArrayChange('projects', idx, 'name', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px', fontWeight: '500' }}
                />
                <input 
                  type="text" placeholder="Dates" value={proj.dates || ''} onChange={e => handleArrayChange('projects', idx, 'dates', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px' }}
                />
                <input 
                  type="text" placeholder="Tech Stack" value={proj.stack || ''} onChange={e => handleArrayChange('projects', idx, 'stack', e.target.value)}
                  style={{ gridColumn: 'span 2', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>Bullet Points</label>
                {(proj.bullets || []).map((bullet, bIdx) => (
                  <div key={`proj-b-${idx}-${bIdx}`} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '8px', alignItems: 'start', width: '100%' }}>
                    <div style={{ padding: '8px 4px', color: '#94A3B8' }}><GripVertical size={16} /></div>
                    <textarea
                      value={bullet}
                      onChange={e => handleBulletChange('projects', idx, bIdx, e.target.value)}
                      rows={2}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                    <button onClick={() => removeBullet('projects', idx, bIdx)} style={{ padding: '8px', background: 'transparent', color: '#EF4444', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <button onClick={() => addBullet('projects', idx)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', background: 'transparent', color: '#3B82F6', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                    <Plus size={14} /> Add Bullet
                  </button>
                  <button onClick={() => setDeleteTarget({ section: 'projects', index: idx })} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', background: 'transparent', color: '#EF4444', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                    <Trash2 size={14} /> Delete Entry
                  </button>
                </div>
              </div>
            </div>
          ))}
            <button 
              onClick={() => addSectionEntry('projects', { name: '', dates: '', stack: '', link: '', location: '', bullets: [] })} 
              style={{ width: '100%', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', border: '1px dashed #3B82F6', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' }}
            >
              <Plus size={16} /> Add Project
            </button>
          </div>
        </div>
      )}

      {/* Education */}
      {resumeData.education && resumeData.education.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#334155' }}>Education</h3>
              <button onClick={() => toggleHideSection('education')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: resumeData.hide_education ? '#94A3B8' : '#3B82F6', cursor: 'pointer', padding: '4px' }} title={resumeData.hide_education ? "Unhide Education" : "Hide Education"}>
                {resumeData.hide_education ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: resumeData.hide_education ? 0.4 : 1, pointerEvents: resumeData.hide_education ? 'none' : 'auto', transition: 'all 0.2s ease' }}>
            {resumeData.education.map((edu, idx) => (
            <div key={`edu-${idx}`} style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input 
                type="text" placeholder="Degree" value={edu.degree || ''} onChange={e => handleArrayChange('education', idx, 'degree', e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px', fontWeight: '500' }}
              />
              <input 
                type="text" placeholder="School" value={edu.school || ''} onChange={e => handleArrayChange('education', idx, 'school', e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px', fontWeight: '500' }}
              />
              <input 
                type="text" placeholder="Location" value={edu.location || ''} onChange={e => handleArrayChange('education', idx, 'location', e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px' }}
              />
              <input 
                type="text" placeholder="Dates" value={edu.dates || ''} onChange={e => handleArrayChange('education', idx, 'dates', e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px' }}
              />
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>Awards / Recognitions (Optional)</label>
                {(edu.details || []).map((detail, dIdx) => (
                  <div key={`edu-d-${idx}-${dIdx}`} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '8px', alignItems: 'start', width: '100%' }}>
                    <div style={{ padding: '8px 4px', color: '#94A3B8' }}><GripVertical size={16} /></div>
                    <textarea
                      value={detail}
                      onChange={e => handleBulletChange('education', idx, dIdx, e.target.value, 'details')}
                      rows={2}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                    <button onClick={() => removeBullet('education', idx, dIdx, 'details')} style={{ padding: '8px', background: 'transparent', color: '#EF4444', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <button onClick={() => addBullet('education', idx, 'details')} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', background: 'transparent', color: '#3B82F6', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                    <Plus size={14} /> Add Detail
                  </button>
                  <button onClick={() => setDeleteTarget({ section: 'education', index: idx })} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', background: 'transparent', color: '#EF4444', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                    <Trash2 size={14} /> Delete Entry
                  </button>
                </div>
              </div>
            </div>
          ))}
            <button 
              onClick={() => addSectionEntry('education', { degree: '', school: '', location: '', dates: '', details: [] })} 
              style={{ width: '100%', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', border: '1px dashed #3B82F6', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' }}
            >
              <Plus size={16} /> Add Education
            </button>
          </div>
        </div>
      )}

      {/* Certifications */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '16px', marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#334155' }}>Certifications</h3>
            <button onClick={() => toggleHideSection('certifications')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: resumeData.hide_certifications ? '#94A3B8' : '#3B82F6', cursor: 'pointer', padding: '4px' }} title={resumeData.hide_certifications ? "Unhide Certifications" : "Hide Certifications"}>
              {resumeData.hide_certifications ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: resumeData.hide_certifications ? 0.4 : 1, pointerEvents: resumeData.hide_certifications ? 'none' : 'auto', transition: 'all 0.2s ease' }}>
          <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>Separate with commas or pipes (|)</p>
          <textarea 
          value={certsText} 
          onChange={e => setCertsText(e.target.value)}
          onBlur={handleCertsBlur}
          rows={2}
          style={{ width: '100%', padding: '12px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
        />
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Entry"
        message="Are you sure you want to delete this entry? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDeleteEntry}
        onCancel={() => setDeleteTarget(null)}
        type="warning"
      />

    </div>
  );
}
