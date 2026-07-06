export function parseProfileText(text) {
  const data = {
    personal: {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      website: ''
    },
    headline: '',
    summary: '',
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: []
  };

  if (!text) return data;

  const lines = text.split('\n');
  let currentSection = 'PERSONAL';

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Detect headers
    const headerMatch = trimmed.match(/^(?:#+\s*)?(PERSONAL|HEADLINE|SUMMARY|TARGET ROLES|CORE COMPETENCIES|SKILLS|EXPERIENCE|PROJECTS|EDUCATION|CERTIFICATIONS)\b:?/i);
    
    if (headerMatch) {
      currentSection = headerMatch[1].toUpperCase();
      const remainder = trimmed.replace(headerMatch[0], '').trim();
      if (remainder) {
        processLine(currentSection, remainder, data);
      }
      return;
    }

    processLine(currentSection, trimmed, data);
  });

  return data;
}

function processLine(section, line, data) {
  if (line === '---' || line.match(/^[-_*]{3,}$/)) return;

  switch (section) {
    case 'PERSONAL':
      if (line.includes('|')) {
        const parts = line.split('|').map(s => s.trim().replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_]/g, '').trim());
        if (parts[0]) data.personal.name = parts[0];
        parts.slice(1).forEach(part => {
          if (part.includes('@')) data.personal.email = part;
          else if (part.match(/\+?\d{2,}/)) data.personal.phone = part;
          else if (part.toLowerCase().includes('linkedin.com')) data.personal.linkedin = part;
          else if (part.toLowerCase().includes('github.com')) data.personal.github = part;
          else data.personal.location = part;
        });
      }
      break;
    case 'HEADLINE':
    case 'TARGET ROLES':
      if (!data.headline) data.headline = line.replace(/[*_]/g, '');
      else data.headline += ' | ' + line.replace(/[*_]/g, '');
      break;
    case 'SUMMARY':
      data.summary = (data.summary ? data.summary + '\n' : '') + line;
      break;
    case 'CORE COMPETENCIES':
    case 'SKILLS':
      if (line.startsWith('*') || line.startsWith('-')) {
        data.skills.push(line.replace(/^[*-\s]+/, '').trim());
      } else if (line.includes(',')) {
        data.skills.push(...line.split(',').map(s => s.trim()).filter(Boolean));
      } else if (!line.startsWith('#')) {
        data.skills.push(line.replace(/[*_]/g, '').trim());
      }
      break;
    case 'EXPERIENCE':
      if (line.match(/^##\s*(?:[0-9]+\.\s*)?(.+)/)) {
        const titleLine = line.replace(/^##\s*(?:[0-9]+\.\s*)?/, '').replace(/[*_]/g, '');
        const parts = titleLine.split(/\s*[-—–]\s*/);
        let role = parts[0] ? parts[0].trim() : '';
        let company = parts[1] ? parts[1].trim() : '';
        let date = parts[2] ? parts[2].trim() : '';
        if (parts.length > 3) {
           date = parts.slice(2).join(' - ').trim();
        }
        data.experience.push({ role, company, date, location: '', bullets: [] });
      } else if (line.match(/^###\s*(.*)/)) {
        const currentExp = data.experience[data.experience.length - 1];
        if (currentExp) {
           const subheading = line.replace(/^###\s*/, '').replace(/[*_#.:\s]+/g, '').trim();
           if (subheading && subheading.length > 1) {
             currentExp.bullets.push(subheading);
           }
        }
      } else if (line.match(/^[*-\s•]+/)) {
        const currentExp = data.experience[data.experience.length - 1];
        if (currentExp) {
          const bulletText = line.replace(/^[*-\s•#.:]+/, '').replace(/[*_]/g, '').trim();
          if (bulletText && bulletText.length > 1) currentExp.bullets.push(bulletText);
        }
      } else {
        const currentExp = data.experience[data.experience.length - 1];
        if (currentExp) {
          const cleanLine = line.replace(/^[*_#\-.:\s]+/, '').replace(/[*_]/g, '').trim();
          if (cleanLine && cleanLine.length > 1) {
            if (!currentExp.bullets.length) currentExp.bullets.push(cleanLine);
            else currentExp.bullets[currentExp.bullets.length - 1] += ' ' + cleanLine;
          }
        }
      }
      break;
    case 'PROJECTS':
      if (line.match(/^##\s*(?:[A-Z]\.\s*)?(.+)/)) {
         const titleLine = line.replace(/^##\s*(?:[A-Z]\.\s*)?/, '');
         const parts = titleLine.split(/\s*[-—–]\s*/);
         let name = parts[0] || '';
         let role = parts[1] || '';
         data.projects.push({ name, role, description: '', link: '' });
      } else if (!line.startsWith('#')) {
         const currentProj = data.projects[data.projects.length - 1];
         if (currentProj) {
           currentProj.description = (currentProj.description ? currentProj.description + '\n' : '') + line;
         }
      }
      break;
    case 'EDUCATION':
      if (line.match(/^[*-\s•]+/)) {
        const currentEdu = data.education[data.education.length - 1];
        if (currentEdu) {
          const bulletText = line.replace(/^[*-\s•#.:]+/, '').replace(/[*_]/g, '').trim();
          if (bulletText) {
            if (!currentEdu.bullets) currentEdu.bullets = [];
            currentEdu.bullets.push(bulletText);
          }
        }
      } else if (line.startsWith('**') || line.match(/^[A-Z][a-z]+ (of|in) /)) {
         if (!line.toLowerCase().includes('award')) {
           data.education.push({ degree: line.replace(/[*_]/g, ''), school: '', date: '', bullets: [] });
         }
      } else if (!line.match(/^[#.\s]+$/)) {
         const currentEdu = data.education[data.education.length - 1];
         if (currentEdu) {
           if (line.match(/^[0-9]{4}/)) currentEdu.date = line.replace(/[*_]/g, '');
           else if (!currentEdu.school) currentEdu.school = line.replace(/[*_]/g, '');
         }
      }
      break;
    case 'CERTIFICATIONS':
      if (line.startsWith('*') || line.startsWith('-')) {
        data.certifications.push(line.replace(/^[*-\s]+/, '').trim());
      } else if (!line.startsWith('#')) {
        data.certifications.push(line.trim());
      }
      break;
  }
}
