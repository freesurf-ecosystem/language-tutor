import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

/**
 * NoteCard component
 * Displays a note preview
 */
const NoteCard = ({ note }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{note.title}</Text>
        <Text style={styles.cardDate}>{formatDate(note.createdAt)}</Text>
      </View>
      
      <Text style={styles.cardContent} numberOfLines={2}>
        {note.content}
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
    borderLeftColor: '#ffc107'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    flex: 1
  },
  cardDate: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 8
  },
  cardContent: {
    fontSize: 13,
    color: '#495057',
    lineHeight: 18
  }
});

export default NoteCard;
