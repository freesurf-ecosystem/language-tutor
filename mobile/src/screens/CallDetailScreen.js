import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, ActivityIndicator } from 'react-native';

const CallDetailScreen = ({ route }) => {
  const { callId } = route.params;
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCallDetail();
  }, [callId]);

  const loadCallDetail = async () => {
    // TODO: Fetch call details from backend
    setLoading(true);
    try {
      // const response = await fetch(`${BACKEND_URL}/api/calls/${callId}`);
      // const data = await response.json();
      // setCall(data);
    } catch (error) {
      console.error('Error loading call:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />;
  }

  if (!call) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Call not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <Text style={styles.summaryText}>{call.summary}</Text>
      </View>

      {call.keyPoints && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Points</Text>
          {call.keyPoints.map((point, idx) => (
            <Text key={idx} style={styles.bulletPoint}>• {point}</Text>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Full Transcript</Text>
        <Text style={styles.transcriptText}>{call.fullTranscript}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16
  },
  loader: {
    flex: 1,
    justifyContent: 'center'
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12
  },
  summaryText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20
  },
  bulletPoint: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8
  },
  transcriptText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 22,
    fontStyle: 'italic'
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 24
  }
});

export default CallDetailScreen;
