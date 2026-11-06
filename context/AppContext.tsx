import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProductItem } from '@/models/Product';
import { loadProducts, saveProducts } from '@/storage/productStorage';
import { INITIAL_SETTINGS, loadSetting, saveSetting, Settings } from '@/storage/settingStorage';

interface AppContextType {
  products: ProductItem[];
  settings: Settings;
  isLoading: boolean;
  refreshData: () => Promise<void>;
  updateProducts: (newProducts: ProductItem[]) => Promise<void>;
  addProducts: (items: ProductItem[]) => Promise<void>;
  deleteProductById: (id: string | number) => Promise<void>;
  updateSettings: (updater: Settings | ((prev: Settings) => Settings)) => Promise<void>;
  clearAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = useCallback(async () => {
    try {
      const [loadedProducts, loadedSettings] = await Promise.all([
        loadProducts(),
        loadSetting(),
      ]);
      setProducts(loadedProducts);
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error refreshing app data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const updateProducts = useCallback(async (newProducts: ProductItem[]) => {
    setProducts(newProducts);
    await saveProducts(newProducts);
  }, []);

  const addProducts = useCallback(async (items: ProductItem[]) => {
    const current = await loadProducts();
    const updated = [...current, ...items];
    setProducts(updated);
    await saveProducts(updated);
  }, []);

  const deleteProductById = useCallback(async (id: string | number) => {
    const current = await loadProducts();
    const updated = current.filter((p) => p.id !== id);
    setProducts(updated);
    await saveProducts(updated);
  }, []);

  const updateSettings = useCallback(
    async (updater: Settings | ((prev: Settings) => Settings)) => {
      setSettings((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        saveSetting(next);
        return next;
      });
    },
    []
  );

  const clearAllData = useCallback(async () => {
    await AsyncStorage.clear();
    setProducts([]);
    setSettings(INITIAL_SETTINGS);
  }, []);

  return (
    <AppContext.Provider
      value={{
        products,
        settings,
        isLoading,
        refreshData,
        updateProducts,
        addProducts,
        deleteProductById,
        updateSettings,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return ctx;
};
