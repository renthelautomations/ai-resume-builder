export function buildJobDescription(job = {}) {
  const description = typeof job.description === 'string' ? job.description.trim() : '';
  if (description) return description;

  return [
    job.title,
    job.company && `Company: ${job.company}`,
    job.location && `Location: ${job.location}`
  ].filter(Boolean).join('\n');
}
