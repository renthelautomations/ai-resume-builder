import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    padding: '0.75in',
    backgroundColor: '#ffffff',
    color: '#000000',
    fontSize: 11,
    lineHeight: 1.35,
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
  sectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
    marginTop: 0,
    marginBottom: 6,
    paddingBottom: 2,
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
    marginLeft: 18,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
  },
  summary: {
    fontSize: 10.5,
    marginBottom: 6,
  },
  skills: {
    fontSize: 10.5,
    marginBottom: 6,
  }
});

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
          <View>
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Professional Summary</Text>
              <Text style={styles.summary}>{resumeData.summary}</Text>
            </View>
            <View style={{ height: 6 }} />
          </View>
        )}

        {resumeData.skills && resumeData.skills.length > 0 && (
          <View>
            <View wrap={false}>
              <Text style={styles.sectionTitle}>Core Skills</Text>
              <Text style={styles.skills}>{resumeData.skills.join("   |   ")}</Text>
            </View>
            <View style={{ height: 6 }} />
          </View>
        )}

        {resumeData.experience && resumeData.experience.length > 0 && (
          <View>
            {resumeData.experience.map((job, i) => (
              <View key={i} style={{ marginBottom: 0 }}>
                <View wrap={false}>
                  {i === 0 && <Text style={styles.sectionTitle}>Work Experience</Text>}
                  <View style={styles.row}>
                    <Text style={styles.boldText}>{job.company}</Text>
                    <Text style={{ fontSize: 10.5 }}>{job.location}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.italicText}>{job.title}</Text>
                    <Text style={styles.italicText}>{job.dates}</Text>
                  </View>
                  {job.bullets && job.bullets.length > 0 && (
                    <View style={styles.bulletRow}>
                      <Text style={styles.bulletPoint}>•</Text>
                      <Text style={styles.bulletText}>{job.bullets[0]}</Text>
                    </View>
                  )}
                </View>
                {job.bullets && job.bullets.slice(1).map((b, j) => (
                  <View key={j + 1} style={styles.bulletRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
            <View style={{ height: 10 }} />
          </View>
        )}

        {resumeData.projects && resumeData.projects.length > 0 && (
          <View>
            {resumeData.projects.map((p, i) => (
              <View key={i} style={{ marginBottom: 0 }}>
                <View wrap={false}>
                  {i === 0 && <Text style={styles.sectionTitle}>Selected Projects</Text>}
                  <View style={styles.row}>
                    <Text style={styles.boldText}>{p.name}</Text>
                    <Text style={{ fontSize: 10.5 }}>{p.dates}</Text>
                  </View>
                  {p.stack && (
                    <View style={styles.row}>
                      <Text style={styles.italicText}>{p.stack}</Text>
                    </View>
                  )}
                  {p.bullets && p.bullets.length > 0 && (
                    <View style={styles.bulletRow}>
                      <Text style={styles.bulletPoint}>•</Text>
                      <Text style={styles.bulletText}>{p.bullets[0]}</Text>
                    </View>
                  )}
                </View>
                {p.bullets && p.bullets.slice(1).map((b, j) => (
                  <View key={j + 1} style={styles.bulletRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
            <View style={{ height: 10 }} />
          </View>
        )}

        {resumeData.education && resumeData.education.length > 0 && (
          <View>
            {resumeData.education.map((e, i) => (
              <View key={i} style={{ marginBottom: 0 }}>
                <View wrap={false}>
                  {i === 0 && <Text style={styles.sectionTitle}>Education</Text>}
                  <View style={styles.row}>
                    <Text style={styles.boldText}>{e.degree}</Text>
                    <Text style={{ fontSize: 10.5 }}>{e.location}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.italicText}>{e.school}</Text>
                    <Text style={styles.italicText}>{e.dates}</Text>
                  </View>
                  {e.details && e.details.length > 0 && (
                    <View style={styles.bulletRow}>
                      <Text style={styles.bulletPoint}>•</Text>
                      <Text style={styles.bulletText}>{e.details[0]}</Text>
                    </View>
                  )}
                </View>
                {e.details && e.details.slice(1).map((d, j) => (
                  <View key={j + 1} style={styles.bulletRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletText}>{d}</Text>
                  </View>
                ))}
              </View>
            ))}
            <View style={{ height: 10 }} />
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
