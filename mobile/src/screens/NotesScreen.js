import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, Text, TouchableOpacity,
  ActivityIndicator, SectionList, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { ChevronLeft, FileText, Plus, Mic, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NoteCard from '../components/NoteCard';
import { subscribeNotes } from '../utils/notesBus';

const NOTES_KEY = 'freesurf-tutor-notes';
const AUTO_SAVE_MS = 800;

let noteCounter = Date.now();

function makeNote(title = '', content = '', topic = '') {
  return { id: `note-${++noteCounter}`, title, content, topic, createdAt: Date.now(), updatedAt: Date.now() };
}

export default function NotesScreen() {
  const theme = useTheme();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [editor, setEditor] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    loadNotes();
    return subscribeNotes(loadNotes);
  }, []);

  async function loadNotes() {
    console.log('[Notes] loading from storage...');
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(NOTES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        console.log('[Notes] loaded', parsed.length, 'notes');
        setNotes(parsed);
      } else {
        console.log('[Notes] no notes found in storage');
      }
    } catch (e) {
      console.log('[Notes] load error:', e?.message || e);
    } finally { setLoading(false); }
  }

  async function saveNotes(u) { setNotes(u); await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(u)); }

  function handleNotePress(note) {
    console.log('[Notes] press:', note.id);
    if (selectMode) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(note.id)) {
          next.delete(note.id);
          if (next.size === 0) setSelectMode(false);
        } else {
          next.add(note.id);
        }
        return next;
      });
      return;
    }
    setEditor({ ...note });
  }

  function handleNoteLongPress(note) {
    console.log('[Notes] long press:', note.id);
    setSelectMode(true);
    setSelectedIds(new Set([note.id]));
  }

  function handleBatchDelete() {
    const count = selectedIds.size;
    console.log('[Notes] batch delete:', count, 'notes');
    Alert.alert(`Delete ${count} note${count > 1 ? 's' : ''}?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          saveNotes(notes.filter(n => !selectedIds.has(n.id)));
          setSelectMode(false);
          setSelectedIds(new Set());
        },
      },
    ]);
  }

  const topics = [...new Set(notes.map(n => n.topic).filter(Boolean))];

  const filtered = selectedTopic
    ? notes.filter(n => n.topic === selectedTopic)
    : notes;

  const grouped = topics.length > 0
    ? topics.map(t => ({ title: t, data: filtered.filter(n => n.topic === t) })).filter(g => g.data.length > 0)
    : [{ title: 'Notes', data: filtered }];

  const c = theme.colors;

  const renderItem = ({ item }) => (
    <NoteCard
      note={item}
      onPress={() => handleNotePress(item)}
      onLongPress={() => handleNoteLongPress(item)}
      selected={selectedIds.has(item.id)}
      selectMode={selectMode}
    />
  );

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={[st.sectionHeader, { backgroundColor: c.background }]}>
      <Text style={[st.sectionTitle, { color: c.onSurfaceVariant }]}>{title}</Text>
    </View>
  );

  if (editor) {
    console.log('[Notes] rendering editor for note:', editor.id);
    const handleSave = (saved) => {
      console.log('[Notes] auto-saving note:', saved.id);
      setNotes(prev => {
        const existing = prev.some(n => n.id === saved.id);
        const next = existing ? prev.map(n => n.id === saved.id ? saved : n) : [saved, ...prev];
        AsyncStorage.setItem(NOTES_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      setEditor(saved);
    };
    const handleClose = (saved) => {
      console.log('[Notes] editor closing, saved:', saved ? 'yes' : 'no');
      if (saved) {
        handleSave(saved);
      }
      setEditor(null);
    };
    return (
      <NoteEditor
        note={editor}
        onSave={handleSave}
        onClose={handleClose}
      />
    );
  }

  return (
    <View style={[st.container, { backgroundColor: c.background }]}>
      {topics.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[st.topicScroll, { backgroundColor: c.surface, borderBottomColor: c.outline }]} contentContainerStyle={st.topicContent}>
          <TouchableOpacity style={[st.topicTag, { backgroundColor: selectedTopic === null ? c.primary : c.surfaceVariant, borderColor: c.outline }]} onPress={() => setSelectedTopic(null)}>
            <Text style={[st.topicTagText, { color: selectedTopic === null ? c.onPrimary : c.onSurfaceVariant }]}>All</Text>
          </TouchableOpacity>
          {topics.map(t => (
            <TouchableOpacity key={t} style={[st.topicTag, { backgroundColor: selectedTopic === t ? c.primary : c.surfaceVariant, borderColor: c.outline }]} onPress={() => setSelectedTopic(selectedTopic === t ? null : t)}>
              <Text style={[st.topicTagText, { color: selectedTopic === t ? c.onPrimary : c.onSurfaceVariant }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={c.primary} style={st.loader} />
      ) : notes.length === 0 ? (
        <View style={st.emptyState}>
          <FileText size={44} color={c.onSurfaceVariant} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 8 }}>
            <View style={{ width: 20, alignItems: 'center' }}><Plus size={18} color={c.onSurfaceVariant} /></View>
            <Text style={[st.emptyPrompt, { color: c.onSurface }]}>Tap to create your first note</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 }}>
            <View style={{ width: 20, alignItems: 'center' }}><Mic size={18} color={c.onSurfaceVariant} /></View>
            <Text style={[st.emptyPrompt, { color: c.onSurface }]}>Tap to speak with your English tutor</Text>
          </View>
        </View>
      ) : (
        <SectionList
          sections={grouped}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={st.notesList}
        />
      )}

      {selectMode && (
        <View style={st.selectBar}>
          <TouchableOpacity onPress={handleBatchDelete} style={st.selectBarBtn}>
            <Trash2 size={22} color={c.error || '#dc2626'} />
          </TouchableOpacity>
        </View>
      )}

      {!selectMode && (
        <TouchableOpacity style={[st.createFab, { backgroundColor: c.primary }]} onPress={() => setEditor(makeNote())}>
          <Plus size={22} color={c.onPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function NoteEditor({ note, onSave, onClose }) {
  const theme = useTheme();
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const saveTimer = useRef(null);
  const noteRef = useRef(note);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  const doSave = useCallback(() => {
    const current = noteRef.current;
    if (!current) return;
    const updated = {
      ...current,
      title: title.trim() || 'Untitled',
      content,
      updatedAt: Date.now(),
    };
    console.log('[NoteEditor] auto-saving:', updated.id, 'title:', updated.title?.slice(0, 30));
    onSave(updated);
  }, [title, content]);

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, AUTO_SAVE_MS);
  }

  function handleTitleChange(v) {
    setTitle(v);
    scheduleSave();
  }

  function handleContentChange(v) {
    setContent(v);
    scheduleSave();
  }

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  const c = theme.colors;

  return (
    <KeyboardAvoidingView style={[ed.full, { backgroundColor: c.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={ed.body} keyboardShouldPersistTaps="handled">
        <TextInput
          style={[ed.titleInput, { color: c.onSurface, borderBottomColor: c.outline }]}
          placeholder="Note Title"
          placeholderTextColor={c.onSurfaceVariant}
          value={title}
          onChangeText={handleTitleChange}
          autoFocus={!note.title}
        />
        <TextInput
          style={[ed.contentInput, { color: c.onSurface }]}
          placeholder="Start writing..."
          placeholderTextColor={c.onSurfaceVariant}
          value={content}
          onChangeText={handleContentChange}
          multiline
          textAlignVertical="top"
        />
        <View style={{ height: 200 }} />
      </ScrollView>

      <TouchableOpacity style={[ed.backBtn, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={() => { console.log('[NoteEditor] back pressed'); if (saveTimer.current) clearTimeout(saveTimer.current); onClose({ ...noteRef.current, title: title.trim() || 'Untitled', content, updatedAt: Date.now() }); }}>
        <ChevronLeft size={22} color={c.onSurface} />
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  topicScroll: { borderBottomWidth: 1, maxHeight: 48 },
  topicContent: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row' },
  topicTag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 6 },
  topicTagText: { fontSize: 13, fontWeight: '500' },
  loader: { marginTop: 60 },
  sectionHeader: { paddingHorizontal: 14, paddingVertical: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  emptyState: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 100 },
  emptyPrompt: { fontSize: 16, fontWeight: '500', flexShrink: 1 },
  notesList: { padding: 12, paddingBottom: 100 },
  createFab: { position: 'absolute', bottom: 120, left: 20, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', zIndex: 50, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  selectBar: { position: 'absolute', top: 52, right: 66, width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', zIndex: 60, backgroundColor: 'rgba(0,0,0,0.8)' },
  selectBarBtn: { padding: 4 },
});

const ed = StyleSheet.create({
  full: { flex: 1 },
  backBtn: { position: 'absolute', bottom: 40, left: 20, width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 54 },
  titleInput: { fontSize: 22, fontWeight: '700', paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, marginBottom: 16 },
  contentInput: { fontSize: 16, lineHeight: 24, paddingTop: 4 },
});
