import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

/**
 * CallCard component
 * Displays a summary of a single call in the timeline
 */
const CallCard = ({ call }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{formatDate(call.startedAt)}</Text>
        <Text style={styles.cardDuration}>{call.callDurationSeconds}s</Text>
      </View>
      
      <Text style={styles.cardSummary} numberOfLines={2}>
        {call.summary || 'No summary available'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  cardDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529'
  },
  cardDuration: {
    fontSize: 12,
    color: '#6c757d'
  },
  cardSummary: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 18
  }
});

export default CallCard;
