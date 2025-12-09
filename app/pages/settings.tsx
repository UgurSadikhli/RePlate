import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity,
  Alert, 
  TextInput, 
  Switch, 
  Platform 
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; 
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveSetting, loadSetting } from '../storage/settingStorage'; 


const generateCode = () => {
  return Math.floor(10000 + Math.random() * 90000);
};

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  AZN: '₼',
};
const getCurrencySymbol = (code: string) => {
  return CURRENCY_SYMBOLS[code] || code;
};


const INITIAL_SETTINGS = {
  currency: 'USD',
  notificationsEnabled: true,
  theme: 'system',
  aiPreferences: {
    isVegetarian: false,
    avoidDairy: false,
    spiceLevel: 'medium',
    allergens: '', 
  },
};

type AiPreferences = typeof INITIAL_SETTINGS['aiPreferences'];
type Settings = typeof INITIAL_SETTINGS;


const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [codeToDelete, setCodeToDelete] = useState(0); 

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const loadedData = await loadSetting();
        setSettings({ 
          ...INITIAL_SETTINGS, 
          ...loadedData,
          aiPreferences: { ...INITIAL_SETTINGS.aiPreferences, ...loadedData.aiPreferences }
        });
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveSetting(settings);
      console.log('Current Settings:', settings); 
    }
  }, [settings, isLoading]);
  
  const handleCurrencyChange = (newCurrency: string) => {
    setSettings(prev => ({ ...prev, currency: newCurrency }));
  };

  const handleToggleChange = (key: keyof Settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleAiPreferenceChange = (key: keyof AiPreferences, value: string | boolean) => {
    setSettings(prev => ({ 
      ...prev, 
      aiPreferences: { ...prev.aiPreferences, [key]: value } 
    }));
  };

  const handleClearAllData = () => {
    const code = generateCode();
    setCodeToDelete(code);

    Alert.alert(
      "🛑 Confirm Data Deletion",
      `Are you sure you want to delete ALL application data (inventory, preferences, settings)?\n\nTo confirm this action, please type the following 5-digit code: ${code}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & Delete",
          style: "destructive",
          onPress: () => showDeletePrompt(code)
        },
      ],
      { cancelable: false }
    );
  };

  const showDeletePrompt = (expectedCode: number) => {
    
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Alert.prompt(
            "Type Confirmation Code",
            `Enter the code: ${expectedCode}`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm Delete",
                    style: "destructive",
                    onPress: (text) => {
                        if (text === expectedCode.toString()) {
                            performDataDeletion();
                        } else {
                            Alert.alert("Error", "Code mismatch. Data deletion cancelled.");
                        }
                    }
                }
            ],
            'plain-text'
        );
    } else {
        const userInput = prompt(`Type the code (${expectedCode}) to confirm deletion:`);
        if (userInput === expectedCode.toString()) {
            performDataDeletion();
        } else {
            Alert.alert("Error", "Code mismatch. Data deletion cancelled.");
        }
    }
  };
  
  const performDataDeletion = async () => {
    try {
      await AsyncStorage.clear();
      setSettings(INITIAL_SETTINGS);
      Alert.alert("Success", "All application data has been permanently deleted.");
    } catch (error) {
      console.error("Error clearing AsyncStorage:", error);
      Alert.alert("Error", "Failed to delete data.");
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
            onPress={() => Alert.alert(
              "Select Currency", 
              "Choose your preferred currency", 
              [
                { text: "USD", onPress: () => handleCurrencyChange('USD') },
                { text: "EUR", onPress: () => handleCurrencyChange('EUR') },
                { text: "GBP", onPress: () => handleCurrencyChange('GBP') },
                { text: "AZN", onPress: () => handleCurrencyChange('AZN') },
                { text: "Cancel", style: 'cancel' },
              ]
            )}
            detailText={`Current: ${getCurrencySymbol(settings.currency)}`}
          />
          
          <SettingItem 
            title="App Theme" 
            icon="color-palette-outline" 
            value={settings.theme}
            detailText={`under construction`}
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
              if (Platform.OS === 'ios' || Platform.OS === 'android') {
                Alert.prompt(
                  "Known Allergens",
                  "Enter common ingredients to strictly exclude (e.g., Peanuts, Wheat, Soy).",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Save",
                      onPress: (text) => handleAiPreferenceChange('allergens', text || ''),
                    }
                  ],
                  'plain-text',
                  settings.aiPreferences.allergens 
                );
              } else {
                const text = prompt("Enter common ingredients to strictly exclude (e.g., Peanuts, Wheat, Soy).", settings.aiPreferences.allergens);
                if (text !== null) {
                   handleAiPreferenceChange('allergens', text);
                }
              }
            }}
            detailText={settings.aiPreferences.allergens ? settings.aiPreferences.allergens.length > 20 ? settings.aiPreferences.allergens.substring(0, 17) + '...' : settings.aiPreferences.allergens : "Tap to set"}
          />

          <SettingItem 
            title="Preferred Spice Level" 
            icon="flame-outline" 
            value={settings.aiPreferences.spiceLevel}
            onPress={() => Alert.alert(
              "Spice Level", 
              "How spicy do you like your meals?", 
              [
                { text: "Mild", onPress: () => handleAiPreferenceChange('spiceLevel', 'mild') },
                { text: "Medium", onPress: () => handleAiPreferenceChange('spiceLevel', 'medium') },
                { text: "Hot", onPress: () => handleAiPreferenceChange('spiceLevel', 'hot') },
                { text: "Cancel", style: 'cancel' },
              ]
            )}
            detailText={settings.aiPreferences.spiceLevel.charAt(0).toUpperCase() + settings.aiPreferences.spiceLevel.slice(1)}
          />

        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleClearAllData}
          >
            <Ionicons name="trash-outline" size={20} color="#000000" />
            <Text style={styles.deleteButtonText}>Delete All App Data</Text>
          </TouchableOpacity>
          <Text style={styles.warningText}>
            WARNING: This action is irreversible and will delete all stored inventory, settings, and historical data.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;


interface SettingItemProps {
  title: string;
  icon: string;
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
  value, 
  detailText, 
  onPress, 
  isToggle, 
  toggleValue, 
  onToggle 
}) => {
  return (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={isToggle || !onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Ionicons name={icon as any} size={22} color="#4CAF50" style={styles.settingIcon} />
      <Text style={styles.settingTitle}>{title}</Text>
      
      {isToggle ? (
        <Switch
          trackColor={{ false: "#767577", true: "#4CAF50" }}
          thumbColor={toggleValue ? "#FFFFFF" : "#f4f3f4"}
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
  }
});