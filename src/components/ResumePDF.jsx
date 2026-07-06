import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register a standard Times-like font (Times-Roman is built-in, but we can stick to standard PDF fonts)
// The built-in standard fonts in react-pdf are: 'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    padding: '0.75in',
    backgroundColor: '#ffffff',
    color: '#000000',
    fontSize: 11,
    lineHeight: 1.02,
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
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
    marginTop: 11,
    marginBottom: 5,
    paddingBottom: 2,
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
    marginLeft: 14,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
  },
  summary: {
    fontSize: 10.3,
    marginBottom: 2,
  },
  skills: {
    fontSize: 10.2,
  }
});

export default function ResumePDF({ resumeData }) {
  if (!resumeData) return null;

  return (
    <Document>
      <Page size={[612, 936]} style={styles.page}> {/* 8.5 x 13 inches in points (72 points/inch) */}
        
        {resumeData.full_name && (
          <Text style={styles.name}>{resumeData.full_name.toUpperCase()}</Text>
        )}
        
        {resumeData.contact_line && (
          <Text style={styles.contact}>{resumeData.contact_line}</Text>
        )}

        {resumeData.summary && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.summary}>{resumeData.summary}</Text>
          </View>
        )}

        {resumeData.skills && resumeData.skills.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Core Skills</Text>
            <Text style={styles.skills}>{resumeData.skills.join("   |   ")}</Text>
          </View>
        )}

        {resumeData.experience && resumeData.experience.length > 0 && (
          <View>
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Work Experience</Text>
              <View style={styles.row}>
                <Text style={styles.boldText}>{resumeData.experience[0].company}</Text>
                <Text style={{ fontSize: 10.5 }}>{resumeData.experience[0].location}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.italicText}>{resumeData.experience[0].title}</Text>
                <Text style={styles.italicText}>{resumeData.experience[0].dates}</Text>
              </View>
            </View>
            {resumeData.experience[0].bullets && resumeData.experience[0].bullets.map((b, j) => (
              <View key={j} style={styles.bulletRow}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
            {resumeData.experience.slice(1).map((job, i) => (
              <View key={i + 1} style={{ marginBottom: 0 }}>
                <View style={styles.row}>
                  <Text style={styles.boldText}>{job.company}</Text>
                  <Text style={{ fontSize: 10.5 }}>{job.location}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.italicText}>{job.title}</Text>
                  <Text style={styles.italicText}>{job.dates}</Text>
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

        {resumeData.projects && resumeData.projects.length > 0 && (
          <View>
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Selected Projects</Text>
              <View style={styles.row}>
                <Text style={styles.boldText}>{resumeData.projects[0].name}</Text>
                <Text style={{ fontSize: 10.5 }}>{resumeData.projects[0].dates}</Text>
              </View>
              {resumeData.projects[0].stack && (
                <View style={styles.row}>
                  <Text style={styles.italicText}>{resumeData.projects[0].stack}</Text>
                </View>
              )}
            </View>
            {resumeData.projects[0].bullets && resumeData.projects[0].bullets.map((b, j) => (
              <View key={j} style={styles.bulletRow}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
            {resumeData.projects.slice(1).map((p, i) => (
              <View key={i + 1} style={{ marginBottom: 0 }}>
                <View style={styles.row}>
                  <Text style={styles.boldText}>{p.name}</Text>
                  <Text style={{ fontSize: 10.5 }}>{p.dates}</Text>
                </View>
                {p.stack && (
                  <View style={styles.row}>
                    <Text style={styles.italicText}>{p.stack}</Text>
                  </View>
                )}
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

        {resumeData.education && resumeData.education.length > 0 && (
          <View>
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Education</Text>
              <View style={styles.row}>
                <Text style={styles.boldText}>{resumeData.education[0].degree}</Text>
                <Text style={{ fontSize: 10.5 }}>{resumeData.education[0].location}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.italicText}>{resumeData.education[0].school}</Text>
                <Text style={styles.italicText}>{resumeData.education[0].dates}</Text>
              </View>
            </View>
            {resumeData.education[0].details && resumeData.education[0].details.map((d, j) => (
              <View key={j} style={styles.bulletRow}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletText}>{d}</Text>
              </View>
            ))}
            {resumeData.education.slice(1).map((e, i) => (
              <View key={i + 1} style={{ marginBottom: 0 }}>
                <View style={styles.row}>
                  <Text style={styles.boldText}>{e.degree}</Text>
                  <Text style={{ fontSize: 10.5 }}>{e.location}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.italicText}>{e.school}</Text>
                  <Text style={styles.italicText}>{e.dates}</Text>
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

        {resumeData.certifications && resumeData.certifications.length > 0 && (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            <Text style={styles.skills}>{resumeData.certifications.join("   |   ")}</Text>
          </View>
        )}

      </Page>
    </Document>
  );
}
