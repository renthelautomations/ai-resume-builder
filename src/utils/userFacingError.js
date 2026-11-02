const DEFAULT_ERROR = 'Something went wrong. Please try again.';

const getMessage = (error) => String(error?.message || error || '').trim().toLowerCase();

export function getUserFacingError(error, fallback = DEFAULT_ERROR) {
  const message = getMessage(error);

  if (!message) return fallback;

  if (/unauthorized|invalid token|session.*expired|not authenticated|missing authenticated session|please sign in/.test(message)) {
    return 'Your session expired. Please sign in again.';
  }

  if (/couldn.t verify your credits/.test(message)) {
    return "We couldn't verify your credits right now. Please try again.";
  }

  if (/network|failed to fetch|timeout|timed out|connection/.test(message)) {
    return 'Connection issue. Check your internet connection and try again.';
  }

  return fallback;
}

export function getResumeError(error) {
  const message = getMessage(error);

  if (/insufficient credits|not enough credits|you don.t have enough credits/.test(message)) {
    return "You don't have enough credits to generate a resume. Add credits and try again.";
  }

  if (/too many requests.*wait|please wait a minute/.test(message)) {
    return 'Too many resume requests. Please wait a minute and try again.';
  }

  if (/max_tokens|quota|rate limit|usage limit|insufficient balance|requires more credits|can only afford|spend limit|provider.*limit/.test(message)) {
    return 'Resume generation is temporarily unavailable because the AI service reached its usage limit. Please try again later.';
  }

  if (/json|parse|invalid response|format.*response|incomplete ai response/.test(message)) {
    return "We couldn't format your resume response. Please try again.";
  }

  return getUserFacingError(error, "We couldn't generate your resume right now. Please try again.");
}
