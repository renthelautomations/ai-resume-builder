import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { FileText, Trash2, Edit } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import ConfirmationModal from '../ConfirmationModal';
import './UserResumes.css';

export default function UserResumes({ user, onSelectResume }) {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetchResumes();
  }, [user]);

  const fetchResumes = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('resumes')
      .select('id, target_role, updated_at, job_description, full_name, contact_line, summary, skills, experience, projects, education, certifications')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching resumes:', error);
    } else {
      setResumes(data || []);
    }
    setLoading(false);
  };

  const handleDeleteClick = (id) => {
    setResumeToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!resumeToDelete) return;
    const id = resumeToDelete;
    setShowDeleteModal(false);
    setResumeToDelete(null);
    const { error } = await supabase.from('resumes').delete().eq('id', id);
    if (error) {
      addToast('Failed to delete resume', 'error');
    } else {
      addToast('Resume deleted', 'success');
      setResumes(resumes.filter(r => r.id !== id));
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-muted)' }}>Loading your saved resumes...</div>;
  }

  return (
    <div className="resumes-container">
      <h2 className="resumes-title">Saved Resumes</h2>
      
      {resumes.length === 0 ? (
        <div className="resumes-empty">
          <FileText size={48} color="#475569" style={{ margin: '0 auto' }} />
          <h3>No saved resumes</h3>
          <p>
            You haven't saved any resumes yet. Generate a resume and click "Save Resume" to see it here.
          </p>
        </div>
      ) : (
        <div className="resumes-grid">
          {resumes.map(resume => (
            <div key={resume.id} className="resume-card">
              
              {/* Header: Title and Date */}
              <div className="resume-card-header">
                <div className="resume-card-icon">
                  <FileText size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="resume-card-title">
                    {resume.target_role || 'Tailored Resume'}
                  </h3>
                  <p className="resume-card-date">
                    Updated {new Date(resume.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Body: Job Description Snippet */}
              <div className="resume-card-body">
                {resume.job_description ? 'Tailored for: ' + resume.job_description : 'No job description provided.'}
              </div>

              {/* Footer: Actions */}
              <div className="resume-card-actions">
                <button 
                  onClick={() => handleDeleteClick(resume.id)}
                  className="btn-delete-icon"
                  title="Delete resume"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  onClick={() => onSelectResume(resume)}
                  className="btn-open"
                >
                  <Edit size={16} /> Open
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete Resume"
        message="Are you sure you want to delete this saved resume? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setResumeToDelete(null);
        }}
      />
    </div>
  );
}