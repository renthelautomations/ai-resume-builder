function sanitizeFilenamePart(value, fallback) {
  const sanitized = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);

  return sanitized || fallback;
}

export function getResumeFilename(resumeData = {}, user, extension) {
  const accountName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0];
  const name = sanitizeFilenamePart(resumeData.full_name || accountName, 'Resume');
  const role = sanitizeFilenamePart(
    resumeData.target_role || resumeData.target_title,
    'Tailored_Resume'
  );

  return `${name}_${role}.${extension}`;
}
