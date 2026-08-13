import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Check } from 'lucide-react-native';

const NoteCard = ({ note, onPress, onLongPress, selected, selectMode }) => {
  const theme = useTheme();
  const c = theme.colors;

  const formatDate = (dateVal) => {
    if (!dateVal) return '';
    const date = new Date(dateVal);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handlePress = () => {
    console.log('[NoteCard] press:', note?.id, note?.title);
    onPress?.();
  };

  const handleLongPress = () => {
    console.log('[NoteCard] long press:', note?.id, note?.title);
    onLongPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      delayLongPress={800}
    >
      <View style={[s.card, { backgroundColor: c.surface }, selected && { borderColor: c.primary }]}>
        {selectMode && (
          <View style={[s.checkbox, { borderColor: c.outline }, selected && { backgroundColor: c.primary, borderColor: c.primary }]}>
            {selected && <Check size={12} color="#fff" />}
          </View>
        )}
        <View style={s.body}>
          <View style={s.header}>
            <Text style={[s.title, { color: c.onSurface }]} numberOfLines={1}>{note.title || 'Untitled'}</Text>
            <Text style={[s.date, { color: c.onSurfaceVariant }]}>{formatDate(note.updatedAt || note.createdAt)}</Text>
          </View>
          <Text style={[s.content, { color: c.onSurfaceVariant }]} numberOfLines={2}>
            {note.content}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default NoteCard;

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 },
  body: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 14, fontWeight: '600', flex: 1 },
  date: { fontSize: 12, marginLeft: 8 },
  content: { fontSize: 13, lineHeight: 18 },
});
