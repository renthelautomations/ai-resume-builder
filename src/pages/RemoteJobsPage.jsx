import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BriefcaseBusiness, Clock3, ExternalLink, LayoutGrid, List as ListIcon, Search, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SiteNav from '../components/SiteNav';
import CustomSelect from '../components/CustomSelect';
import './RemoteJobsPage.css';

const JOB_CATEGORIES = [
  'AI & Automation',
  'Development & IT',
  'Data & Analytics',
  'Customer Support',
  'Sales & Business Development',
  'Marketing & SEO',
  'Design & Creative',
  'Writing & Content',
  'Finance & Accounting',
  'E-commerce',
  'Virtual Assistance & Admin',
  'Operations & Project Management',
  'Education & Training',
  'Other'
];

const JOB_FIELDS = 'id, source, title, company, location, job_url, description, employment_type, salary_text, category, source_tags, posted_at, created_at';
const RECENT_SEARCHES_KEY = 'remoteJobsRecentSearches';
const MAX_RECENT_SEARCHES = 5;
const RECOMMENDED_SEARCHES = [
  { query: 'AI automation', label: 'AI and automation roles' },
  { query: 'Virtual assistant', label: 'Virtual assistant roles' },
  { query: 'React developer', label: 'React developer roles' },
  { query: 'Customer support', label: 'Customer support roles' },
  { query: 'SEO specialist', label: 'SEO and marketing roles' },
  { query: 'Data analyst', label: 'Data and analytics roles' }
];

