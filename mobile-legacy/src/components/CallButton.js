import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';

const CallButton = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <View style={styles.phoneIcon}>
        <Text style={styles.phoneText}>📞</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  phoneIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center'
  },
  phoneText: {
    fontSize: 28
  }
});

export default CallButton;
