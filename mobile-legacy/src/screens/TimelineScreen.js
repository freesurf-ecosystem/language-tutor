import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import CallCard from '../components/CallCard';

/**
 * TimelineScreen (Legacy - Now shows recent transcripts)
 * Quick access to recent calls
 */
const TimelineScreen = ({ navigation }) => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecentCalls();
  }, []);

  const loadRecentCalls = async () => {
    setLoading(true);
    try {
      // TODO: Fetch recent calls from backend API
      // GET /api/calls?limit=10&sort=date_desc
      // const response = await fetch('${BACKEND_URL}/api/calls?limit=10');
      // const data = await response.json();
      // setCalls(data);
    } catch (error) {
      console.error('Error loading calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCallPress = (callId) => {
    navigation.navigate('CallDetail', { callId });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.pageTitle}>Recent</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Transcript')}>
          <Text style={styles.viewAllLink}>View All →</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : calls.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>☎️</Text>
          <Text style={styles.emptyText}>No calls yet</Text>
          <Text style={styles.emptySubtext}>
            Tap the phone button to start a conversation with AI
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.callsList}>
          {calls.map((call) => (
            <TouchableOpacity 
              key={call.id}
              onPress={() => handleCallPress(call.id)}
            >
              <CallCard call={call} />
            </TouchableOpacity>
          ))}
        </ScrollView>
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529'
  },
  viewAllLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500'
  },
  loader: {
    marginTop: 50
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
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
  },
  callsList: {
    padding: 12
  }
});

export default TimelineScreen;