export default function RemoteJobsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const searchFieldRef = useRef(null);
  const fetchSequenceRef = useRef(0);
  const [jobs, setJobs] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState(() => readRecentSearches());
  const [searchFocused, setSearchFocused] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState(() => (
    typeof window !== 'undefined' && window.localStorage.getItem('remoteJobsViewMode') === 'list'
      ? 'list'
      : 'cards'
  ));
  const [trackedJobIds, setTrackedJobIds] = useState([]);
  const [sourceRefreshes, setSourceRefreshes] = useState({});
  const [loading, setLoading] = useState(true);
  const [trackingId, setTrackingId] = useState(null);
  const [error, setError] = useState('');

  const sources = useMemo(() => (
    [...new Set(jobs.map(job => job.source).filter(Boolean))].sort()
  ), [jobs]);

  const latestRefreshAt = useMemo(() => {
    const values = sourceFilter === 'all'
      ? Object.values(sourceRefreshes)
      : [sourceRefreshes[sourceFilter]];
    return values
      .filter(Boolean)
      .sort((left, right) => new Date(right) - new Date(left))[0] || null;
  }, [sourceFilter, sourceRefreshes]);

  const visibleRecommendations = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return RECOMMENDED_SEARCHES.slice(0, 4);
    return RECOMMENDED_SEARCHES
      .filter(item => `${item.query} ${item.label}`.toLowerCase().includes(query))
      .slice(0, 4);
  }, [searchInput]);

  useEffect(() => {
    fetchJobs(searchTerm, sourceFilter, categoryFilter);
  }, [searchTerm, sourceFilter, categoryFilter, user?.id]);

  useEffect(() => {
    const normalized = searchInput.trim();
    const timer = setTimeout(() => {
      setSearchTerm(normalized);
      if (normalized.length >= 3) saveRecentSearch(setRecentSearches, normalized);
    }, 320);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const handlePointerDown = event => {
      if (!searchFieldRef.current?.contains(event.target)) setSearchFocused(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('remoteJobsViewMode', viewMode);
  }, [viewMode]);

  const fetchJobs = async (term, source, category) => {
    const requestId = fetchSequenceRef.current + 1;
    fetchSequenceRef.current = requestId;
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('remote_jobs')
        .select(JOB_FIELDS)
        .eq('is_active', true)
        .order('posted_at', { ascending: false, nullsFirst: false })
        .limit(300);

      const normalizedTerm = term.trim();
      if (normalizedTerm) {
        query = query.textSearch('search_vector', normalizedTerm, {
          config: 'simple',
          type: 'websearch'
        });
      }
      if (source !== 'all') query = query.eq('source', source);
      if (category !== 'all') query = query.eq('category', category);

      let refreshQuery = supabase
        .from('remote_jobs')
        .select('source, scraped_at')
        .eq('is_active', true)
        .not('scraped_at', 'is', null)
        .order('scraped_at', { ascending: false })
        .limit(500);
      if (source !== 'all') refreshQuery = refreshQuery.eq('source', source);

      const [{ data, error: jobsError }, { data: tracked, error: trackedError }, { data: refreshRows, error: refreshError }] = await Promise.all([
        query,
        user
          ? supabase
              .from('job_applications')
              .select('job_id')
              .eq('user_id', user.id)
              .not('job_id', 'is', null)
          : Promise.resolve({ data: [], error: null }),
        refreshQuery
      ]);

      if (jobsError) throw jobsError;
      if (trackedError) throw trackedError;
      if (requestId !== fetchSequenceRef.current) return;

      setJobs(data || []);
      setTrackedJobIds((tracked || []).map(item => item.job_id));
      if (refreshError) {
        console.warn('Could not load job source refresh time:', refreshError);
      } else {
        setSourceRefreshes(buildSourceRefreshes(refreshRows || []));
      }
    } catch (fetchError) {
      console.error('Failed to load remote jobs:', fetchError);
      if (requestId !== fetchSequenceRef.current) return;
      setJobs([]);
      setTrackedJobIds([]);
      setError("We couldn't load job listings right now. Please try again shortly.");
    } finally {
      if (requestId === fetchSequenceRef.current) setLoading(false);
    }
  };

  const applySearch = value => {
    const normalized = value.trim();
    setSearchInput(normalized);
    setSearchTerm(normalized);
    if (normalized.length >= 3) saveRecentSearch(setRecentSearches, normalized);
    setSearchFocused(false);
  };

  const handleSearch = event => {
    event.preventDefault();
    applySearch(searchInput);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    if (typeof window !== 'undefined') window.localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const goToSignIn = () => navigate('/?signin=1');

  const handleBuildResume = job => {
    const description = job.description || [
      job.title,
      job.company && `Company: ${job.company}`,
      job.location && `Location: ${job.location}`
    ].filter(Boolean).join('\n');

    localStorage.setItem('savedJobDescription', description);
    navigate('/');
  };

  const handleTrackJob = async job => {
    if (!user) {
      addToast('Sign in to track jobs.', 'info');
      goToSignIn();
      return;
    }

    setTrackingId(job.id);
    const { error: insertError } = await supabase
      .from('job_applications')
      .insert({
        user_id: user.id,
        job_id: job.id,
        job_title: job.title,
        company: job.company,
        location: job.location,
        source: job.source,
        job_url: job.job_url,
        description: job.description,
        status: 'saved'
      });

    if (insertError) {
      if (insertError.code === '23505') {
        addToast('Job is already in your tracker.', 'info');
      } else {
        console.error('Failed to track job:', insertError);
        addToast('Could not add job to tracker.', 'error');
      }
    } else {
      setTrackedJobIds(previous => [...previous, job.id]);
      addToast('Job added to your tracker.', 'success');
    }
    setTrackingId(null);
  };

  return (
    <div className="remote-jobs-page layout-container">
      <SiteNav onSignIn={goToSignIn} />
      <main className="remote-jobs-main">
        <section className="remote-jobs-heading">
          <div>
            <h1>Find Remote Jobs</h1>
            <p className="remote-jobs-intro">
              Search roles, then build a resume tailored to one.
            </p>
          </div>
          {user && (
            <button type="button" className="remote-jobs-tracker-link" onClick={() => navigate('/jobtracker')}>
              View job tracker
            </button>
          )}
        </section>

        <form className="remote-jobs-search" onSubmit={handleSearch}>
          <div className="remote-jobs-search-field" ref={searchFieldRef}>
            <label htmlFor="remote-job-search">Search roles, skills, or companies</label>
            <div className="remote-jobs-input-row">
              <Search size={18} aria-hidden="true" />
              <input
                id="remote-job-search"
                type="search"
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    setSearchFocused(false);
                    event.currentTarget.blur();
                  }
                }}
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls="remote-job-search-suggestions"
                aria-expanded={searchFocused}
                placeholder="Try product designer, React, or customer success"
              />
            </div>
            {searchFocused && (
              <div id="remote-job-search-suggestions" className="remote-jobs-search-suggestions" role="listbox" aria-label="Search suggestions">
                {recentSearches.length > 0 && (
                  <section className="remote-jobs-suggestion-group">
                    <div className="remote-jobs-suggestion-heading">
                      <span><Clock3 size={14} aria-hidden="true" />Recent searches</span>
                      <button type="button" className="remote-jobs-clear-searches" onClick={clearRecentSearches}>Clear</button>
                    </div>
                    <div className="remote-jobs-suggestion-list">
                      {recentSearches.map(search => (
                        <button key={search} type="button" className="remote-jobs-suggestion" role="option" onClick={() => applySearch(search)}>
                          <Clock3 size={15} aria-hidden="true" />
                          <span>{search}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                <section className="remote-jobs-suggestion-group">
                  <div className="remote-jobs-suggestion-heading">
                    <span><Sparkles size={14} aria-hidden="true" />Recommended searches</span>
                  </div>
                  {visibleRecommendations.length > 0 ? (
                    <div className="remote-jobs-suggestion-list">
                      {visibleRecommendations.map(item => (
                        <button key={item.query} type="button" className="remote-jobs-suggestion" role="option" onClick={() => applySearch(item.query)}>
                          <Sparkles size={15} aria-hidden="true" />
                          <span>
                            <strong>{item.query}</strong>
                            <small>{item.label}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="remote-jobs-suggestion-empty">Keep typing to search all roles, skills, and companies.</p>
                  )}
                </section>
                <button type="button" className="remote-jobs-suggestion-close" onClick={() => setSearchFocused(false)}>
                  <X size={14} aria-hidden="true" /> Close suggestions
                </button>
              </div>
            )}
          </div>
          <label className="remote-jobs-filter">
            <span>Source</span>
            <CustomSelect
              value={sourceFilter}
              onChange={setSourceFilter}
              ariaLabel="Filter jobs by source"
              options={[
                { value: 'all', label: 'All sources' },
                ...sources.map(source => ({ value: source, label: formatSource(source) }))
              ]}
            />
          </label>
          <label className="remote-jobs-filter">
            <span>Niche</span>
            <CustomSelect
              className="menu-right"
              value={categoryFilter}
              onChange={setCategoryFilter}
              ariaLabel="Filter jobs by niche"
              options={[
                { value: 'all', label: 'All niches' },
                ...JOB_CATEGORIES.map(category => ({ value: category, label: category }))
              ]}
            />
          </label>
          {latestRefreshAt && (
            <p className="remote-jobs-refresh-note" aria-live="polite">
              {sourceFilter === 'all' ? 'Latest source refresh:' : `${formatSource(sourceFilter)} refreshed:`} {formatRefreshTime(latestRefreshAt)}
            </p>
          )}
        </form>

        <div className="remote-jobs-results-header">
          <div>
            <span className="remote-jobs-results-label">Open roles</span>
            <h2>{loading || searchInput.trim() !== searchTerm ? 'Searching jobs' : `${jobs.length} ${jobs.length === 1 ? 'role' : 'roles'} found`}</h2>
          </div>
          <div className="remote-jobs-view-toggle" role="group" aria-label="Job display mode">
            <button
              type="button"
              className={viewMode === 'cards' ? 'active' : ''}
              onClick={() => setViewMode('cards')}
              aria-label="Show jobs as cards"
              aria-pressed={viewMode === 'cards'}
              title="Card view"
            >
              <LayoutGrid size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              aria-label="Show jobs as a list"
              aria-pressed={viewMode === 'list'}
              title="List view"
            >
              <ListIcon size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {error ? (
          <div className="remote-jobs-empty" role="alert">
            <BriefcaseBusiness size={34} aria-hidden="true" />
            <h2>Job listings are temporarily unavailable</h2>
            <p>{error}</p>
            <button type="button" className="remote-jobs-button secondary" onClick={() => fetchJobs(searchTerm, sourceFilter, categoryFilter)}>
              Refresh listings
            </button>
          </div>
        ) : loading ? (
          <div className={`remote-jobs-grid ${viewMode === 'list' ? 'is-list' : ''}`} aria-label="Loading remote jobs">
            {Array.from({ length: 6 }).map((_, index) => <div className="remote-job-skeleton" key={index} />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="remote-jobs-empty">
            <BriefcaseBusiness size={34} aria-hidden="true" />
            <h2>No open roles match your search</h2>
            <p>Try a broader keyword or adjust your filters to find more opportunities.</p>
          </div>
        ) : (
          <div className={`remote-jobs-grid ${viewMode === 'list' ? 'is-list' : ''}`}>
            {jobs.map(job => {
              const isTracked = trackedJobIds.includes(job.id);
              return (
                <article className="remote-job-card" key={job.id}>
                  <div className="remote-job-card-top">
                    <span className="remote-job-source">{formatSource(job.source)}</span>
                    <span className="remote-job-date">{formatDate(job.posted_at || job.created_at)}</span>
                  </div>
                  <h2>{job.title}</h2>
                  <p className="remote-job-company">{job.company || 'Company not listed'}</p>
                  <div className="remote-job-meta">
                    {job.category && <span className="remote-job-category">{job.category}</span>}
                    {job.location && <span>{job.location}</span>}
                    {job.employment_type && <span>{job.employment_type}</span>}
                    {job.salary_text && <span>{job.salary_text}</span>}
                    {(Array.isArray(job.source_tags) ? job.source_tags : []).slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}
                  </div>
                  <p className="remote-job-description">{truncate(job.description, 210)}</p>
                  <div className="remote-job-actions">
                    <button type="button" className="remote-jobs-button primary" onClick={() => handleBuildResume(job)}>
                      Build a Resume
                    </button>
                    <button
                      type="button"
                      className={`remote-jobs-button ${isTracked ? 'tracked' : 'secondary'}`}
                      onClick={() => handleTrackJob(job)}
                      disabled={isTracked || trackingId === job.id}
                    >
                      {isTracked ? 'Tracked' : trackingId === job.id ? 'Saving' : 'Track Job'}
                    </button>
                    {job.job_url && (
                      <a className="remote-job-external-link" href={job.job_url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${job.title} listing`}>
                        <ExternalLink size={16} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function formatSource(source) {
  if (!source) return 'Remote source';
  if (source.toLowerCase() === 'onlinejobs.ph') return 'OnlineJobs.ph';
  return source.replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'Recently listed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently listed';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildSourceRefreshes(rows) {
  return rows.reduce((latestBySource, row) => {
    if (!row.source || !row.scraped_at || latestBySource[row.source]) return latestBySource;
    latestBySource[row.source] = row.scraped_at;
    return latestBySource;
  }, {});
}

function formatRefreshTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (elapsedMinutes < 1) return 'just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;
  if (elapsedMinutes < 1440) return `${Math.floor(elapsedMinutes / 60)} hr ago`;
  return `on ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function readRecentSearches() {
  if (typeof window === 'undefined') return [];
  try {
    const saved = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(value => typeof value === 'string').slice(0, MAX_RECENT_SEARCHES) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(setRecentSearches, value) {
  const normalized = value.trim();
  if (normalized.length < 3) return;

  setRecentSearches(previous => {
    const next = [normalized, ...previous.filter(item => item.toLowerCase() !== normalized.toLowerCase())]
      .slice(0, MAX_RECENT_SEARCHES);
    if (typeof window !== 'undefined') window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    return next;
  });
}

function truncate(value, length) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > length ? `${text.slice(0, length).trim()}...` : text;
}
