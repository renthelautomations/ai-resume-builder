import React from 'react';
import { Link } from 'react-router-dom';
import './LegalFooter.css';

export default function LegalFooter() {
  return (
    <footer className="site-footer">
      <span>Made by Renthel Automations</span>
      <nav aria-label="Legal">
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms</Link>
      </nav>
    </footer>
  );
}
