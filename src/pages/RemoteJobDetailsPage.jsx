import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Clock3,
  DollarSign,
  ExternalLink,
  FileText,
  MapPin,
  RefreshCw,
  Tag
} from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { buildJobDescription } from '../utils/jobDescription';
import SiteNav from '../components/SiteNav';
import './RemoteJobDetailsPage.css';

const JOB_FIELDS = 'id, source, title, company, location, job_url, description, employment_type, salary_text, category, source_tags, posted_at, scraped_at, created_at';

export default function RemoteJobDetailsPage() {
  const { jobId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const routedJob = useMemo(() => {
    const candidate = location.state?.job;
    return candidate && String(candidate.id) === String(jobId) ? candidate : null;
  }, [jobId, location.state]);
  const [job, setJob] = useState(routedJob);
  const [isTracked, setIsTracked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadJob = async () => {
      setLoading(true);
      setError('');

      try {
        const [{ data, error: jobError }, { data: tracked, error: trackedError }] = await Promise.all([
          supabase
            .from('remote_jobs')
            .select(JOB_FIELDS)
            .eq('id', jobId)
            .eq('is_active', true)
            .maybeSingle(),
          user
            ? supabase
                .from('job_applications')
                .select('id')
                .eq('user_id', user.id)
                .eq('job_id', jobId)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null })
        ]);

        if (jobError) throw jobError;
        if (trackedError) throw trackedError;
        if (cancelled) return;

        if (!data) {
          setJob(null);
          setError('This listing is no longer available.');
        } else {
          setJob(data);
          setIsTracked(Boolean(tracked));
        }
      } catch (loadError) {
        console.error('Failed to load remote job:', loadError);
        if (!cancelled) {
          setJob(null);
          setError("We couldn't load this job listing right now. Please try again shortly.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadJob();
    return () => {
      cancelled = true;
    };
  }, [jobId, user?.id]);

  const goToSignIn = () => navigate('/?signin=1');

  const handleBuildResume = () => {
    if (!job) return;
    const description = buildJobDescription(job);
    localStorage.setItem('savedJobDescription', description);
    navigate('/', { state: { jobDescription: description } });
  };

  const handleTrackJob = async () => {
    if (!job) return;
    if (!user) {
      addToast('Sign in to track jobs.', 'info');
      goToSignIn();
      return;
    }

    setTracking(true);
    try {
      if (isTracked) {
        const { error: deleteError } = await supabase
          .from('job_applications')
          .delete()
          .eq('user_id', user.id)
          .eq('job_id', job.id);

        if (deleteError) {
          console.error('Failed to untrack job:', deleteError);
          addToast("We couldn't remove that job from your tracker. Please try again.", 'error');
        } else {
          setIsTracked(false);
          addToast('Job removed from your tracker.', 'success');
        }
      } else {
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
            description: buildJobDescription(job),
            status: 'saved'
          });

        if (insertError) {
          if (insertError.code === '23505') {
            setIsTracked(true);
            addToast('Job is already in your tracker.', 'info');
          } else {
            console.error('Failed to track job:', insertError);
            addToast("We couldn't add that job to your tracker. Please try again.", 'error');
          }
        } else {
          setIsTracked(true);
          addToast('Job added to your tracker.', 'success');
        }
      }
    } finally {
      setTracking(false);
    }
  };

  const tags = [
    job?.category,
    job?.location,
    job?.employment_type,
    job?.salary_text,
    ...(Array.isArray(job?.source_tags) ? job.source_tags : [])
  ].filter(Boolean);

  return (
    <div className="remote-job-detail-page layout-container">
      <SiteNav onSignIn={goToSignIn} />
      <main className="remote-job-detail-main">
        <Link className="remote-job-detail-back" to="/remote-jobs">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Find Remote Jobs
        </Link>

        {loading ? (
          <DetailSkeleton />
        ) : error || !job ? (
          <section className="remote-job-detail-state" role="alert">
            <BriefcaseBusiness size={34} aria-hidden="true" />
            <h1>Job listing unavailable</h1>
            <p>{error || 'This listing is no longer available.'}</p>
            <Link className="remote-job-detail-button primary" to="/remote-jobs">Browse open roles</Link>
          </section>
        ) : (
          <>
            <section className="remote-job-detail-hero">
              <div className="remote-job-detail-hero-top">
                <div className="remote-job-detail-eyebrows">
                  <span className="remote-job-detail-source"><BriefcaseBusiness size={15} aria-hidden="true" />{formatSource(job.source)}</span>
                  <span className="remote-job-detail-status">Open role</span>
                </div>
                <span className="remote-job-detail-date">{formatDate(job.posted_at || job.created_at)}</span>
              </div>
              <h1>{job.title}</h1>
              <div className="remote-job-detail-subtitle">
                <span><Building2 size={17} aria-hidden="true" />{job.company || 'Company not listed'}</span>
                <span><MapPin size={17} aria-hidden="true" />{job.location || 'Remote'}</span>
              </div>
              <div className="remote-job-detail-tags">
                {tags.map((tag, index) => (
                  <span className={index === 0 && job.category ? 'is-category' : ''} key={`${tag}-${index}`}>
                    {index === 0 && job.category ? <Tag size={13} aria-hidden="true" /> : null}
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <div className="remote-job-detail-grid">
              <article className="remote-job-detail-panel remote-job-detail-description-panel">
                <div className="remote-job-detail-section-heading">
                  <div>
                    <span className="remote-job-detail-kicker">Role overview</span>
                    <h2>Full job description</h2>
                  </div>
                  <FileText size={22} aria-hidden="true" />
                </div>
                <div className="remote-job-detail-description">
                  {buildJobDescription(job) || 'No description was provided for this listing.'}
                </div>
              </article>

              <aside className="remote-job-detail-sidebar">
                <section className="remote-job-detail-panel remote-job-detail-actions-panel">
                  <span className="remote-job-detail-kicker">Next step</span>
                  <h2>Make this role yours.</h2>
                  <p>Tailor your resume to this listing, then keep your application organized.</p>
                  <button type="button" className="remote-job-detail-button primary" onClick={handleBuildResume}>
                    <FileText size={16} aria-hidden="true" />
                    Build a Resume
                  </button>
                  <button
                    type="button"
                    className={`remote-job-detail-button ${isTracked ? 'tracked' : 'secondary'}`}
                    onClick={handleTrackJob}
                    disabled={tracking}
                  >
                    <Bookmark size={16} aria-hidden="true" />
                    {tracking ? isTracked ? 'Removing from tracker' : 'Saving to tracker' : isTracked ? 'Untrack this job' : 'Track this job'}
                  </button>
                  {job.job_url && (
                    <a className="remote-job-detail-source-link" href={job.job_url} target="_blank" rel="noopener noreferrer">
                      Open original listing
                      <ExternalLink size={15} aria-hidden="true" />
                    </a>
                  )}
                </section>

                <section className="remote-job-detail-panel remote-job-detail-facts-panel">
                  <div className="remote-job-detail-section-heading compact">
                    <div>
                      <span className="remote-job-detail-kicker">At a glance</span>
                      <h2>Role details</h2>
                    </div>
                  </div>
                  <div className="remote-job-detail-facts">
                    <Fact icon={MapPin} label="Location" value={job.location || 'Remote'} />
                    <Fact icon={BriefcaseBusiness} label="Work type" value={job.employment_type || 'Not specified'} />
                    <Fact icon={DollarSign} label="Compensation" value={job.salary_text || 'Not specified'} />
                    <Fact icon={Tag} label="Niche" value={job.category || 'Other'} />
                    <Fact icon={Clock3} label="Posted" value={formatDate(job.posted_at || job.created_at)} />
                    <Fact icon={RefreshCw} label="Last refreshed" value={formatRefreshTime(job.scraped_at)} />
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="remote-job-detail-fact">
      <span className="remote-job-detail-fact-icon"><Icon size={16} aria-hidden="true" /></span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="remote-job-detail-skeleton" aria-label="Loading job details">
      <div className="remote-job-detail-skeleton-hero" />
      <div className="remote-job-detail-skeleton-grid">
        <div className="remote-job-detail-skeleton-body" />
        <div className="remote-job-detail-skeleton-side" />
      </div>
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
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRefreshTime(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently checked';
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;
  if (elapsedMinutes < 1440) return `${Math.floor(elapsedMinutes / 60)} hr ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
