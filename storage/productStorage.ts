import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProductItem } from '@/models/Product';

export const PRODUCTS_STORAGE_KEY = 'products_list';

export async function saveProducts(products: ProductItem[]): Promise<void> {
  try {
    const json = JSON.stringify(products);
    await AsyncStorage.setItem(PRODUCTS_STORAGE_KEY, json);
  } catch (error) {
    console.error('Error saving products:', error);
  }
}

export async function loadProducts(): Promise<ProductItem[]> {
  try {
    const json = await AsyncStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!json) return [];
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error loading products:', error);
    return [];
  }
}
