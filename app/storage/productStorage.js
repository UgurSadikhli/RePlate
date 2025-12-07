import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "products_list";

export async function saveProducts(products) {
  try {
    const json = JSON.stringify(products);
    await AsyncStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    console.error("Error saving products:", error);
  }
}

export async function loadProducts() {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json != null ? JSON.parse(json) : [];
  } catch (error) {
    console.error("Error loading products:", error);
    return [];
  }
}
