import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, ListChecks, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { useToast } from '../../context/ToastContext';
import './UserJobTracker.css';

const STATUS_OPTIONS = [
  { value: 'saved', label: 'Saved' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' }
];

export default function UserJobTracker({ user }) {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [notesById, setNotesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, [user?.id]);

  const summary = useMemo(() => ({
    total: applications.length,
    applied: applications.filter(application => ['applied', 'interview', 'offer'].includes(application.status)).length,
    interviews: applications.filter(application => application.status === 'interview').length,
    offers: applications.filter(application => application.status === 'offer').length
  }), [applications]);

  const fetchApplications = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: fetchError } = await supabase
      .from('job_applications')
      .select('id, job_id, job_title, company, location, source, job_url, description, status, notes, applied_at, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (fetchError) {
      console.error('Failed to load job tracker:', fetchError);
      setError('Job tracker is not available yet. Run the remote jobs SQL setup, then try again.');
      setApplications([]);
    } else {
      setApplications(data || []);
      setNotesById(Object.fromEntries((data || []).map(application => [application.id, application.notes || ''])));
    }
    setLoading(false);
  };

  const updateApplication = async (application, updates) => {
    setUpdatingId(application.id);
    const { data, error: updateError } = await supabase
      .from('job_applications')
      .update(updates)
      .eq('id', application.id)
      .eq('user_id', user.id)
      .select('id, job_id, job_title, company, location, source, job_url, description, status, notes, applied_at, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('Failed to update job tracker:', updateError);
      addToast('Could not update tracked job.', 'error');
    } else if (data) {
      setApplications(previous => previous.map(item => item.id === data.id ? data : item));
      setNotesById(previous => ({ ...previous, [data.id]: data.notes || '' }));
    }
    setUpdatingId(null);
  };

  const handleStatusChange = (application, status) => {
    const appliedAt = status === 'applied' && !application.applied_at
      ? new Date().toISOString()
      : application.applied_at;
    updateApplication(application, { status, applied_at: appliedAt });
  };

  const handleNotesBlur = application => {
    const notes = notesById[application.id] || '';
    if (notes !== (application.notes || '')) updateApplication(application, { notes });
  };

  const handleDelete = async application => {
    if (!window.confirm(`Remove ${application.job_title} from your tracker?`)) return;
    setUpdatingId(application.id);
    const { error: deleteError } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', application.id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Failed to remove tracked job:', deleteError);
      addToast('Could not remove tracked job.', 'error');
    } else {
      setApplications(previous => previous.filter(item => item.id !== application.id));
      addToast('Job removed from tracker.', 'success');
    }
    setUpdatingId(null);
  };

  return (
    <div className="job-tracker-container">
      <div className="job-tracker-header">
        <div>
          <p className="job-tracker-kicker">Your job search</p>
          <h2 className="job-tracker-title">Job Tracker</h2>
          <p className="job-tracker-subtitle">Keep promising roles moving from saved to applied to hired.</p>
        </div>
      </div>

      <div className="job-tracker-summary" aria-label="Job tracker summary">
        <TrackerMetric label="Tracked" value={summary.total} />
        <TrackerMetric label="In progress" value={summary.applied} />
        <TrackerMetric label="Interviews" value={summary.interviews} />
        <TrackerMetric label="Offers" value={summary.offers} />
      </div>

      {!user ? (
        <div className="job-tracker-empty">
          <ListChecks size={36} aria-hidden="true" />
          <h3>Sign in to track jobs</h3>
          <p>Save roles from Find Remote Jobs, then manage your progress here.</p>
          <button type="button" className="dash-btn" onClick={() => navigate('/')}>Go to Resume Builder</button>
        </div>
      ) : error ? (
        <div className="job-tracker-empty" role="alert">
          <ListChecks size={36} aria-hidden="true" />
          <h3>Tracker needs setup</h3>
          <p>{error}</p>
          <button type="button" className="dash-btn" onClick={fetchApplications}>Try again</button>
        </div>
      ) : loading ? (
        <div className="job-tracker-loading">Loading your tracked roles...</div>
      ) : applications.length === 0 ? (
        <div className="job-tracker-empty">
          <ListChecks size={36} aria-hidden="true" />
          <h3>Your tracker is empty</h3>
          <p>Open Find Remote Jobs and track roles you want to revisit.</p>
        </div>
      ) : (
        <div className="job-tracker-list">
          {applications.map(application => (
            <article className="job-tracker-card" key={application.id}>
              <div className="job-tracker-card-main">
                <div className="job-tracker-card-heading">
                  <div>
                    <p className="job-tracker-source">{formatSource(application.source)}</p>
                    <h3>{application.job_title}</h3>
                    <p className="job-tracker-company">{application.company || 'Company not listed'}</p>
                  </div>
                  <select
                    className={`job-tracker-status status-${application.status}`}
                    value={application.status}
                    onChange={event => handleStatusChange(application, event.target.value)}
                    disabled={updatingId === application.id}
                    aria-label={`Status for ${application.job_title}`}
                  >
                    {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="job-tracker-meta">
                  {application.location && <span>{application.location}</span>}
                  <span>Updated {formatDate(application.updated_at)}</span>
                  {application.applied_at && <span>Applied {formatDate(application.applied_at)}</span>}
                </div>
                <label className="job-tracker-notes">
                  <span>Notes</span>
                  <textarea
                    value={notesById[application.id] ?? ''}
                    onChange={event => setNotesById(previous => ({ ...previous, [application.id]: event.target.value }))}
                    onBlur={() => handleNotesBlur(application)}
                    placeholder="Add next step, contact, or interview notes"
                    rows={2}
                  />
                </label>
              </div>
              <div className="job-tracker-actions">
                {application.job_url && (
                  <a href={application.job_url} target="_blank" rel="noopener noreferrer" className="job-tracker-open-link">
                    Open listing <ExternalLink size={15} aria-hidden="true" />
                  </a>
                )}
                <button type="button" className="job-tracker-delete" onClick={() => handleDelete(application)} disabled={updatingId === application.id}>
                  <Trash2 size={15} aria-hidden="true" />
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function TrackerMetric({ label, value }) {
  return (
    <div className="job-tracker-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function formatSource(source) {
  if (!source) return 'Remote source';
  if (source.toLowerCase() === 'onlinejobs.ph') return 'OnlineJobs.ph';
  return source.replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
