import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Kanban, List, ListChecks, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { useToast } from '../../context/ToastContext';
import CustomSelect from '../CustomSelect';
import './UserJobTracker.css';

const STATUS_OPTIONS = [
  { value: 'saved', label: 'Saved' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' }
];
const VIEW_MODE_KEY = 'jobTrackerViewMode';

export default function UserJobTracker({ user }) {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [viewMode, setViewMode] = useState(() => (
    typeof window !== 'undefined' && window.localStorage.getItem(VIEW_MODE_KEY) === 'kanban'
      ? 'kanban'
      : 'list'
  ));

  useEffect(() => {
    fetchApplications();
  }, [user?.id]);

  useEffect(() => {
    window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const summary = useMemo(() => ({
    total: applications.length,
    applied: applications.filter(application => ['applied', 'interview', 'offer'].includes(application.status)).length,
    interviews: applications.filter(application => application.status === 'interview').length,
    offers: applications.filter(application => application.status === 'offer').length
  }), [applications]);

  const applicationsByStatus = useMemo(() => STATUS_OPTIONS.reduce((groups, status) => {
    groups[status.value] = applications.filter(application => application.status === status.value);
    return groups;
  }, {}), [applications]);

  const fetchApplications = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: fetchError } = await supabase
      .from('job_applications')
      .select('id, job_id, job_title, company, location, source, job_url, description, status, applied_at, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (fetchError) {
      console.error('Failed to load job tracker:', fetchError);
      setError("We couldn't load your tracker right now. Please try again shortly.");
      setApplications([]);
    } else {
      setApplications(data || []);
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
      .select('id, job_id, job_title, company, location, source, job_url, description, status, applied_at, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('Failed to update job tracker:', updateError);
      addToast("We couldn't update that tracked job. Please try again.", 'error');
    } else if (data) {
      setApplications(previous => previous.map(item => item.id === data.id ? data : item));
    }
    setUpdatingId(null);
  };

  const handleStatusChange = (application, status) => {
    const appliedAt = status === 'applied' && !application.applied_at
      ? new Date().toISOString()
      : application.applied_at;
    updateApplication(application, { status, applied_at: appliedAt });
  };

  const handleDrop = status => {
    if (!draggingId) return;
    const application = applications.find(item => item.id === draggingId);
    setDraggingId(null);
    if (application && application.status !== status) handleStatusChange(application, status);
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
      addToast("We couldn't remove that tracked job. Please try again.", 'error');
    } else {
      setApplications(previous => previous.filter(item => item.id !== application.id));
      addToast('Job removed from tracker.', 'success');
    }
    setUpdatingId(null);
  };

  const renderApplicationCard = application => (
    <article
      className={`job-tracker-card ${viewMode === 'kanban' ? 'job-tracker-kanban-card' : ''}`}
      key={application.id}
      draggable={viewMode === 'kanban' && updatingId !== application.id}
      onDragStart={() => setDraggingId(application.id)}
      onDragEnd={() => setDraggingId(null)}
      aria-grabbed={draggingId === application.id}
    >
      <div className="job-tracker-card-main">
        <div className="job-tracker-card-heading">
          <div>
            <p className="job-tracker-source">{formatSource(application.source)}</p>
            <h3>{application.job_title}</h3>
            <p className="job-tracker-company">{application.company || 'Company not listed'}</p>
          </div>
        </div>
        <div className="job-tracker-meta">
          {application.location && <span>{application.location}</span>}
          <span>Updated {formatDate(application.updated_at)}</span>
          {application.applied_at && <span>Applied {formatDate(application.applied_at)}</span>}
        </div>
      </div>
      <div className="job-tracker-actions">
        <CustomSelect
          className={`job-tracker-status status-${application.status}`}
          value={application.status}
          onChange={status => handleStatusChange(application, status)}
          disabled={updatingId === application.id}
          ariaLabel={`Status for ${application.job_title}`}
          options={STATUS_OPTIONS}
        />
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
  );

  return (
    <div className="job-tracker-container">
      <div className="job-tracker-header">
        <div>
          <p className="job-tracker-kicker">Your job search</p>
          <h2 className="job-tracker-title">Job Tracker</h2>
          <p className="job-tracker-subtitle">Keep every application moving forward.</p>
        </div>
        <div className="job-tracker-view-toggle" role="group" aria-label="Tracker display mode">
          <button
            type="button"
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
            aria-label="Show tracker as a list"
            aria-pressed={viewMode === 'list'}
            title="List view"
          >
            <List size={17} aria-hidden="true" />
            <span>List</span>
          </button>
          <button
            type="button"
            className={viewMode === 'kanban' ? 'active' : ''}
            onClick={() => setViewMode('kanban')}
            aria-label="Show tracker as a kanban board"
            aria-pressed={viewMode === 'kanban'}
            title="Kanban view"
          >
            <Kanban size={17} aria-hidden="true" />
            <span>Kanban</span>
          </button>
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
          <h3>Your tracker is temporarily unavailable</h3>
          <p>{error}</p>
          <button type="button" className="dash-btn" onClick={fetchApplications}>Refresh tracker</button>
        </div>
      ) : loading ? (
        <div className="job-tracker-loading">Loading your tracked roles...</div>
      ) : applications.length === 0 ? (
        <div className="job-tracker-empty">
          <ListChecks size={36} aria-hidden="true" />
          <h3>No tracked roles yet</h3>
          <p>Track a role from Find Remote Jobs to keep it here.</p>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="job-tracker-board" aria-label="Job tracker kanban board">
          {STATUS_OPTIONS.map(status => {
            const columnApplications = applicationsByStatus[status.value] || [];
            return (
              <section
                className={`job-tracker-column status-${status.value}`}
                key={status.value}
                onDragOver={event => event.preventDefault()}
                onDrop={() => handleDrop(status.value)}
                aria-label={`${status.label} jobs`}
              >
                <header className="job-tracker-column-header">
                  <div>
                    <span className="job-tracker-column-dot" aria-hidden="true" />
                    <h3>{status.label}</h3>
                  </div>
                  <span className="job-tracker-column-count">{columnApplications.length}</span>
                </header>
                <div className="job-tracker-column-list">
                  {columnApplications.length > 0
                    ? columnApplications.map(renderApplicationCard)
                    : <p className="job-tracker-column-empty">Drop roles here</p>}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="job-tracker-list">
          {applications.map(renderApplicationCard)}
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
