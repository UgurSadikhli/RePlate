import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "setting_data";

export async function saveSetting(data) {
  try {
    const json = JSON.stringify(data);
    await AsyncStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    console.error("Error saving setting:", error);
  }
}

export async function loadSetting() {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json != null ? JSON.parse(json) : [];
  } catch (error) {
    console.error("Error loading setting:", error);
    return [];
  }
}
