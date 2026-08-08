import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated
} from 'react-native';

/**
 * FloatingCallButton
 * Floating action button for initiating phone calls
 * Appears in the corner of the screen across all tabs
 */
const FloatingCallButton = ({ onPress, statusLabel = null }) => {
  const [scaleAnim] = React.useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true
    }).start();
  };

  const handlePress = () => {
    handlePressOut();
    onPress();
  };

  return (
    <>
      <Animated.View
        style={[
          styles.floatingContainer,
          {
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          <Text style={styles.phoneIcon}>📞</Text>
        </TouchableOpacity>
      </Animated.View>

      {statusLabel ? (
        <View style={styles.statusIndicator}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    zIndex: 999
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12
  },
  phoneIcon: {
    fontSize: 32
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 160,
    right: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  }
});

export default FloatingCallButton;
