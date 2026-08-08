import React, { useState, useContext } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
  Image
} from 'react-native';

/**
 * TranscriptScreen
 * View all call transcripts organized chronologically
 */
const TranscriptScreen = ({ navigation }) => {
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    loadTranscripts();
  }, []);

  const loadTranscripts = async () => {
    setLoading(true);
    try {
      // TODO: Fetch transcripts from backend API
      // GET /api/calls?sort=date_desc
      // const response = await fetch('${BACKEND_URL}/api/calls');
      // const data = await response.json();
    } catch (error) {
      console.error('Error loading transcripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const groupedTranscripts = transcripts.reduce((groups, transcript) => {
    const dateKey = formatDate(transcript.startedAt);
    const existingGroup = groups.find(g => g.title === dateKey);

    if (existingGroup) {
      existingGroup.data.push(transcript);
    } else {
      groups.push({
        title: dateKey,
        data: [transcript]
      });
    }

    return groups;
  }, []);

  const renderTranscript = ({ item }) => (
    <TouchableOpacity
      style={styles.transcriptCard}
      onPress={() => navigation.navigate('CallDetail', { callId: item.id })}
    >
      <View style={styles.transcriptHeader}>
        <Text style={styles.time}>
          {new Date(item.startedAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
        <Text style={styles.duration}>{item.callDurationSeconds}s</Text>
      </View>
      <Text style={styles.preview} numberOfLines={2}>
        {item.summary || item.fullTranscript?.substring(0, 100) || 'No transcript'}
      </Text>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.pageTitle}>Transcripts</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : transcripts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No transcripts yet</Text>
          <Text style={styles.emptySubtext}>
            Make a call to see your conversation history
          </Text>
        </View>
      ) : (
        <SectionList
          sections={groupedTranscripts}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderTranscript}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  headerBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529'
  },
  loader: {
    marginTop: 50
  },
  listContent: {
    padding: 12
  },
  sectionHeader: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa'
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    textTransform: 'uppercase'
  },
  transcriptCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  time: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529'
  },
  duration: {
    fontSize: 12,
    color: '#6c757d'
  },
  preview: {
    fontSize: 13,
    color: '#495057',
    lineHeight: 18
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center'
  }
});

export default TranscriptScreen;
