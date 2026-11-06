import React, { useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';
import { AiPreferences, Settings } from '@/storage/settingStorage';
import { getCurrencySymbol } from '@/utils/currency';

const generateCode = () => Math.floor(10000 + Math.random() * 90000);

const SettingsScreen: React.FC = () => {
  const { settings, isLoading, updateSettings, clearAllData } = useAppContext();

  const [allergenModalVisible, setAllergenModalVisible] = useState(false);
  const [allergenDraft, setAllergenDraft] = useState('');

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState(0);
  const [enteredCode, setEnteredCode] = useState('');

  const handleCurrencyChange = (newCurrency: string) => {
    updateSettings((prev) => ({ ...prev, currency: newCurrency }));
  };

  const handleToggleChange = (key: keyof Settings, value: boolean) => {
    updateSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleAiPreferenceChange = (key: keyof AiPreferences, value: string | boolean) => {
    updateSettings((prev) => ({
      ...prev,
      aiPreferences: { ...prev.aiPreferences, [key]: value },
    }));
  };

  const handleClearAllData = () => {
    const code = generateCode();
    setCodeToDelete(code);
    setEnteredCode('');
    setDeleteModalVisible(true);
  };

  const confirmDeleteWithCode = async () => {
    if (enteredCode.trim() !== String(codeToDelete)) {
      Alert.alert('Error', 'Code mismatch. Data deletion cancelled.');
      return;
    }
    try {
      await clearAllData();
      setDeleteModalVisible(false);
      Alert.alert('Success', 'All application data has been permanently deleted.');
    } catch (error) {
      console.error('Error clearing data:', error);
      Alert.alert('Error', 'Failed to delete data.');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.title}>Loading Settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Application Settings</Text>
          <Text style={styles.subtitle}>Manage your preferences and data.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>

          <SettingItem
            title="Currency"
            icon="cash-outline"
            value={settings.currency}
            onPress={() =>
              Alert.alert('Select Currency', 'Choose your preferred currency', [
                { text: 'USD', onPress: () => handleCurrencyChange('USD') },
                { text: 'EUR', onPress: () => handleCurrencyChange('EUR') },
                { text: 'GBP', onPress: () => handleCurrencyChange('GBP') },
                { text: 'AZN', onPress: () => handleCurrencyChange('AZN') },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
            detailText={`Current: ${getCurrencySymbol(settings.currency)}`}
          />

          <SettingItem
            title="App Theme"
            icon="color-palette-outline"
            value={settings.theme}
            detailText="Dark (Default)"
          />

          <SettingItem
            title="Push Notifications"
            icon="notifications-outline"
            isToggle={true}
            toggleValue={settings.notificationsEnabled}
            onToggle={(value) => handleToggleChange('notificationsEnabled', value)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Meal Preferences</Text>

          <Text style={styles.bodyText}>
            Help the AI generate better meal suggestions by defining your food habits and restrictions.
          </Text>

          <SettingItem
            title="I am Vegetarian"
            icon="leaf-outline"
            isToggle={true}
            toggleValue={settings.aiPreferences.isVegetarian}
            onToggle={(value) => handleAiPreferenceChange('isVegetarian', value)}
          />

          <SettingItem
            title="Avoid Dairy"
            icon="pint-outline"
            isToggle={true}
            toggleValue={settings.aiPreferences.avoidDairy}
            onToggle={(value) => handleAiPreferenceChange('avoidDairy', value)}
          />

          <SettingItem
            title="Known Allergens"
            icon="sad-outline"
            value={settings.aiPreferences.allergens}
            onPress={() => {
              setAllergenDraft(settings.aiPreferences.allergens || '');
              setAllergenModalVisible(true);
            }}
            detailText={
              settings.aiPreferences.allergens
                ? settings.aiPreferences.allergens.length > 20
                  ? settings.aiPreferences.allergens.substring(0, 17) + '...'
                  : settings.aiPreferences.allergens
                : 'Tap to set'
            }
          />

          <SettingItem
            title="Preferred Spice Level"
            icon="flame-outline"
            value={settings.aiPreferences.spiceLevel}
            onPress={() =>
              Alert.alert('Spice Level', 'How spicy do you like your meals?', [
                { text: 'Mild', onPress: () => handleAiPreferenceChange('spiceLevel', 'mild') },
                { text: 'Medium', onPress: () => handleAiPreferenceChange('spiceLevel', 'medium') },
                { text: 'Hot', onPress: () => handleAiPreferenceChange('spiceLevel', 'hot') },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
            detailText={
              settings.aiPreferences.spiceLevel.charAt(0).toUpperCase() +
              settings.aiPreferences.spiceLevel.slice(1)
            }
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          <TouchableOpacity style={styles.deleteButton} onPress={handleClearAllData}>
            <Ionicons name="trash-outline" size={20} color="#000000" />
            <Text style={styles.deleteButtonText}>Delete All App Data</Text>
          </TouchableOpacity>
          <Text style={styles.warningText}>
            WARNING: This action is irreversible and will delete all stored inventory, settings, and historical data.
          </Text>
        </View>
      </ScrollView>

      {/* Cross-Platform Known Allergens Modal */}
      <Modal
        visible={allergenModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAllergenModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Known Allergens</Text>
            <Text style={styles.modalSubtitle}>
              Enter common ingredients to strictly exclude (e.g., Peanuts, Wheat, Soy).
            </Text>
            <TextInput
              style={styles.modalInput}
              value={allergenDraft}
              onChangeText={setAllergenDraft}
              placeholder="e.g., Peanuts, Shellfish"
              placeholderTextColor="#666"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setAllergenModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => {
                  handleAiPreferenceChange('allergens', allergenDraft.trim());
                  setAllergenModalVisible(false);
                }}
              >
                <Text style={styles.modalConfirmText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cross-Platform Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Data Deletion</Text>
            <Text style={styles.modalSubtitle}>
              Type the 5-digit confirmation code below to permanently delete all app data:{'\n'}
              <Text style={{ color: '#E91E63', fontWeight: '800', fontSize: 18 }}>
                {codeToDelete}
              </Text>
            </Text>
            <TextInput
              style={styles.modalInput}
              value={enteredCode}
              onChangeText={setEnteredCode}
              placeholder="Enter 5-digit code"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              maxLength={5}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#E91E63' }]}
                onPress={confirmDeleteWithCode}
              >
                <Text style={[styles.modalConfirmText, { color: '#000' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SettingsScreen;

interface SettingItemProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  value?: string;
  detailText?: string;
  onPress?: () => void;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  icon,
  detailText,
  onPress,
  isToggle,
  toggleValue,
  onToggle,
}) => {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={isToggle || !onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Ionicons name={icon} size={22} color="#4CAF50" style={styles.settingIcon} />
      <Text style={styles.settingTitle}>{title}</Text>

      {isToggle ? (
        <Switch
          trackColor={{ false: '#767577', true: '#4CAF50' }}
          thumbColor={toggleValue ? '#FFFFFF' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
          onValueChange={onToggle}
          value={toggleValue}
          style={styles.settingToggle}
        />
      ) : (
        <Text style={styles.settingDetail}>{detailText}</Text>
      )}

      {onPress && !isToggle && (
        <Ionicons name="chevron-forward-outline" size={20} color="#AAAAAA" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    padding: 20,
    backgroundColor: '#000000',
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#4CAF5050',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#AAAAAA',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 15,
  },
  bodyText: {
    fontSize: 16,
    color: '#E0E0E0',
    lineHeight: 24,
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderRadius: 10,
    padding: 15,
    marginBottom: 8,
  },
  settingIcon: {
    marginRight: 15,
  },
  settingTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  settingDetail: {
    fontSize: 16,
    color: '#AAAAAA',
    marginRight: 10,
  },
  settingToggle: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
    marginRight: -5,
  },
  deleteButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  deleteButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
  warningText: {
    fontSize: 14,
    color: '#E91E63',
    marginTop: 10,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
