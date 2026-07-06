import React from 'react';

export default function StructuredProfileView({ profileData }) {
  if (!profileData) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      {/* Personal Info */}
      <div style={{ background: '#111827', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h4 style={{ color: '#60a5fa', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', fontWeight: 'bold' }}>Contact & Links</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div><span style={{ color: '#9ca3af', fontSize: '13px' }}>Email</span><div style={{ color: 'white' }}>{profileData?.personal?.email || '-'}</div></div>
          <div><span style={{ color: '#9ca3af', fontSize: '13px' }}>Phone</span><div style={{ color: 'white' }}>{profileData?.personal?.phone || '-'}</div></div>
          <div><span style={{ color: '#9ca3af', fontSize: '13px' }}>LinkedIn</span><div style={{ color: 'white' }}>{profileData?.personal?.linkedin || '-'}</div></div>
          <div><span style={{ color: '#9ca3af', fontSize: '13px' }}>GitHub/Portfolio</span><div style={{ color: 'white' }}>{profileData?.personal?.github || profileData?.personal?.website || '-'}</div></div>
        </div>
      </div>

      {/* Summary */}
      {profileData?.summary && (
        <div style={{ background: '#111827', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h4 style={{ color: '#60a5fa', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', fontWeight: 'bold' }}>Professional Summary</h4>
          <p style={{ color: '#d1d5db', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{profileData.summary}</p>
        </div>
      )}

      {/* Experience */}
      {profileData?.experience?.length > 0 && (
        <div style={{ background: '#111827', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h4 style={{ color: '#60a5fa', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px', fontWeight: 'bold' }}>Experience</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {profileData.experience.map((exp, i) => (
              <div key={i} style={{ borderLeft: '2px solid #1e3a8a', paddingLeft: '16px' }}>
                <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>{exp.role}</div>
                <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '12px' }}>{exp.company} • {exp.date} • {exp.location}</div>
                <ul style={{ color: '#d1d5db', listStyleType: 'disc', paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {exp.bullets?.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {profileData?.education?.length > 0 && (
        <div style={{ background: '#111827', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h4 style={{ color: '#60a5fa', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px', fontWeight: 'bold' }}>Education</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {profileData.education.map((edu, i) => (
              <div key={i}>
                <div style={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}>{edu.degree}</div>
                <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: edu.bullets?.length ? '12px' : '0' }}>{edu.school} • {edu.date}</div>
                {edu.bullets?.length > 0 && (
                  <ul style={{ color: '#d1d5db', listStyleType: 'disc', paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {edu.bullets.map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {profileData?.skills?.length > 0 && (
        <div style={{ background: '#111827', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h4 style={{ color: '#60a5fa', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', fontWeight: 'bold' }}>Skills</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {profileData.skills.map((skill, i) => (
              <span key={i} style={{ background: '#1e3a8a', color: '#bfdbfe', padding: '6px 12px', borderRadius: '100px', fontSize: '13px', fontWeight: '500' }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {profileData?.certifications?.length > 0 && (
        <div style={{ background: '#111827', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h4 style={{ color: '#60a5fa', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', fontWeight: 'bold' }}>Certifications & Licenses</h4>
          <ul style={{ color: '#d1d5db', listStyleType: 'disc', paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {profileData.certifications.map((cert, i) => (
              <li key={i}>{cert}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
