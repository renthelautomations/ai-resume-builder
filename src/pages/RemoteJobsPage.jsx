import React, { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, ExternalLink, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SiteNav from '../components/SiteNav';
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

export default function RemoteJobsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [trackedJobIds, setTrackedJobIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingId, setTrackingId] = useState(null);
  const [error, setError] = useState('');

  const sources = useMemo(() => (
    [...new Set(jobs.map(job => job.source).filter(Boolean))].sort()
  ), [jobs]);

  useEffect(() => {
    fetchJobs(searchTerm, sourceFilter, categoryFilter);
  }, [searchTerm, sourceFilter, categoryFilter, user?.id]);

  const fetchJobs = async (term, source, category) => {
    setLoading(true);
    setError('');

    try {
      let query = supabase
        .from('remote_jobs')
        .select(JOB_FIELDS)
        .eq('is_active', true)
        .order('posted_at', { ascending: false, nullsFirst: false })
        .limit(100);

      const normalizedTerm = term.trim();
      if (normalizedTerm) {
        query = query.textSearch('search_vector', normalizedTerm, {
          config: 'simple',
          type: 'websearch'
        });
      }
      if (source !== 'all') query = query.eq('source', source);
      if (category !== 'all') query = query.eq('category', category);

      const [{ data, error: jobsError }, { data: tracked, error: trackedError }] = await Promise.all([
        query,
        user
          ? supabase
              .from('job_applications')
              .select('job_id')
              .eq('user_id', user.id)
              .not('job_id', 'is', null)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (jobsError) throw jobsError;
      if (trackedError) throw trackedError;

      setJobs(data || []);
      setTrackedJobIds((tracked || []).map(item => item.job_id));
    } catch (fetchError) {
      console.error('Failed to load remote jobs:', fetchError);
      setJobs([]);
      setTrackedJobIds([]);
      setError('Job feed is not available yet. Run the remote jobs SQL setup, then try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = event => {
    event.preventDefault();
    setSearchTerm(searchInput);
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
          <label className="remote-jobs-search-field">
            <span>Search roles, skills, or companies</span>
            <div className="remote-jobs-input-row">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                placeholder="Try product designer, React, or customer success"
              />
              <button type="submit" className="remote-jobs-search-button">Search</button>
            </div>
          </label>
          <label className="remote-jobs-filter">
            <span>Source</span>
            <select value={sourceFilter} onChange={event => setSourceFilter(event.target.value)}>
              <option value="all">All sources</option>
              {sources.map(source => <option key={source} value={source}>{formatSource(source)}</option>)}
            </select>
          </label>
          <label className="remote-jobs-filter">
            <span>Niche</span>
            <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
              <option value="all">All niches</option>
              {JOB_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
        </form>

        <div className="remote-jobs-results-header">
          <div>
            <span className="remote-jobs-results-label">Open roles</span>
            <h2>{loading ? 'Loading jobs' : `${jobs.length} ${jobs.length === 1 ? 'role' : 'roles'} found`}</h2>
          </div>
        </div>

        {error ? (
          <div className="remote-jobs-empty" role="alert">
            <BriefcaseBusiness size={34} aria-hidden="true" />
            <h2>Job feed needs setup</h2>
            <p>{error}</p>
            <button type="button" className="remote-jobs-button secondary" onClick={() => fetchJobs(searchTerm, sourceFilter, categoryFilter)}>
              Try again
            </button>
          </div>
        ) : loading ? (
          <div className="remote-jobs-grid" aria-label="Loading remote jobs">
            {Array.from({ length: 6 }).map((_, index) => <div className="remote-job-skeleton" key={index} />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="remote-jobs-empty">
            <BriefcaseBusiness size={34} aria-hidden="true" />
            <h2>No matching roles yet</h2>
            <p>Try another search, or check back after the first job source is connected.</p>
          </div>
        ) : (
          <div className="remote-jobs-grid">
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

function truncate(value, length) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > length ? `${text.slice(0, length).trim()}...` : text;
}
