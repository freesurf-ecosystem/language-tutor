import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SectionList
} from 'react-native';
import NoteCard from '../components/NoteCard';

/**
 * NotesScreen
 * View notes organized by topic with ability to create new notes
 */
const NotesScreen = ({ navigation }) => {
  const [notes, setNotes] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);

  useEffect(() => {
    loadNotes();
    loadTopics();
  }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      // TODO: Fetch notes from backend API
      // GET /api/notes
      // const response = await fetch('${BACKEND_URL}/api/notes');
      // const data = await response.json();
      // setNotes(data);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTopics = async () => {
    try {
      // TODO: Fetch topics from backend API
      // GET /api/topics
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

  const handleCreateNote = () => {
    // TODO: Navigate to create note screen
    navigation.navigate('CreateNote');
  };

  // Group notes by topic
  const groupedNotes = topics
    .filter(topic => selectedTopic === null || topic.id === selectedTopic)
    .map(topic => ({
      title: topic.name,
      data: notes.filter(note => note.topicId === topic.id),
      topicId: topic.id
    }))
    .filter(group => group.data.length > 0 || selectedTopic === null);

  // Add "Unorganized" section if there are notes without a topic
  const unorganizedNotes = notes.filter(note => !note.topicId);
  if (unorganizedNotes.length > 0 && (selectedTopic === null)) {
    groupedNotes.unshift({
      title: 'Unorganized',
      data: unorganizedNotes,
      topicId: null
    });
  }

  const renderNote = ({ item }) => <NoteCard note={item} />;

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.pageTitle}>Notes</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateNote}
        >
          <Text style={styles.createButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Topic Filter Scroll View */}
      {topics.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.topicScroll}
          contentContainerStyle={styles.topicContent}
        >
          <TouchableOpacity
            style={[
              styles.topicTag,
              selectedTopic === null && styles.topicTagActive
            ]}
            onPress={() => setSelectedTopic(null)}
          >
            <Text
              style={[
                styles.topicTagText,
                selectedTopic === null && styles.topicTagTextActive
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {topics.map(topic => (
            <TouchableOpacity
              key={topic.id}
              style={[
                styles.topicTag,
                selectedTopic === topic.id && styles.topicTagActive
              ]}
              onPress={() => setSelectedTopic(topic.id)}
            >
              <Text
                style={[
                  styles.topicTagText,
                  selectedTopic === topic.id && styles.topicTagTextActive
                ]}
              >
                {topic.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyText}>No notes yet</Text>
          <Text style={styles.emptySubtext}>
            Create a note or extract from a call
          </Text>
        </View>
      ) : (
        <SectionList
          sections={groupedNotes}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderNote}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.notesList}
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
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  createButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300'
  },
  topicScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  topicContent: {
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  topicTag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  topicTagActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  topicTagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#495057'
  },
  topicTagTextActive: {
    color: '#fff'
  },
  loader: {
    marginTop: 50
  },
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa'
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    textTransform: 'uppercase'
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
  notesList: {
    padding: 12
  }
});

export default NotesScreen;
