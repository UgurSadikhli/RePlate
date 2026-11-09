import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '@/context/AppContext';
import Product from '@/models/Product';
import { IdentifiedFoodItem, scanFoodImageWithGroq } from '@/services/ai';
import { formatDate } from '@/utils/date';

export default function ScanScreen() {
  const router = useRouter();
  const { addProducts } = useAppContext();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [identifiedItems, setIdentifiedItems] = useState<IdentifiedFoodItem[]>([]);

  const triggerHaptic = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
  };

  const extractImageAndBase64 = async (
    asset: ImagePicker.ImagePickerAsset
  ): Promise<{ uri: string; base64: string }> => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 640 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (manipResult.base64) {
        return { uri: manipResult.uri, base64: manipResult.base64 };
      }
    } catch {
      // Fallback to ImagePicker's native base64 if ImageManipulator fails in Expo Go
    }

    if (asset.base64 && asset.base64.length > 0) {
      return { uri: asset.uri, base64: asset.base64 };
    }

    throw new Error('Could not encode image to base64.');
  };

  const runScan = async (b64: string) => {
    if (!b64) return;

    triggerHaptic();
    setIsScanning(true);
    setIdentifiedItems([]);

    try {
      const items = await scanFoodImageWithGroq(b64);
      setIdentifiedItems(items);
      if (items.length === 0) {
        Alert.alert(
          'No Food Detected',
          'No distinct food items were found in this image. Try taking a clearer photo.'
        );
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      Alert.alert(
        'Scan Failed',
        error?.message || 'Could not analyze the image. Check your EXPO_PUBLIC_GROQ_API_KEY in .env.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Needed',
            'Photo library permission is required to select food photos.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.3,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        setIdentifiedItems([]);
        const { uri, base64 } = await extractImageAndBase64(result.assets[0]);
        setImageUri(uri);
        setBase64Image(base64);
        await runScan(base64);
      }
    } catch (error: any) {
      console.error('Pick image error:', error);
      Alert.alert('Image Error', error?.message || 'Could not load the selected photo.');
    }
  };

  const takePhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Needed',
            'Camera permission is required to take a photo of your food.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.3,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        setIdentifiedItems([]);
        const { uri, base64 } = await extractImageAndBase64(result.assets[0]);
        setImageUri(uri);
        setBase64Image(base64);
        await runScan(base64);
      }
    } catch (error: any) {
      console.error('Take photo error:', error);
      Alert.alert('Camera Error', error?.message || 'Could not capture photo.');
    }
  };

  const scanImage = async () => {
    if (!base64Image) return;
    await runScan(base64Image);
  };

  const removeItem = (index: number) => {
    triggerHaptic();
    setIdentifiedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemName = (index: number, newName: string) => {
    setIdentifiedItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, name: newName } : item))
    );
  };

  const adjustItemQuantity = (index: number, delta: number) => {
    triggerHaptic();
    setIdentifiedItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const unit = (item.quantity_estimate_type || 'pcs').toLowerCase();
        const step = unit === 'g' || unit === 'ml' ? 50 : 1;
        const current = parseFloat(String(item.quantity_estimate).replace(',', '.')) || 1;
        const next = Math.max(step === 50 ? 50 : 1, current + delta * step);
        return {
          ...item,
          quantity_estimate: String(Number(next.toFixed(2))),
        };
      })
    );
  };

  const addToList = async () => {
    if (identifiedItems.length === 0) {
      Alert.alert('Empty List', 'There are no items to add yet.');
      return;
    }

    try {
      const today = formatDate(new Date());
      const normalized = identifiedItems
        .filter((item) => item.name.trim().length > 0)
        .map(
          (item, idx) =>
            new Product(
              `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
              item.name.trim(),
              item.item_category || 'Produce',
              '',
              today,
              String(item.quantity_estimate || '1'),
              item.quantity_estimate_type || 'pcs',
              0,
              imageUri || '',
              '',
              false,
              true
            )
        );

      await addProducts(normalized);

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setIdentifiedItems([]);
      setImageUri(null);
      setBase64Image(null);

      Alert.alert(
        'Added to Inventory',
        `${normalized.length} item${normalized.length === 1 ? '' : 's'} saved to your "In Progress" list so you can set expiration dates.`,
        [
          { text: 'Stay Here', style: 'cancel' },
          { text: 'View List', onPress: () => router.push('/(tabs)/list') },
        ]
      );
    } catch (error) {
      console.error('Failed to save items:', error);
      Alert.alert('Error', 'Failed to save items. Please try again.');
    }
  };

  const resetImage = () => {
    triggerHaptic();
    setImageUri(null);
    setBase64Image(null);
    setIdentifiedItems([]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.header}>Scan Food</Text>
          <Text style={styles.subHeader}>
            Snap a photo of groceries or fridge items to log them fast
          </Text>
        </View>

        {/* Camera / Image Preview Card */}
        <View style={styles.previewCard}>
          {imageUri ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />

              {!isScanning && (
                <TouchableOpacity
                  style={styles.clearImageBtn}
                  onPress={resetImage}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}

              {isScanning && (
                <View style={styles.scanningOverlay}>
                  <View style={styles.scanningBadge}>
                    <ActivityIndicator size="small" color="#4CAF50" />
                    <Text style={styles.scanningBadgeText}>Analyzing items...</Text>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyFrame}>
              <View style={styles.iconCircle}>
                <Ionicons name="scan-outline" size={32} color="#4CAF50" />
              </View>
              <Text style={styles.emptyTitle}>No Photo Selected</Text>
              <Text style={styles.emptySubtitle}>
                Take a clear photo of your food items or choose one from your library
              </Text>

              <View style={styles.sourceButtonsRow}>
                <TouchableOpacity
                  style={styles.sourceButtonPrimary}
                  onPress={takePhoto}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.sourceButtonPrimaryText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sourceButtonSecondary}
                  onPress={pickImage}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images-outline" size={20} color="#CCCCCC" />
                  <Text style={styles.sourceButtonSecondaryText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Action Bar when Image is Selected */}
        {imageUri && identifiedItems.length === 0 && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.primaryScanBtn, isScanning && { opacity: 0.6 }]}
              onPress={scanImage}
              disabled={isScanning}
              activeOpacity={0.85}
            >
              {isScanning ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.primaryScanBtnText}>
                {isScanning ? 'Scanning Photo...' : 'Scan Items in Photo'}
              </Text>
            </TouchableOpacity>

            {!isScanning && (
              <View style={styles.retakeRow}>
                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  onPress={takePhoto}
                  activeOpacity={0.75}
                >
                  <Ionicons name="camera-outline" size={17} color="#BBBBBB" />
                  <Text style={styles.secondaryActionText}>Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryActionBtn}
                  onPress={pickImage}
                  activeOpacity={0.75}
                >
                  <Ionicons name="images-outline" size={17} color="#BBBBBB" />
                  <Text style={styles.secondaryActionText}>Choose Another</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Detected Items Section */}
        {identifiedItems.length > 0 && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeaderRow}>
              <View>
                <Text style={styles.resultsLabel}>DETECTED ITEMS</Text>
                <Text style={styles.resultsSubLabel}>
                  Review or adjust quantities before saving
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{identifiedItems.length}</Text>
              </View>
            </View>

            {identifiedItems.map((item, index) => {
              const confidencePct = Math.round((item.confidence_score || 0.85) * 100);
              return (
                <View key={`${index}-${item.item_category}`} style={styles.detectedCard}>
                  <View style={styles.detectedTopRow}>
                    <View style={styles.detectedIconBox}>
                      <Ionicons name="cube-outline" size={18} color="#4CAF50" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <TextInput
                        value={item.name}
                        onChangeText={(text) => updateItemName(index, text)}
                        style={styles.detectedNameInput}
                        placeholder="Item name"
                        placeholderTextColor="#666666"
                      />
                      <View style={styles.detectedMetaRow}>
                        <Text style={styles.detectedCategoryText}>
                          {item.item_category || 'Produce'}
                        </Text>
                        <Text style={styles.detectedDot}>·</Text>
                        <Text style={styles.detectedConfidenceText}>
                          {confidencePct}% match
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => removeItem(index)}
                      style={styles.removeItemBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={17} color="#EF5350" />
                    </TouchableOpacity>
                  </View>

                  {/* Inline Quantity Stepper */}
                  <View style={styles.detectedQuantityBar}>
                    <Text style={styles.quantityBarLabel}>Quantity</Text>

                    <View style={styles.stepperControl}>
                      <TouchableOpacity
                        style={styles.stepperSmallBtn}
                        onPress={() => adjustItemQuantity(index, -1)}
                      >
                        <Ionicons name="remove" size={16} color="#FFFFFF" />
                      </TouchableOpacity>

                      <Text style={styles.stepperValueText}>
                        {item.quantity_estimate} {item.quantity_estimate_type || 'pcs'}
                      </Text>

                      <TouchableOpacity
                        style={styles.stepperSmallBtn}
                        onPress={() => adjustItemQuantity(index, 1)}
                      >
                        <Ionicons name="add" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Save & Rescan Buttons */}
            <TouchableOpacity
              style={styles.saveAllBtn}
              onPress={addToList}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveAllBtnText}>
                Add {identifiedItems.length} Item{identifiedItems.length === 1 ? '' : 's'} to List
              </Text>
            </TouchableOpacity>

            <View style={styles.retakeRow}>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={scanImage}
                activeOpacity={0.75}
              >
                <Ionicons name="refresh-outline" size={17} color="#BBBBBB" />
                <Text style={styles.secondaryActionText}>Rescan Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={resetImage}
                activeOpacity={0.75}
              >
                <Ionicons name="camera-outline" size={17} color="#BBBBBB" />
                <Text style={styles.secondaryActionText}>New Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    backgroundColor: '#000000',
  },
  headerBlock: {
    marginTop: 6,
    marginBottom: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subHeader: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },
  previewCard: {
    backgroundColor: '#111111',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageWrapper: {
    width: '100%',
    height: 270,
    position: 'relative',
    backgroundColor: '#0A0A0A',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  clearImageBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#242424',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  scanningBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyFrame: {
    paddingVertical: 38,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  sourceButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  sourceButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
  },
  sourceButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sourceButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#242424',
    paddingVertical: 14,
    borderRadius: 12,
  },
  sourceButtonSecondaryText: {
    color: '#CCCCCC',
    fontSize: 15,
    fontWeight: '700',
  },
  actionSection: {
    gap: 10,
  },
  primaryScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 14,
  },
  primaryScanBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  retakeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    paddingVertical: 13,
    borderRadius: 12,
  },
  secondaryActionText: {
    color: '#BBBBBB',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsSection: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  resultsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.7,
  },
  resultsSubLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countBadgeText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '800',
  },
  detectedCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222222',
  },
  detectedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detectedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectedNameInput: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 2,
  },
  detectedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  detectedCategoryText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  detectedDot: {
    color: '#555555',
    fontSize: 12,
  },
  detectedConfidenceText: {
    color: '#777777',
    fontSize: 12,
  },
  removeItemBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectedQuantityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  quantityBarLabel: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperSmallBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#2C2C2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 54,
    textAlign: 'center',
  },
  saveAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  saveAllBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
