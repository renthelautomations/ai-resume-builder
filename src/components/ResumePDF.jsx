import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    padding: '0.75in',
    backgroundColor: '#ffffff',
    color: '#000000',
    fontSize: 10.5,
    lineHeight: 1.24,
  },
  name: {
    fontFamily: 'Times-Bold',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 3,
  },
  contact: {
    fontSize: 9.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
    marginTop: 0,
    marginBottom: 6,
    paddingBottom: 2,
  },
  sectionTitleText: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  boldText: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
  },
  italicText: {
    fontFamily: 'Times-Italic',
    fontSize: 10.5,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  bulletPoint: {
    width: 14,
    marginLeft: 4,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
  },
  summary: {
    fontSize: 10.5,
    marginBottom: 0,
  },
  skills: {
    fontSize: 10.5,
    marginBottom: 0,
  }
});

function SectionHeader({ title }) {
  return (
    <View style={styles.sectionTitleContainer}>
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

export default function ResumePDF({ resumeData }) {
  if (!resumeData) return null;

  return (
    <Document>
      <Page size={[612, 936]} style={styles.page}>
        
        {resumeData.full_name && (
          <Text style={styles.name}>{resumeData.full_name.toUpperCase()}</Text>
        )}
        
        {resumeData.contact_line && (
          <Text style={styles.contact}>{resumeData.contact_line}</Text>
        )}

        {resumeData.summary && (
          <View style={{ marginBottom: 12 }}>
            <View wrap={false}>
              <SectionHeader title="Professional Summary" />
              <Text style={styles.summary}>{resumeData.summary}</Text>
            </View>
          </View>
        )}

        {resumeData.skills && resumeData.skills.length > 0 && !resumeData.hide_skills && (
          <View style={{ marginBottom: 12 }}>
            <View wrap={false}>
              <SectionHeader title="Core Skills" />
              <Text style={styles.skills}>{resumeData.skills.join("   |   ")}</Text>
            </View>
          </View>
        )}

        {resumeData.experience && resumeData.experience.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            {resumeData.experience.map((job, i) => (
              <View key={i} style={{ marginBottom: 0 }}>
                <View wrap={false}>
                  {i === 0 && <SectionHeader title="Work Experience" />}
                  <View style={styles.row}>
                    <Text style={styles.boldText}>{job.company}</Text>
                    <Text style={styles.italicText}>{job.location}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.italicText}>{job.title}</Text>
                    <Text style={styles.italicText}>{job.dates}</Text>
                  </View>
                </View>
                {job.bullets && job.bullets.map((b, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {resumeData.projects && resumeData.projects.length > 0 && !resumeData.hide_projects && (
          <View style={{ marginBottom: 12 }}>
            {resumeData.projects.map((p, i) => (
              <View key={i} style={{ marginBottom: 0 }}>
                <View wrap={false}>
                  {i === 0 && <SectionHeader title="Projects" />}
                  <View style={styles.row}>
                    <Text style={styles.boldText}>{p.name}</Text>
                    <Text style={styles.italicText}>{p.dates}</Text>
                  </View>
                  {p.stack && (
                    <View style={styles.row}>
                      <Text style={styles.italicText}>Tech Stack: {p.stack}</Text>
                    </View>
                  )}
                </View>
                {p.bullets && p.bullets.map((b, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {resumeData.education && resumeData.education.length > 0 && !resumeData.hide_education && (
          <View style={{ marginBottom: 12 }}>
            {resumeData.education.map((e, i) => (
              <View key={i} style={{ marginBottom: 0 }}>
                <View wrap={false}>
                  {i === 0 && <SectionHeader title="Education" />}
                  <View style={styles.row}>
                    <Text style={styles.boldText}>{e.degree}</Text>
                    <Text style={styles.italicText}>{e.location}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.italicText}>{e.school}</Text>
                    <Text style={styles.italicText}>{e.dates}</Text>
                  </View>
                </View>
                {e.details && e.details.map((d, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletText}>{d}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {resumeData.certifications && resumeData.certifications.length > 0 && !resumeData.hide_certifications && (
          <View wrap={false}>
            <SectionHeader title="Certifications" />
            <Text style={styles.skills}>{resumeData.certifications.join("   |   ")}</Text>
          </View>
        )}

      </Page>
    </Document>
  );
}
