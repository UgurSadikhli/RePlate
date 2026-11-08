import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatePickerModal } from '@/components/date-picker-modal';
import { useAppContext } from '@/context/AppContext';
import Product from '@/models/Product';
import { getCurrencySymbol } from '@/utils/currency';
import { formatDate } from '@/utils/date';

const CATEGORIES = [
  { label: 'Produce', icon: 'leaf-outline', defaultDays: 5 },
  { label: 'Dairy', icon: 'water-outline', defaultDays: 7 },
  { label: 'Meat & Fish', icon: 'restaurant-outline', defaultDays: 3 },
  { label: 'Bakery', icon: 'cafe-outline', defaultDays: 4 },
  { label: 'Pantry', icon: 'cube-outline', defaultDays: 30 },
  { label: 'Frozen', icon: 'snow-outline', defaultDays: 60 },
  { label: 'Drinks', icon: 'wine-outline', defaultDays: 14 },
  { label: 'Snacks', icon: 'fast-food-outline', defaultDays: 21 },
] as const;

const QUANTITY_UNITS = ['pcs', 'g', 'kg', 'ml', 'L', 'pack', 'box'];

const EXPIRY_PRESETS = [
  { label: '+3 Days', days: 3 },
  { label: '+1 Week', days: 7 },
  { label: '+2 Weeks', days: 14 },
  { label: '+1 Month', days: 30 },
];

const addDays = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

