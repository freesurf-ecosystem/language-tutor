import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView
} from 'react-native';

/**
 * CallScreen
 * Active call interface with real-time transcript
 * Shows live transcription as user speaks
 */
const CallScreen = ({ route, navigation }) => {
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, active, ended
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [currentText, setCurrentText] = useState('');

  useEffect(() => {
    let interval;
    if (callStatus === 'active') {
      interval = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // TODO: WebSocket connection to backend for real-time transcript streaming

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    // TODO: Close WebSocket connection
    // TODO: Save transcript and trigger summarization
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => handleEndCall()}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call in Progress</Text>
        <Text style={styles.duration}>{formatDuration(duration)}</Text>
      </View>

      {callStatus === 'connecting' && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#28a745" />
          <Text style={styles.statusText}>Connecting to AI...</Text>
        </View>
      )}

      {callStatus === 'active' && (
        <>
          <View style={styles.statusIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording</Text>
          </View>

          <ScrollView style={styles.transcriptView}>
            {transcript.map((item, idx) => (
              <View key={idx} style={styles.transcriptLine}>
                <View
                  style={[
                    styles.speaker,
                    item.speaker === 'user'
                      ? styles.userSpeaker
                      : styles.aiSpeaker
                  ]}
                >
                  <Text style={styles.speakerLabel}>
                    {item.speaker === 'user' ? 'You' : 'AI'}
                  </Text>
                </View>
                <Text style={styles.transcriptText}>{item.text}</Text>
              </View>
            ))}

            {currentText && (
              <View style={styles.transcriptLine}>
                <View style={[styles.speaker, styles.userSpeaker]}>
                  <Text style={styles.speakerLabel}>You</Text>
                </View>
                <Text style={[styles.transcriptText, styles.liveText]}>
                  {currentText}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.endButton}
              onPress={handleEndCall}
            >
              <Text style={styles.endButtonText}>End Call</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {callStatus === 'ended' && (
        <View style={styles.centerContent}>
          <Text style={styles.endedIcon}>✓</Text>
          <Text style={styles.statusText}>Call Saved</Text>
          <Text style={styles.subtext}>Processing transcript...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  closeButton: {
    fontSize: 24,
    color: '#dc3545'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529'
  },
  duration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28a745'
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
    marginTop: 16
  },
  subtext: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4
  },
  statusIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc3545',
    marginRight: 8
  },
  recordingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc3545'
  },
  transcriptView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  transcriptLine: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  speaker: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
    minWidth: 50,
    alignItems: 'center'
  },
  userSpeaker: {
    backgroundColor: '#007AFF'
  },
  aiSpeaker: {
    backgroundColor: '#6c757d'
  },
  speakerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff'
  },
  transcriptText: {
    flex: 1,
    fontSize: 13,
    color: '#212529',
    lineHeight: 18
  },
  liveText: {
    opacity: 0.7,
    fontStyle: 'italic'
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12
  },
  endButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  endButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  endedIcon: {
    fontSize: 48,
    color: '#28a745'
  }
});

export default CallScreen;
