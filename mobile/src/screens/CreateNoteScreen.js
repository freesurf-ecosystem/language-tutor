import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';

/**
 * CreateNoteScreen
 * Create or edit a note
 */
const CreateNoteScreen = ({ route, navigation }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please add a title');
      return;
    }

    setLoading(true);
    try {
      // TODO: POST /api/notes - Create new note
      // const response = await fetch('${BACKEND_URL}/api/notes', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     title,
      //     content,
      //     topicId: selectedTopic
      //   })
      // });

      navigation.goBack();
    } catch (error) {
      alert('Error saving note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Note</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveButton, loading && styles.disabledButton]}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <TextInput
          style={styles.titleInput}
          placeholder="Note Title"
          placeholderTextColor="#adb5bd"
          value={title}
          onChangeText={setTitle}
          editable={!loading}
        />

        <TextInput
          style={styles.contentInput}
          placeholder="Start typing your note..."
          placeholderTextColor="#adb5bd"
          value={content}
          onChangeText={setContent}
          multiline
          editable={!loading}
          textAlignVertical="top"
        />

        {/* TODO: Add topic selector */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529'
  },
  cancelButton: {
    color: '#6c757d',
    fontSize: 14
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600'
  },
  disabledButton: {
    opacity: 0.5
  },
  content: {
    flex: 1,
    padding: 16
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
    paddingVertical: 8
  },
  contentInput: {
    fontSize: 14,
    color: '#212529',
    minHeight: 300,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    paddingTop: 12
  }
});

export default CreateNoteScreen;
