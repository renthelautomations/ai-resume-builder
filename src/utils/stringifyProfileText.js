export function stringifyProfileText(data) {
  let str = '';
  
  if (data.full_name || data.contact_line) {
    str += `PERSONAL: ${data.full_name || ''} | ${data.contact_line || ''}\n\n`;
  }
  if (data.target_role) {
    str += `HEADLINE: ${data.target_role}\n\n`;
  }
  if (data.summary) {
    str += `SUMMARY: ${data.summary}\n\n`;
  }
  if (data.skills && data.skills.length > 0) {
    str += `SKILLS: ${data.skills.join(', ')}\n\n`;
  }
  if (data.experience && data.experience.length > 0) {
    str += `EXPERIENCE:\n`;
    data.experience.forEach(exp => {
      str += `- ${exp.title} at ${exp.company} (${exp.dates})\n`;
      if (exp.bullets) {
        exp.bullets.forEach(b => {
          str += `  * ${b}\n`;
        });
      }
    });
    str += '\n';
  }
  if (data.projects && data.projects.length > 0) {
    str += `PROJECTS:\n`;
    data.projects.forEach(proj => {
      str += `- ${proj.name} (${proj.dates})\n`;
      if (proj.stack) str += `  Stack: ${proj.stack}\n`;
      if (proj.bullets) {
        proj.bullets.forEach(b => {
          str += `  * ${b}\n`;
        });
      }
    });
    str += '\n';
  }
  if (data.education && data.education.length > 0) {
    str += `EDUCATION:\n`;
    data.education.forEach(edu => {
      str += `- ${edu.degree} from ${edu.school}, ${edu.location} (${edu.dates})\n`;
    });
    str += '\n';
  }
  if (data.certifications && data.certifications.length > 0) {
    str += `CERTIFICATIONS:\n`;
    data.certifications.forEach(cert => {
      str += `- ${cert}\n`;
    });
    str += '\n';
  }
  
  return str.trim();
}
