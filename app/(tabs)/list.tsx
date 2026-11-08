import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
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
import FillInMissingDetailsGap from '@/components/fill-in-missing-details-gap';
import { useAppContext } from '@/context/AppContext';
import { ProductItem } from '@/models/Product';
import { getCurrencySymbol } from '@/utils/currency';
import {
  EXPIRES_SOON_DAYS,
  formatDate,
  getExpirationColor,
  getExpirationDays,
  getExpirationText,
  parseFormattedDate,
} from '@/utils/date';

type FilterType = 'all' | 'toBuy' | 'expiresSoon' | 'inProgress';

const CATEGORIES = [
  { label: 'Produce', icon: 'leaf-outline' },
  { label: 'Dairy', icon: 'water-outline' },
  { label: 'Meat & Fish', icon: 'restaurant-outline' },
  { label: 'Bakery', icon: 'cafe-outline' },
  { label: 'Pantry', icon: 'cube-outline' },
  { label: 'Frozen', icon: 'snow-outline' },
  { label: 'Drinks', icon: 'wine-outline' },
  { label: 'Snacks', icon: 'fast-food-outline' },
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

export default function ProductsListScreen() {
  const { products, settings, refreshData, updateProducts, deleteProductById } = useAppContext();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isDoneAction, setIsDoneAction] = useState(false);

  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editExpirationDate, setEditExpirationDate] = useState('');
  const [editBoughtDate, setEditBoughtDate] = useState('');
  const [editQuantityType, setEditQuantityType] = useState('');
  const [editImage, setEditImage] = useState('');

  const [activeDatePicker, setActiveDatePicker] = useState<'bought' | 'expiration' | null>(null);

  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [gapVisible, setGapVisible] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        setPermissionStatus(libraryStatus === 'granted' ? 'granted' : 'denied');
      } else {
        setPermissionStatus('granted');
      }
    })();
  }, []);

  const triggerHaptic = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
  };

  const pickImageFromLibrary = async () => {
    if (permissionStatus !== 'granted') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant media library access in your settings.');
        return;
      }
      setPermissionStatus('granted');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
    });

    if (!result.canceled) {
      setEditImage(result.assets[0].uri);
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
      quality: 0.6,
    });

    if (!result.canceled) {
      setEditImage(result.assets[0].uri);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const populateEditFields = (product: ProductItem) => {
    setEditName(product.name ?? '');
    setEditQuantity(String(product.quantity ?? '1'));
    const cat = product.category ?? '';
    setEditCategory(cat);
    const isPresetCat = CATEGORIES.some((c) => c.label.toLowerCase() === cat.toLowerCase());
    setIsCustomCategory(Boolean(cat && !isPresetCat));
    setEditNotes(product.notes ?? '');
    setEditPrice(
      product.price !== undefined && product.price !== '' && Number(product.price) !== 0
        ? String(product.price)
        : ''
    );
    setEditExpirationDate(product.expirationDate || '');
    setEditBoughtDate(product.boughtDate || formatDate(new Date()));
    setEditQuantityType(product.quantityType || 'pcs');
    setEditImage(product.image || '');
  };

  const openModal = (product: ProductItem, isEditing = false, isDone = false) => {
    setSelectedProduct(product);
    setEditing(isEditing || isDone);
    setIsDoneAction(isDone);
    populateEditFields(product);
    setModalVisible(true);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setEditing(false);
    setIsDoneAction(false);
    setActiveDatePicker(null);
    setModalVisible(false);
  };

  const handleDeleteProduct = (id: string | number, name: string) => {
    Alert.alert('Delete Product', `Are you sure you want to remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteProductById(id);
          closeModal();
        },
      },
    ]);
  };

  const adjustEditQuantity = (delta: number) => {
    triggerHaptic();
    const current = parseFloat(editQuantity.replace(',', '.')) || 0;
    const step = editQuantityType === 'g' || editQuantityType === 'ml' ? 50 : 1;
    const next = Math.max(step === 50 ? 50 : 1, current + delta * step);
    setEditQuantity(String(Number(next.toFixed(2))));
  };

  const adjustSelectedProductQuantityQuick = async (delta: number) => {
    if (!selectedProduct) return;
    triggerHaptic();
    const current = parseFloat(String(selectedProduct.quantity).replace(',', '.')) || 0;
    const step =
      selectedProduct.quantityType === 'g' || selectedProduct.quantityType === 'ml' ? 50 : 1;
    const next = Math.max(0, Number((current + delta * step).toFixed(2)));
    const nextStr = String(next);

    const updated = { ...selectedProduct, quantity: nextStr };
    setSelectedProduct(updated);
    setEditQuantity(nextStr);

    const updatedProducts = products.map((p) => (p.id === selectedProduct.id ? updated : p));
    await updateProducts(updatedProducts);
  };

  const saveEdit = async () => {
    if (!selectedProduct) return;

    const updatedName = editName.trim() || selectedProduct.name;
    const newInProgress = isDoneAction ? false : selectedProduct.inProgress;
    const cleanPrice = parseFloat(String(editPrice).replace(',', '.')) || 0;

    const updatedItem: ProductItem = {
      ...selectedProduct,
      name: updatedName,
      quantity: editQuantity.trim() || '1',
      category: editCategory.trim() || 'Other',
      notes: editNotes.trim(),
      price: cleanPrice,
      expirationDate: editExpirationDate,
      boughtDate: editBoughtDate || formatDate(new Date()),
      quantityType: editQuantityType.trim() || 'pcs',
      image: editImage,
      inProgress: newInProgress,
    };

    const updatedProducts = products.map((p) =>
      p.id === selectedProduct.id ? updatedItem : p
    );

    await updateProducts(updatedProducts);
    setSelectedProduct(updatedItem);
    setEditing(false);
    setIsDoneAction(false);
    if (isDoneAction) {
      closeModal();
    }
  };

  const markAsDone = async (product: ProductItem) => {
    const missingFields: string[] = [];
    if (!product.price || product.price === '' || product.price === 0 || product.price === '0') {
      missingFields.push('Price');
    }
    if (!product.expirationDate) missingFields.push('Expiration Date');
    if (!product.quantity) missingFields.push('Quantity');
    if (!product.quantityType) missingFields.push('Quantity Type');
    if (!product.category) missingFields.push('Category');

    if (missingFields.length > 0) {
      setModalVisible(false);
      setSelectedProduct(product);
      setMissingFieldsList(missingFields);
      setGapVisible(true);
    } else {
      const updatedProducts = products.map((p) =>
        p.id === product.id
          ? {
              ...p,
              boughtDate: p.boughtDate || formatDate(new Date()),
              inProgress: false,
            }
          : p
      );
      await updateProducts(updatedProducts);
      closeModal();
    }
  };

  const handleGapSubmit = async (newValues: Record<string, string>) => {
    if (!selectedProduct) return;

    const updatedProducts = products.map((p) => {
      if (p.id === selectedProduct.id) {
        const rawPrice = newValues['Price']
          ? newValues['Price'].replace(',', '.')
          : String(p.price || 0);
        return {
          ...p,
          price: parseFloat(rawPrice) || 0,
          expirationDate: newValues['Expiration Date'] || p.expirationDate,
          quantity: newValues['Quantity'] || p.quantity,
          quantityType: newValues['Quantity Type'] || p.quantityType,
          category: newValues['Category'] || p.category,
          boughtDate: p.boughtDate || formatDate(new Date()),
          inProgress: false,
        };
      }
      return p;
    });

    await updateProducts(updatedProducts);
    setGapVisible(false);
    setSelectedProduct(null);
  };

  const filteredProducts = products.filter((p) => {
    if (filter === 'toBuy') return p.toBuy;
    if (filter === 'expiresSoon') {
      const days = getExpirationDays(p.expirationDate);
      return days !== null && days <= EXPIRES_SOON_DAYS && !p.toBuy;
    }
    if (filter === 'inProgress') return p.inProgress;
    return true;
  });

  const currencySymbol = getCurrencySymbol(settings.currency);

  const renderHeader = () => (
    <View>
      <View style={styles.headerBlock}>
        <Text style={styles.header}>Inventory</Text>
        <Text style={styles.subHeader}>Tap any item to view or adjust details</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {(
          [
            { key: 'all', label: 'All', icon: 'apps-outline' },
            { key: 'toBuy', label: 'To Buy', icon: 'cart-outline' },
            { key: 'expiresSoon', label: 'Expires Soon', icon: 'time-outline' },
            { key: 'inProgress', label: 'In Progress', icon: 'hourglass-outline' },
          ] as const
        ).map((tab) => {
          const active = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterButton, active && styles.filterButtonActive]}
              onPress={() => {
                triggerHaptic();
                setFilter(tab.key);
              }}
            >
              <Ionicons
                name={tab.icon}
                size={15}
                color={active ? '#FFFFFF' : '#888888'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderProductItem = ({ item: p }: { item: ProductItem }) => {
    const expDays = getExpirationDays(p.expirationDate);
    return (
      <View style={{ marginBottom: 12 }}>
        <TouchableOpacity
          style={[styles.card, p.toBuy && styles.cardToBuy, p.inProgress && styles.cardInProgress]}
          onPress={() => openModal(p)}
          activeOpacity={0.8}
        >
          {p.image ? (
            <Image source={{ uri: p.image }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.noImagePlaceholder]}>
              <Ionicons name="nutrition-outline" size={26} color="#555" />
            </View>
          )}
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {p.name}
              </Text>
            </View>
            {!!p.category && <Text style={styles.cardCategory}>{p.category}</Text>}
            <Text style={styles.cardSubtitle}>
              {p.quantity} {p.quantityType}
              {!p.toBuy && Number(p.price) > 0 ? ` • ${currencySymbol}${p.price}` : ''}
            </Text>
            {expDays !== null && !p.toBuy && (
              <View style={styles.cardExpBadge}>
                <View
                  style={[
                    styles.cardExpDot,
                    { backgroundColor: getExpirationColor(expDays) },
                  ]}
                />
                <Text
                  style={[
                    styles.cardExpText,
                    { color: getExpirationColor(expDays) },
                  ]}
                >
                  {getExpirationText(expDays)}
                </Text>
              </View>
            )}
          </View>

          {p.toBuy && (
            <TouchableOpacity
              style={styles.markBoughtBtn}
              onPress={async () => {
                triggerHaptic();
                const updatedProducts = products.map((item) =>
                  item.id === p.id
                    ? { ...item, toBuy: false, inProgress: true, boughtDate: formatDate(new Date()) }
                    : item
                );
                await updateProducts(updatedProducts);
              }}
            >
              <Ionicons name="checkmark" size={22} color="#000" />
            </TouchableOpacity>
          )}

          {p.inProgress && (
            <TouchableOpacity style={styles.markDoneBtn} onPress={() => markAsDone(p)}>
              <Ionicons name="sparkles" size={18} color="#000" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const getProductStatusMeta = (p: ProductItem) => {
    if (p.toBuy) {
      return { label: 'Shopping List', color: '#00BCD4', icon: 'cart-outline' as const };
    }
    if (p.inProgress) {
      return { label: 'In Progress', color: '#FFD700', icon: 'hourglass-outline' as const };
    }
    return { label: 'In Kitchen', color: '#4CAF50', icon: 'checkmark-circle-outline' as const };
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FillInMissingDetailsGap
        visible={gapVisible}
        missingDetails={missingFieldsList}
        onClose={() => setGapVisible(false)}
        onSubmit={handleGapSubmit}
      />

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderProductItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={44} color="#333" />
            <Text style={styles.emptyText}>No products found in this view.</Text>
          </View>
        }
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />
        }
        showsVerticalScrollIndicator={false}
      />

      {selectedProduct && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeModal}
            />

            <View style={styles.modalSheet}>
              {/* Drag Handle */}
              <View style={styles.sheetHandleWrap}>
                <View style={styles.sheetHandle} />
              </View>

              {/* Sheet Top Bar */}
              {(() => {
                const statusMeta = getProductStatusMeta(selectedProduct);
                return (
                  <View style={styles.sheetHeader}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor: statusMeta.color + '1F',
                              borderColor: statusMeta.color + '55',
                            },
                          ]}
                        >
                          <Ionicons name={statusMeta.icon} size={13} color={statusMeta.color} />
                          <Text style={[styles.statusPillText, { color: statusMeta.color }]}>
                            {statusMeta.label}
                          </Text>
                        </View>

                        {!!selectedProduct.category && (
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{selectedProduct.category}</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.modalTitle} numberOfLines={2}>
                        {editing
                          ? isDoneAction
                            ? 'Complete Item Details'
                            : 'Edit Product'
                          : selectedProduct.name}
                      </Text>
                    </View>

                    <TouchableOpacity style={styles.closeIconBtn} onPress={closeModal}>
                      <Ionicons name="close" size={20} color="#AAAAAA" />
                    </TouchableOpacity>
                  </View>
                );
              })()}

              <KeyboardAwareScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetScrollContent}
                extraHeight={100}
                enableOnAndroid={true}
              >
                {editing || isDoneAction ? (
                  /* ================= EDIT MODE ================= */
                  <View>
                    {/* Name */}
                    <View style={styles.editSection}>
                      <Text style={styles.editSectionLabel}>PRODUCT NAME</Text>
                      <View style={styles.editInputWrapper}>
                        <Ionicons name="nutrition-outline" size={18} color="#4CAF50" />
                        <TextInput
                          value={editName}
                          onChangeText={setEditName}
                          placeholder="Product name"
                          placeholderTextColor="#555"
                          style={styles.editTextInput}
                        />
                      </View>
                    </View>

                    {/* Category Chips */}
                    <View style={styles.editSection}>
                      <Text style={styles.editSectionLabel}>CATEGORY</Text>
                      <View style={styles.chipsGrid}>
                        {CATEGORIES.map((item) => {
                          const active =
                            !isCustomCategory &&
                            editCategory.toLowerCase() === item.label.toLowerCase();
                          return (
                            <TouchableOpacity
                              key={item.label}
                              style={[styles.categoryChip, active && styles.categoryChipActive]}
                              onPress={() => {
                                triggerHaptic();
                                setIsCustomCategory(false);
                                setEditCategory(item.label);
                              }}
                            >
                              <Ionicons
                                name={item.icon}
                                size={14}
                                color={active ? '#4CAF50' : '#888'}
                              />
                              <Text
                                style={[
                                  styles.categoryChipText,
                                  active && styles.categoryChipTextActive,
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
                            isCustomCategory && styles.categoryChipActive,
                          ]}
                          onPress={() => {
                            triggerHaptic();
                            setIsCustomCategory(true);
                          }}
                        >
                          <Ionicons
                            name="add-circle-outline"
                            size={14}
                            color={isCustomCategory ? '#4CAF50' : '#888'}
                          />
                          <Text
                            style={[
                              styles.categoryChipText,
                              isCustomCategory && styles.categoryChipTextActive,
                            ]}
                          >
                            Custom
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {isCustomCategory && (
                        <View style={[styles.editInputWrapper, { marginTop: 10 }]}>
                          <Ionicons name="pricetag-outline" size={18} color="#4CAF50" />
                          <TextInput
                            value={editCategory}
                            onChangeText={setEditCategory}
                            placeholder="Enter custom category..."
                            placeholderTextColor="#555"
                            style={styles.editTextInput}
                          />
                        </View>
                      )}
                    </View>

                    {/* Quantity Stepper & Units */}
                    <View style={styles.editSection}>
                      <Text style={styles.editSectionLabel}>QUANTITY & UNIT</Text>
                      <View style={styles.quantityRow}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => adjustEditQuantity(-1)}
                        >
                          <Ionicons name="remove" size={20} color="#FFF" />
                        </TouchableOpacity>

                        <View style={styles.quantityInputBox}>
                          <TextInput
                            value={editQuantity}
                            onChangeText={setEditQuantity}
                            keyboardType="decimal-pad"
                            style={styles.quantityInputText}
                          />
                          <Text style={styles.quantityUnitLabel}>{editQuantityType}</Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.stepperBtn, { backgroundColor: '#4CAF50' }]}
                          onPress={() => adjustEditQuantity(1)}
                        >
                          <Ionicons name="add" size={20} color="#FFF" />
                        </TouchableOpacity>
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.unitPillsRow}
                      >
                        {QUANTITY_UNITS.map((unit) => {
                          const active = editQuantityType === unit;
                          return (
                            <TouchableOpacity
                              key={unit}
                              style={[styles.unitPill, active && styles.unitPillActive]}
                              onPress={() => {
                                triggerHaptic();
                                setEditQuantityType(unit);
                              }}
                            >
                              <Text
                                style={[
                                  styles.unitPillText,
                                  active && styles.unitPillTextActive,
                                ]}
                              >
                                {unit}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>

                    {/* Price */}
                    <View style={styles.editSection}>
                      <Text style={styles.editSectionLabel}>PRICE</Text>
                      <View style={styles.editInputWrapper}>
                        <View style={styles.currencyBadge}>
                          <Text style={styles.currencyBadgeText}>{currencySymbol}</Text>
                        </View>
                        <TextInput
                          value={editPrice}
                          onChangeText={setEditPrice}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          placeholderTextColor="#555"
                          style={styles.editTextInput}
                        />
                      </View>
                    </View>

                    {/* Dates & Presets */}
                    <View style={styles.editSection}>
                      <Text style={styles.editSectionLabel}>DATES & EXPIRATION</Text>
                      <View style={styles.datesRow}>
                        <TouchableOpacity
                          style={styles.dateCardBtn}
                          onPress={() => setActiveDatePicker('bought')}
                        >
                          <View style={styles.dateCardTop}>
                            <Ionicons name="bag-check-outline" size={15} color="#888" />
                            <Text style={styles.dateCardLabel}>Bought</Text>
                          </View>
                          <Text style={styles.dateCardValue}>
                            {editBoughtDate || 'Select Date'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.dateCardBtn, styles.dateCardExpiration]}
                          onPress={() => setActiveDatePicker('expiration')}
                        >
                          <View style={styles.dateCardTop}>
                            <Ionicons name="calendar-outline" size={15} color="#4CAF50" />
                            <Text style={[styles.dateCardLabel, { color: '#4CAF50' }]}>
                              Expires
                            </Text>
                          </View>
                          <Text style={styles.dateCardValue}>
                            {editExpirationDate || 'Select Date'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.presetRow}>
                        {EXPIRY_PRESETS.map((preset) => (
                          <TouchableOpacity
                            key={preset.label}
                            style={styles.presetPill}
                            onPress={() => {
                              triggerHaptic();
                              const base = editBoughtDate
                                ? parseFormattedDate(editBoughtDate)
                                : new Date();
                              setEditExpirationDate(formatDate(addDays(base, preset.days)));
                            }}
                          >
                            <Text style={styles.presetPillText}>{preset.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Photo & Notes */}
                    <View style={styles.editSection}>
                      <Text style={styles.editSectionLabel}>PHOTO & NOTES</Text>
                      {editImage ? (
                        <View style={styles.editImagePreviewWrap}>
                          <Image source={{ uri: editImage }} style={styles.editImagePreview} />
                          <TouchableOpacity
                            style={styles.removePhotoBtn}
                            onPress={() => setEditImage('')}
                          >
                            <Ionicons name="trash-outline" size={16} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.photoButtonsRow}>
                          <TouchableOpacity
                            style={styles.photoActionBtn}
                            onPress={takePhotoWithCamera}
                          >
                            <Ionicons name="camera-outline" size={18} color="#4CAF50" />
                            <Text style={styles.photoActionText}>Take Photo</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.photoActionBtn}
                            onPress={pickImageFromLibrary}
                          >
                            <Ionicons name="images-outline" size={18} color="#64B5F6" />
                            <Text style={[styles.photoActionText, { color: '#64B5F6' }]}>
                              Gallery
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <View
                        style={[
                          styles.editInputWrapper,
                          { height: 76, alignItems: 'flex-start', paddingVertical: 10, marginTop: 10 },
                        ]}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={18}
                          color="#777"
                          style={{ marginTop: 2 }}
                        />
                        <TextInput
                          value={editNotes}
                          onChangeText={setEditNotes}
                          placeholder="Add notes..."
                          placeholderTextColor="#555"
                          multiline
                          numberOfLines={3}
                          style={[
                            styles.editTextInput,
                            { height: '100%', textAlignVertical: 'top' },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Edit Footer Actions */}
                    <View style={styles.footerActionRow}>
                      <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => {
                          if (isDoneAction) {
                            closeModal();
                          } else {
                            setEditing(false);
                          }
                        }}
                      >
                        <Text style={styles.secondaryBtnText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.primarySaveBtn} onPress={saveEdit}>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                        <Text style={styles.primarySaveBtnText}>
                          {isDoneAction ? 'Mark as Done' : 'Save Changes'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* ================= VIEW DETAILS MODE ================= */
                  <View>
                    {/* Product Image if present */}
                    {!!selectedProduct.image && (
                      <Image
                        source={{ uri: selectedProduct.image }}
                        style={styles.detailHeroImage}
                      />
                    )}

                    {/* Expiration Status Banner */}
                    {(() => {
                      const modalExpDays = getExpirationDays(selectedProduct.expirationDate);
                      if (modalExpDays !== null && !selectedProduct.toBuy) {
                        const expColor = getExpirationColor(modalExpDays);
                        return (
                          <View
                            style={[
                              styles.expBanner,
                              {
                                backgroundColor: expColor + '15',
                                borderColor: expColor + '45',
                              },
                            ]}
                          >
                            <Ionicons name="alarm-outline" size={20} color={expColor} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.expBannerTitle, { color: expColor }]}>
                                {getExpirationText(modalExpDays)}
                              </Text>
                              <Text style={styles.expBannerSub}>
                                Expiration Date: {selectedProduct.expirationDate}
                              </Text>
                            </View>
                          </View>
                        );
                      }
                      return null;
                    })()}

                    {/* Quick Quantity Adjuster Card */}
                    <View style={styles.quickQuantityCard}>
                      <View>
                        <Text style={styles.detailCardLabel}>CURRENT QUANTITY</Text>
                        <Text style={styles.quickQuantityValue}>
                          {selectedProduct.quantity}{' '}
                          <Text style={styles.quickQuantityUnit}>
                            {selectedProduct.quantityType}
                          </Text>
                        </Text>
                      </View>
                      <View style={styles.quickStepperGroup}>
                        <TouchableOpacity
                          style={styles.quickStepperBtn}
                          onPress={() => adjustSelectedProductQuantityQuick(-1)}
                        >
                          <Ionicons name="remove" size={18} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.quickStepperBtn, { backgroundColor: '#4CAF50' }]}
                          onPress={() => adjustSelectedProductQuantityQuick(1)}
                        >
                          <Ionicons name="add" size={18} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* 2-Column Detail Grid */}
                    <View style={styles.detailGrid}>
                      <View style={styles.detailGridCard}>
                        <View style={styles.detailGridIconWrap}>
                          <Ionicons name="wallet-outline" size={18} color="#4CAF50" />
                        </View>
                        <Text style={styles.detailCardLabel}>PRICE</Text>
                        <Text style={styles.detailCardValue}>
                          {Number(selectedProduct.price) > 0
                            ? `${currencySymbol}${selectedProduct.price}`
                            : 'Not set'}
                        </Text>
                      </View>

                      <View style={styles.detailGridCard}>
                        <View style={styles.detailGridIconWrap}>
                          <Ionicons name="pricetag-outline" size={18} color="#00BCD4" />
                        </View>
                        <Text style={styles.detailCardLabel}>CATEGORY</Text>
                        <Text style={styles.detailCardValue}>
                          {selectedProduct.category || 'Uncategorized'}
                        </Text>
                      </View>

                      <View style={styles.detailGridCard}>
                        <View style={styles.detailGridIconWrap}>
                          <Ionicons name="bag-check-outline" size={18} color="#AAA" />
                        </View>
                        <Text style={styles.detailCardLabel}>BOUGHT DATE</Text>
                        <Text style={styles.detailCardValue}>
                          {selectedProduct.boughtDate || '—'}
                        </Text>
                      </View>

                      <View style={styles.detailGridCard}>
                        <View style={styles.detailGridIconWrap}>
                          <Ionicons name="calendar-outline" size={18} color="#FFD700" />
                        </View>
                        <Text style={styles.detailCardLabel}>EXPIRES ON</Text>
                        <Text style={styles.detailCardValue}>
                          {selectedProduct.expirationDate || '—'}
                        </Text>
                      </View>
                    </View>

                    {/* Notes Box */}
                    <View style={styles.notesCard}>
                      <View style={styles.notesHeader}>
                        <Ionicons name="document-text-outline" size={16} color="#888" />
                        <Text style={styles.detailCardLabel}>NOTES</Text>
                      </View>
                      <Text style={styles.notesBodyText}>
                        {selectedProduct.notes ? selectedProduct.notes : 'No additional notes.'}
                      </Text>
                    </View>

                    {/* Status-Specific Quick Action */}
                    {selectedProduct.inProgress && (
                      <TouchableOpacity
                        style={styles.completeDetailsBannerBtn}
                        onPress={() => markAsDone(selectedProduct)}
                      >
                        <Ionicons name="sparkles" size={18} color="#000" />
                        <Text style={styles.completeDetailsBannerText}>
                          Complete Missing Details
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* View Mode Bottom Action Bar */}
                    <View style={styles.footerActionRow}>
                      <TouchableOpacity
                        style={styles.deleteIconBtn}
                        onPress={() =>
                          handleDeleteProduct(selectedProduct.id, selectedProduct.name)
                        }
                      >
                        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.primaryEditBtn}
                        onPress={() => {
                          triggerHaptic();
                          populateEditFields(selectedProduct);
                          setEditing(true);
                        }}
                      >
                        <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.primarySaveBtnText}>Edit Product</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </KeyboardAwareScrollView>

              <DatePickerModal
                visible={activeDatePicker !== null}
                inlineOverlay={true}
                title={
                  activeDatePicker === 'expiration'
                    ? 'Select Expiration Date'
                    : 'Select Bought Date'
                }
                value={
                  activeDatePicker === 'expiration'
                    ? parseFormattedDate(editExpirationDate)
                    : parseFormattedDate(editBoughtDate)
                }
                onClose={() => setActiveDatePicker(null)}
                onSelectDate={(date) => {
                  if (activeDatePicker === 'expiration') {
                    setEditExpirationDate(formatDate(date));
                  } else if (activeDatePicker === 'bought') {
                    setEditBoughtDate(formatDate(date));
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  container: { paddingHorizontal: 16, paddingBottom: 36 },
  headerBlock: { marginTop: 6, marginBottom: 14 },
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

  filterContainer: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
  },
  filterButtonActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  filterButtonText: { fontSize: 13, fontWeight: '600', color: '#888888' },
  filterButtonTextActive: { color: '#FFFFFF', fontWeight: '700' },

  card: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  cardToBuy: { borderLeftColor: '#00BCD4' },
  cardInProgress: { borderLeftColor: '#FFD700' },
  cardImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#1A1A1A',
  },
  noImagePlaceholder: {
    backgroundColor: '#181818',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  cardCategory: { fontSize: 12, color: '#4CAF50', fontWeight: '600', marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: '#999999' },
  cardExpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 6,
  },
  cardExpDot: { width: 7, height: 7, borderRadius: 4 },
  cardExpText: { fontSize: 12, fontWeight: '700' },

  markBoughtBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#00BCD4',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  markDoneBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  emptyContainer: { paddingVertical: 70, alignItems: 'center', gap: 10 },
  emptyText: { color: '#666666', fontSize: 15, fontWeight: '500' },

  /* ================= MODAL SHEET STYLES ================= */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0B0B0B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: '#222222',
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333333',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#282828',
  },
  categoryBadgeText: {
    color: '#BBBBBB',
    fontSize: 11,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  closeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScrollContent: {
    paddingBottom: 16,
  },

  /* View Mode Styles */
  detailHeroImage: {
    width: '100%',
    height: 175,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: '#161616',
  },
  expBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  expBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  expBannerSub: {
    fontSize: 12,
    color: '#AAAAAA',
    marginTop: 2,
  },
  quickQuantityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: 12,
  },
  detailCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777777',
    letterSpacing: 0.6,
  },
  quickQuantityValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  quickQuantityUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888888',
  },
  quickStepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickStepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  detailGridCard: {
    width: '48%',
    backgroundColor: '#121212',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  detailGridIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  detailCardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },

  notesCard: {
    backgroundColor: '#121212',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: 16,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  notesBodyText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },

  completeDetailsBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  completeDetailsBannerText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },

  /* Edit Mode Styles */
  editSection: {
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: 12,
  },
  editSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  editInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090909',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  editTextInput: {
    flex: 1,
    fontSize: 15,
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
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: '#090909',
    borderWidth: 1,
    borderColor: '#242424',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.16)',
    borderColor: '#4CAF50',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999999',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090909',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 11,
    height: 44,
    paddingHorizontal: 12,
  },
  quantityInputText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  quantityUnitLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
  },
  unitPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  unitPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 9,
    backgroundColor: '#090909',
    borderWidth: 1,
    borderColor: '#242424',
  },
  unitPillActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  unitPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
  },
  unitPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  currencyBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: 'rgba(76, 175, 80, 0.16)',
  },
  currencyBadgeText: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: '800',
  },
  datesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  dateCardBtn: {
    flex: 1,
    backgroundColor: '#090909',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 11,
    padding: 11,
  },
  dateCardExpiration: {
    borderColor: 'rgba(76, 175, 80, 0.45)',
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  dateCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  dateCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888888',
  },
  dateCardValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#090909',
    borderWidth: 1,
    borderColor: '#242424',
    alignItems: 'center',
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#AAAAAA',
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
    gap: 7,
    backgroundColor: '#090909',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 11,
    paddingVertical: 11,
  },
  photoActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4CAF50',
  },
  editImagePreviewWrap: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  editImagePreview: {
    width: '100%',
    height: 140,
    borderRadius: 12,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Bottom Action Buttons */
  footerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  deleteIconBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#AAAAAA',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryEditBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primarySaveBtn: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primarySaveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