export default function AddFoodScreen() {
  const { settings, addProducts } = useAppContext();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Produce');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const [expirationDate, setExpirationDate] = useState(() => addDays(new Date(), 5));
  const [boughtDate, setBoughtDate] = useState(() => new Date());
  const [selectedPresetDays, setSelectedPresetDays] = useState<number | null>(5);

  const [quantity, setQuantity] = useState('1');
  const [quantityType, setQuantityType] = useState('pcs');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [notes, setNotes] = useState('');
  const [toBuy, setToBuy] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [activePicker, setActivePicker] = useState<'bought' | 'expiration' | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: toBuy ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [toBuy, fadeAnim]);

  const triggerHaptic = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
  };

  const handleSelectCategory = (catLabel: string, defaultDays: number) => {
    triggerHaptic();
    setIsCustomCategory(false);
    setCategory(catLabel);
    const updatedExp = addDays(boughtDate, defaultDays);
    setExpirationDate(updatedExp);
    setSelectedPresetDays(defaultDays);
  };

  const handleApplyExpiryPreset = (days: number) => {
    triggerHaptic();
    setSelectedPresetDays(days);
    setExpirationDate(addDays(boughtDate, days));
  };

  const adjustQuantity = (delta: number) => {
    triggerHaptic();
    const current = parseFloat(quantity.replace(',', '.')) || 0;
    const step = quantityType === 'g' || quantityType === 'ml' ? 50 : 1;
    const next = Math.max(step === 50 ? 50 : 1, current + delta * step);
    setQuantity(String(Number(next.toFixed(2))));
  };

  const resetFields = () => {
    setName('');
    setCategory('Produce');
    setCustomCategory('');
    setIsCustomCategory(false);
    setBoughtDate(new Date());
    setExpirationDate(addDays(new Date(), 5));
    setSelectedPresetDays(5);
    setQuantity('1');
    setQuantityType('pcs');
    setPrice('');
    setImage('');
    setNotes('');
  };

  const handleAddProduct = async () => {
    const finalCategory = isCustomCategory ? customCategory.trim() : category.trim();

    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter the product name.');
      return;
    }
    if (!quantity.trim() || !quantityType.trim()) {
      Alert.alert('Missing Quantity', 'Please specify a quantity and unit.');
      return;
    }
    if (!toBuy && !price.trim()) {
      Alert.alert('Missing Price', 'Please enter the product price (or switch to Shopping List).');
      return;
    }

    const parsedPrice = toBuy ? 0 : parseFloat(price.trim().replace(',', '.')) || 0;

    const newProduct = new Product(
      Date.now(),
      name.trim(),
      finalCategory || 'Other',
      toBuy ? '' : formatDate(expirationDate),
      toBuy ? '' : formatDate(boughtDate),
      quantity.trim(),
      quantityType.trim(),
      parsedPrice,
      toBuy ? '' : image,
      notes.trim(),
      toBuy,
      false
    );

    await addProducts([newProduct]);
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    resetFields();
    Alert.alert(
      toBuy ? 'Added to Shopping List' : 'Added to Inventory',
      `${newProduct.name} has been saved.`
    );
  };

  const pickImageFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhotoWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Camera permission is required to take a product photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const currencySymbol = getCurrencySymbol(settings.currency);
  const accentColor = toBuy ? '#00BCD4' : '#4CAF50';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAwareScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        extraHeight={120}
        enableOnAndroid={true}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.headerBlock}>
          <Text style={styles.header}>Add Food</Text>
          <Text style={styles.subHeader}>
            Quickly log groceries to your kitchen or shopping list
          </Text>
        </View>

        {/* Mode Segmented Toggle */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, !toBuy && styles.segmentBtnInventoryActive]}
            onPress={() => {
              triggerHaptic();
              setToBuy(false);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="cube"
              size={17}
              color={!toBuy ? '#FFFFFF' : '#777777'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentText, !toBuy && styles.segmentTextActive]}>
              In My Kitchen
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, toBuy && styles.segmentBtnToBuyActive]}
            onPress={() => {
              triggerHaptic();
              setToBuy(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="cart"
              size={17}
              color={toBuy ? '#000000' : '#777777'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                toBuy && styles.segmentTextActive,
                toBuy && { color: '#000000' },
              ]}
            >
              Shopping List
            </Text>
          </TouchableOpacity>
        </View>

        {/* Product Name Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>PRODUCT NAME *</Text>
          <View
            style={[
              styles.inputWrapper,
              focusedField === 'name' && { borderColor: accentColor, backgroundColor: '#0E150E' },
            ]}
          >
            <Ionicons name="nutrition-outline" size={20} color={accentColor} />
            <TextInput
              placeholder="e.g., Greek Yogurt, Avocados, Milk..."
              placeholderTextColor="#555"
              value={name}
              onChangeText={setName}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              style={styles.textInput}
            />
            {name.length > 0 && (
              <TouchableOpacity onPress={() => setName('')}>
                <Ionicons name="close-circle" size={18} color="#555" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Category Chips */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>CATEGORY</Text>
            {!toBuy && !isCustomCategory && (
              <Text style={styles.sectionHint}>Auto-sets shelf life</Text>
            )}
          </View>

          <View style={styles.chipsGrid}>
            {CATEGORIES.map((item) => {
              const isSelected = !isCustomCategory && category === item.label;
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.categoryChip,
                    isSelected && {
                      backgroundColor: accentColor + '1F',
                      borderColor: accentColor,
                    },
                  ]}
                  onPress={() => handleSelectCategory(item.label, item.defaultDays)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={item.icon}
                    size={15}
                    color={isSelected ? accentColor : '#888'}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && { color: '#FFFFFF', fontWeight: '700' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[
                styles.categoryChip,
                isCustomCategory && {
                  backgroundColor: accentColor + '1F',
                  borderColor: accentColor,
                },
              ]}
              onPress={() => {
                triggerHaptic();
                setIsCustomCategory(true);
              }}
              activeOpacity={0.75}
            >
              <Ionicons
                name="add-circle-outline"
                size={15}
                color={isCustomCategory ? accentColor : '#888'}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  isCustomCategory && { color: '#FFFFFF', fontWeight: '700' },
                ]}
              >
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {isCustomCategory && (
            <View
              style={[
                styles.inputWrapper,
                { marginTop: 12 },
                focusedField === 'customCategory' && { borderColor: accentColor },
              ]}
            >
              <Ionicons name="pricetag-outline" size={18} color={accentColor} />
              <TextInput
                placeholder="Type custom category..."
                placeholderTextColor="#555"
                value={customCategory}
                onChangeText={setCustomCategory}
                onFocus={() => setFocusedField('customCategory')}
                onBlur={() => setFocusedField(null)}
                style={styles.textInput}
              />
            </View>
          )}
        </View>

        {/* Quantity & Unit Selector Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>QUANTITY & UNIT *</Text>

          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => adjustQuantity(-1)}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View
              style={[
                styles.quantityInputBox,
                focusedField === 'quantity' && { borderColor: accentColor },
              ]}
            >
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
                onFocus={() => setFocusedField('quantity')}
                onBlur={() => setFocusedField(null)}
                style={styles.quantityInputText}
                placeholder="1"
                placeholderTextColor="#555"
              />
              <Text style={styles.quantityUnitBadge}>{quantityType}</Text>
            </View>

            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: accentColor }]}
              onPress={() => adjustQuantity(1)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="add"
                size={20}
                color={toBuy ? '#000000' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.unitPillsRow}
          >
            {QUANTITY_UNITS.map((unit) => {
              const active = quantityType === unit;
              return (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.unitPill,
                    active && {
                      backgroundColor: accentColor,
                      borderColor: accentColor,
                    },
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    setQuantityType(unit);
                  }}
                >
                  <Text
                    style={[
                      styles.unitPillText,
                      active && {
                        color: toBuy ? '#000000' : '#FFFFFF',
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {unit}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Inventory-Only Details (Price, Dates, Photo, Notes) */}
        {!toBuy && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Price Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>PRICE *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'price' && {
                    borderColor: accentColor,
                    backgroundColor: '#0E150E',
                  },
                ]}
              >
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyBadgeText}>{currencySymbol}</Text>
                </View>
                <TextInput
                  placeholder="0.00"
                  placeholderTextColor="#555"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  onFocus={() => setFocusedField('price')}
                  onBlur={() => setFocusedField(null)}
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Dates & Quick Expiry Presets Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>DATES & SHELF LIFE</Text>

              <View style={styles.datesRow}>
                <TouchableOpacity
                  style={styles.dateCardBtn}
                  onPress={() => setActivePicker('bought')}
                  activeOpacity={0.75}
                >
                  <View style={styles.dateCardTop}>
                    <Ionicons name="bag-check-outline" size={16} color="#888" />
                    <Text style={styles.dateCardLabel}>Bought</Text>
                  </View>
                  <Text style={styles.dateCardValue}>{formatDate(boughtDate)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateCardBtn, styles.dateCardExpiration]}
                  onPress={() => setActivePicker('expiration')}
                  activeOpacity={0.75}
                >
                  <View style={styles.dateCardTop}>
                    <Ionicons name="calendar-outline" size={16} color="#4CAF50" />
                    <Text style={[styles.dateCardLabel, { color: '#4CAF50' }]}>Expires</Text>
                  </View>
                  <Text style={styles.dateCardValue}>{formatDate(expirationDate)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.presetRow}>
                {EXPIRY_PRESETS.map((preset) => {
                  const isPresetActive = selectedPresetDays === preset.days;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[
                        styles.presetPill,
                        isPresetActive && styles.presetPillActive,
                      ]}
                      onPress={() => handleApplyExpiryPreset(preset.days)}
                    >
                      <Text
                        style={[
                          styles.presetPillText,
                          isPresetActive && styles.presetPillTextActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Photo & Notes Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>PHOTO & NOTES (OPTIONAL)</Text>

              {image ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: image }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setImage('')}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoButtonsRow}>
                  <TouchableOpacity
                    style={styles.photoActionBtn}
                    onPress={takePhotoWithCamera}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="camera-outline" size={20} color="#4CAF50" />
                    <Text style={styles.photoActionText}>Take Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoActionBtn}
                    onPress={pickImageFromLibrary}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="images-outline" size={20} color="#64B5F6" />
                    <Text style={[styles.photoActionText, { color: '#64B5F6' }]}>
                      From Gallery
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View
                style={[
                  styles.inputWrapper,
                  { height: 76, alignItems: 'flex-start', paddingVertical: 10, marginTop: 12 },
                  focusedField === 'notes' && { borderColor: accentColor },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color="#777"
                  style={{ marginTop: 2 }}
                />
                <TextInput
                  placeholder="Storage tips, brand, or extra notes..."
                  placeholderTextColor="#555"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  onFocus={() => setFocusedField('notes')}
                  onBlur={() => setFocusedField(null)}
                  style={[styles.textInput, { height: '100%', textAlignVertical: 'top' }]}
                />
              </View>
            </View>
          </Animated.View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: accentColor }]}
          onPress={handleAddProduct}
          activeOpacity={0.85}
        >
          <Ionicons
            name={toBuy ? 'cart-outline' : 'checkmark-circle-outline'}
            size={22}
            color={toBuy ? '#000000' : '#FFFFFF'}
          />
          <Text
            style={[
              styles.submitButtonText,
              toBuy && { color: '#000000' },
            ]}
          >
            {toBuy ? 'Add to Shopping List' : 'Save to Inventory'}
          </Text>
        </TouchableOpacity>

        {/* Cross-Platform Date Picker Modal */}
        <DatePickerModal
          visible={activePicker !== null}
          title={
            activePicker === 'expiration' ? 'Select Expiration Date' : 'Select Bought Date'
          }
          value={activePicker === 'expiration' ? expirationDate : boughtDate}
          onClose={() => setActivePicker(null)}
          onSelectDate={(selectedDate) => {
            if (activePicker === 'expiration') {
              setSelectedPresetDays(null);
              setExpirationDate(selectedDate);
            } else if (activePicker === 'bought') {
              setBoughtDate(selectedDate);
            }
          }}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  screen: { flex: 1, backgroundColor: '#000000' },
  container: { paddingHorizontal: 16, paddingBottom: 44, backgroundColor: '#000000' },
  headerBlock: { marginTop: 6, marginBottom: 16 },
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

  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
  },
  segmentBtnInventoryActive: {
    backgroundColor: '#4CAF50',
  },
  segmentBtnToBuyActive: {
    backgroundColor: '#00BCD4',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#777777',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },

  sectionCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  sectionHint: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 10,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 10,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#242424',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#AAAAAA',
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
  },
  quantityInputText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  quantityUnitBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888888',
    marginLeft: 6,
  },
  unitPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 2,
  },
  unitPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#242424',
  },
  unitPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999999',
  },

  currencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  currencyBadgeText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '800',
  },

  datesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  dateCardBtn: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 12,
    padding: 12,
  },
  dateCardExpiration: {
    borderColor: 'rgba(76, 175, 80, 0.45)',
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  dateCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dateCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
  },
  dateCardValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#242424',
    alignItems: 'center',
  },
  presetPillActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.16)',
    borderColor: '#4CAF50',
  },
  presetPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
  },
  presetPillTextActive: {
    color: '#4CAF50',
    fontWeight: '700',
  },

  photoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 12,
    paddingVertical: 13,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 170,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 17,
  },
});
