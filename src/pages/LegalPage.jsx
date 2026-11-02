import React from 'react';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import LegalFooter from '../components/LegalFooter';
import './LegalPage.css';

const CONTACT_EMAIL = 'rnthlcueto@gmail.com';
const EFFECTIVE_DATE = 'November 2, 2026';

const CONTENT = {
  privacy: {
    icon: ShieldCheck,
    eyebrow: 'Your privacy',
    title: 'Privacy Policy',
    intro: 'This policy explains what AI Resume Builder collects, why we use it, and the choices available to you.',
    sections: [
      {
        title: 'Information we collect',
        paragraphs: [
          'We collect information you provide when you create an account, including your email address and basic profile information from your sign-in provider.',
          'When you use the product, we process resume profiles, job descriptions, generated resumes, saved resumes, tracked jobs, search activity, credit purchases, and support messages you submit.',
          'We also collect limited technical information needed to keep the service secure and reliable, such as page views, session identifiers, browser requests, and error logs.'
        ]
      },
      {
        title: 'How we use information',
        paragraphs: [
          'We use information to provide resume generation, job search, job tracking, account, purchase, support, security, and product-improvement features.',
          'We may send service messages about account activity, purchases, approvals, security, and important product changes. We do not sell your personal information.'
        ]
      },
      {
        title: 'AI processing and service providers',
        paragraphs: [
          'To generate a tailored resume, the service sends the profile and job description you submit to our AI processing provider, OpenRouter, using the DeepSeek V4 Flash model. This processing is necessary for the generation feature.',
          'We use Supabase for authentication and data storage, Resend for transactional email, Vercel for hosting, and other service providers only as needed to operate the product. Each provider receives information required for its service.'
        ]
      },
      {
        title: 'Storage and retention',
        paragraphs: [
          'We retain account and workspace information while your account is active or as needed to provide the service, resolve disputes, enforce agreements, and meet legal obligations.',
          'You can request deletion of your account information by contacting us. Some records may remain where retention is required for security, fraud prevention, accounting, or legal compliance.'
        ]
      },
      {
        title: 'Your choices',
        paragraphs: [
          'You can review and update saved profile, resume, and tracker information inside the product. You can also ask us to access, correct, or delete personal information associated with your account.',
          `For privacy requests, contact ${CONTACT_EMAIL}. We may need to verify your identity before completing a request.`
        ]
      },
      {
        title: 'Changes to this policy',
        paragraphs: [
          'We may update this policy when the service or applicable requirements change. We will update the effective date and provide notice when a change is material.'
        ]
      }
    ]
  },
  terms: {
    icon: FileText,
    eyebrow: 'Use of the service',
    title: 'Terms of Service',
    intro: 'These terms set the rules for using AI Resume Builder and explain what you can expect from the service.',
    sections: [
      {
        title: 'Using AI Resume Builder',
        paragraphs: [
          'You may use the service to organize career information, search remote job listings, track applications, and create resume drafts for lawful personal or professional use.',
          'You must provide information you have the right to use. Keep your sign-in credentials secure and tell us promptly if you believe your account was accessed without permission.'
        ]
      },
      {
        title: 'AI-generated content',
        paragraphs: [
          'AI Resume Builder creates drafts from information you provide. Review every resume before using it. You are responsible for accuracy, truthful claims, formatting, and final application materials.',
          'The service does not guarantee interviews, employment, application acceptance, job availability, or error-free output.'
        ]
      },
      {
        title: 'Credits and purchases',
        paragraphs: [
          'Credits are used for eligible resume-generation features. Purchase requests may require verification and approval before credits are added to an account.',
          'Do not submit payment information that belongs to another person or use the purchase flow for fraudulent, unauthorized, or disputed transactions. Contact us promptly if a purchase needs review.'
        ]
      },
      {
        title: 'Job listings and third-party services',
        paragraphs: [
          'Job listings may come from third-party sources and can change, expire, or contain errors. Verify each listing and its application requirements on the original source before applying.',
          'Links to third-party websites are provided for convenience. We do not control or endorse third-party content, availability, privacy practices, or hiring decisions.'
        ]
      },
      {
        title: 'Acceptable use',
        paragraphs: [
          'Do not use the service to break the law, impersonate another person, submit deceptive application materials, interfere with the service, probe its security, distribute malware, or access another user’s information.',
          'We may limit or suspend access when activity creates a security, legal, operational, or abuse risk.'
        ]
      },
      {
        title: 'Service availability and liability',
        paragraphs: [
          'We work to keep the service available, but features can change or become temporarily unavailable for maintenance, provider outages, security events, or other operational reasons.',
          'To the extent allowed by law, the service is provided without guarantees beyond those required by law. Nothing in these terms limits rights that cannot legally be limited.'
        ]
      },
      {
        title: 'Changes and contact',
        paragraphs: [
          'We may update these terms as the product changes. Continued use after an updated effective date means you accept the revised terms.',
          `Questions about these terms should go to ${CONTACT_EMAIL}.`
        ]
      }
    ]
  }
};

export default function LegalPage({ type }) {
  const content = CONTENT[type] || CONTENT.privacy;
  const Icon = content.icon;

  return (
    <div className="layout-container legal-layout">
      <SiteNav />
      <main className="legal-page">
        <div className="legal-shell">
          <Link to="/" className="legal-back-link">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to AI Resume Builder
          </Link>

          <header className="legal-header">
            <div className="legal-icon" aria-hidden="true">
              <Icon size={24} strokeWidth={1.8} />
            </div>
            <p className="legal-eyebrow">{content.eyebrow}</p>
            <h1>{content.title}</h1>
            <p className="legal-intro">{content.intro}</p>
            <p className="legal-effective">Effective {EFFECTIVE_DATE}</p>
          </header>

          <article className="legal-document">
            {content.sections.map(section => (
              <section className="legal-section" key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}
          </article>

          <LegalFooter />
        </div>
      </main>
    </div>
  );
}
