import React, { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerModalProps {
  visible: boolean;
  title?: string;
  value: Date;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  /** Set true when rendered inside another Modal to avoid nested Modal issues on iOS */
  inlineOverlay?: boolean;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  title = 'Select Date',
  value,
  onClose,
  onSelectDate,
  inlineOverlay = false,
}) => {
  const [tempDate, setTempDate] = useState<Date>(value);

  useEffect(() => {
    if (visible) {
      setTempDate(value);
    }
  }, [visible, value]);

  if (!visible) return null;

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={tempDate}
        mode="date"
        display="default"
        onChange={(event, selectedDate) => {
          onClose();
          if (event.type === 'set' && selectedDate) {
            onSelectDate(selectedDate);
          }
        }}
      />
    );
  }

  const content = (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.divider} />
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="spinner"
          themeVariant="dark"
          textColor="#ffffff"
          onChange={(_, selectedDate) => {
            if (selectedDate) setTempDate(selectedDate);
          }}
          style={styles.picker}
        />
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => {
              onSelectDate(tempDate);
              onClose();
            }}
          >
            <Text style={styles.confirmText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (inlineOverlay) {
    return content;
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#121212',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
  },
  picker: {
    width: '100%',
    height: 210,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  cancelText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#0d1f0e',
  },
  confirmText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '700',
  },
});
