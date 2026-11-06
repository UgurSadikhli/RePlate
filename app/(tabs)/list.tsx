import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import FillInMissingDetailsGap from '@/components/fill-in-missing-details-gap';
import { DatePickerModal } from '@/components/date-picker-modal';
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

export default function ProductsListScreen() {
  const { products, settings, refreshData, updateProducts, deleteProductById } = useAppContext();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isDoneAction, setIsDoneAction] = useState(false);

  const [editQuantity, setEditQuantity] = useState('');
  const [editCategory, setEditCategory] = useState('');
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
        if (libraryStatus !== 'granted') {
          setPermissionStatus('denied');
        } else {
          setPermissionStatus('granted');
        }
      } else {
        setPermissionStatus('granted');
      }
    })();
  }, []);

  const pickImage = async () => {
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
      quality: 0.5,
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

  const openModal = (product: ProductItem, isEditing = false, isDone = false) => {
    setSelectedProduct(product);
    setEditing(isEditing || isDone);
    setIsDoneAction(isDone);

    if (isEditing || isDone) {
      setEditQuantity(String(product.quantity ?? ''));
      setEditCategory(product.category ?? '');
      setEditNotes(product.notes ?? '');
      setEditPrice(product.price !== undefined && product.price !== '' ? String(product.price) : '');
      setEditExpirationDate(product.expirationDate || '');
      setEditBoughtDate(product.boughtDate || formatDate(new Date()));
      setEditQuantityType(product.quantityType ?? '');
      setEditImage(product.image || '');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setEditing(false);
    setIsDoneAction(false);
    setEditQuantity('');
    setEditCategory('');
    setEditNotes('');
    setEditPrice('');
    setEditExpirationDate('');
    setEditBoughtDate('');
    setEditQuantityType('');
    setEditImage('');
    setActiveDatePicker(null);
    setModalVisible(false);
  };

  const handleDeleteProduct = async (id: string | number) => {
    await deleteProductById(id);
    closeModal();
  };

  const saveEdit = async () => {
    if (!selectedProduct) return;

    const updatedProducts = products.map((p) => {
      if (p.id === selectedProduct.id) {
        const newInProgress = isDoneAction ? false : p.inProgress;
        const cleanPrice = parseFloat(String(editPrice).replace(',', '.')) || 0;

        return {
          ...p,
          quantity: editQuantity.trim(),
          category: editCategory.trim(),
          notes: editNotes.trim(),
          price: cleanPrice,
          expirationDate: editExpirationDate,
          boughtDate: editBoughtDate || formatDate(new Date()),
          quantityType: editQuantityType.trim(),
          image: editImage,
          inProgress: newInProgress,
        };
      }
      return p;
    });

    await updateProducts(updatedProducts);
    closeModal();
  };

  const markAsDone = async (product: ProductItem) => {
    const missingFields: string[] = [];
    if (!product.price && Number(product.price) !== 0) missingFields.push('Price');
    else if (product.price === '' || product.price === 0 || product.price === '0') missingFields.push('Price');
    if (!product.expirationDate) missingFields.push('Expiration Date');
    if (!product.quantity) missingFields.push('Quantity');
    if (!product.quantityType) missingFields.push('Quantity Type');
    if (!product.category) missingFields.push('Category');

    if (missingFields.length > 0) {
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
    }
  };

  const handleGapSubmit = async (newValues: Record<string, string>) => {
    if (!selectedProduct) return;

    const updatedProducts = products.map((p) => {
      if (p.id === selectedProduct.id) {
        const rawPrice = newValues['Price'] ? newValues['Price'].replace(',', '.') : String(p.price || 0);
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

  const renderHeader = () => (
    <View>
      <Text style={styles.header}>Products</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {(
          [
            { key: 'all', label: 'All' },
            { key: 'toBuy', label: 'To Buy' },
            { key: 'expiresSoon', label: 'Expires Soon' },
            { key: 'inProgress', label: 'In Progress' },
          ] as const
        ).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterButton, filter === tab.key && styles.filterButtonActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[styles.filterButtonText, filter === tab.key && styles.filterButtonTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderProductItem = ({ item: p }: { item: ProductItem }) => {
    const expDays = getExpirationDays(p.expirationDate);
    return (
      <View style={{ marginBottom: 14, position: 'relative' }}>
        <TouchableOpacity
          style={[styles.card, p.toBuy && styles.cardToBuy, p.inProgress && styles.cardInProgress]}
          onPress={() => openModal(p)}
        >
          {p.image ? (
            <Image source={{ uri: p.image }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.noImagePlaceholder]}>
              <Text style={styles.noImageText}>No Image</Text>
            </View>
          )}
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{p.name}</Text>
            {!!p.category && <Text style={styles.cardSubtitle}>{p.category}</Text>}
            <Text style={styles.cardSubtitle}>
              Quantity: {p.quantity} {p.quantityType}
            </Text>
            {expDays !== null && !p.toBuy && (
              <Text
                style={[
                  styles.cardSubtitle,
                  { marginTop: 4, color: getExpirationColor(expDays), fontWeight: '600' },
                ]}
              >
                {getExpirationText(expDays)}
              </Text>
            )}
          </View>

          {p.toBuy && (
            <TouchableOpacity
              style={styles.markBoughtBtn}
              onPress={async () => {
                const updatedProducts = products.map((item) =>
                  item.id === p.id
                    ? { ...item, toBuy: false, inProgress: true, boughtDate: formatDate(new Date()) }
                    : item
                );
                await updateProducts(updatedProducts);
              }}
            >
              <Text style={styles.markBoughtBtnText}>✓</Text>
            </TouchableOpacity>
          )}

          {p.inProgress && (
            <TouchableOpacity style={styles.markDoneBtn} onPress={() => markAsDone(p)}>
              <Text style={styles.markDoneBtnText}>✓</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>
    );
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
            <Text style={styles.emptyText}>No products found in this view.</Text>
          </View>
        }
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      {selectedProduct && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                selectedProduct?.toBuy && styles.modalContentToBuy,
                selectedProduct?.inProgress && styles.modalContentInProgress,
              ]}
            >
              <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>
                  {isDoneAction ? 'Finalize Usage' : selectedProduct.name}
                </Text>

                {editing || isDoneAction ? (
                  <>
                    <Text style={styles.inputLabel}>Name (Read Only):</Text>
                    <TextInput
                      value={selectedProduct.name}
                      editable={false}
                      style={styles.inputReadOnly}
                    />

                    <Text style={styles.inputLabel}>Image:</Text>
                    <View style={styles.imagePickerContainer}>
                      <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                        <Text style={styles.imagePickerButtonText}>
                          {editImage ? 'Change Image' : 'Pick Image'}
                        </Text>
                      </TouchableOpacity>
                      {editImage ? (
                        <Image source={{ uri: editImage }} style={styles.imagePreviewSmall} />
                      ) : (
                        <Text style={styles.imagePickerPlaceholder}>No image selected</Text>
                      )}
                    </View>

                    <Text style={styles.inputLabel}>Category:</Text>
                    <TextInput
                      value={editCategory}
                      onChangeText={setEditCategory}
                      style={styles.input}
                    />

                    <Text style={styles.inputLabel}>Price ({getCurrencySymbol(settings.currency)}):</Text>
                    <TextInput
                      value={editPrice}
                      onChangeText={setEditPrice}
                      keyboardType="decimal-pad"
                      style={styles.input}
                    />

                    <Text style={styles.inputLabel}>Bought Date:</Text>
                    <TouchableOpacity
                      onPress={() => setActiveDatePicker('bought')}
                      style={styles.datePickerButton}
                    >
                      <Text style={styles.datePickerText}>{editBoughtDate || 'Select Date'}</Text>
                    </TouchableOpacity>

                    <Text style={styles.inputLabel}>Expiration Date:</Text>
                    <TouchableOpacity
                      onPress={() => setActiveDatePicker('expiration')}
                      style={styles.datePickerButton}
                    >
                      <Text style={styles.datePickerText}>
                        {editExpirationDate || 'Select Date'}
                      </Text>
                    </TouchableOpacity>

                    <Text style={styles.inputLabel}>Quantity:</Text>
                    <TextInput
                      value={editQuantity}
                      onChangeText={setEditQuantity}
                      keyboardType="decimal-pad"
                      style={styles.input}
                    />

                    <Text style={styles.inputLabel}>Quantity Type:</Text>
                    <TextInput
                      value={editQuantityType}
                      onChangeText={setEditQuantityType}
                      style={styles.input}
                    />

                    <Text style={styles.inputLabel}>Notes:</Text>
                    <TextInput
                      value={editNotes}
                      onChangeText={setEditNotes}
                      multiline
                      numberOfLines={3}
                      style={[styles.input, { height: 80 }]}
                    />
                  </>
                ) : (
                  <>
                    <View style={styles.infoSection}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Quantity</Text>
                        <Text style={styles.infoValue}>
                          {selectedProduct.quantity} {selectedProduct.quantityType}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Price</Text>
                        <Text style={styles.infoValue}>
                          {getCurrencySymbol(settings.currency)}
                          {selectedProduct.price || 0}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Bought Date</Text>
                        <Text style={styles.infoValue}>{selectedProduct.boughtDate || '—'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Expiration Date</Text>
                        <Text style={styles.infoValue}>{selectedProduct.expirationDate || '—'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>To Buy</Text>
                        <Text
                          style={[
                            styles.infoValue,
                            { color: selectedProduct.toBuy ? '#f25921ff' : '#4CAF50' },
                          ]}
                        >
                          {selectedProduct.toBuy ? 'Yes' : 'No'}
                        </Text>
                      </View>
                      {(() => {
                        const modalExpDays = getExpirationDays(selectedProduct.expirationDate);
                        if (modalExpDays !== null && !selectedProduct.toBuy) {
                          return (
                            <View style={[styles.infoRow, styles.expirationRow]}>
                              <Text style={styles.infoLabel}>Expires</Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  {
                                    color: getExpirationColor(modalExpDays),
                                    fontWeight: '700',
                                  },
                                ]}
                              >
                                {getExpirationText(modalExpDays)}
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })()}
                    </View>
                    <View style={styles.notesSection}>
                      <Text style={styles.notesLabel}>Notes</Text>
                      <Text style={styles.notesText}>{selectedProduct.notes || 'No notes'}</Text>
                    </View>
                  </>
                )}

                <View style={styles.modalButtons}>
                  {editing && !isDoneAction && (
                    <Button title="Save Edit" onPress={saveEdit} color="#4CAF50" />
                  )}
                  {isDoneAction && (
                    <Button title="Mark as Done" onPress={saveEdit} color="#00BCD4" />
                  )}
                  {!editing && !isDoneAction && (
                    <Button title="Edit" onPress={() => openModal(selectedProduct, true)} />
                  )}

                  <Button
                    title="Delete"
                    color="#F44336"
                    onPress={() => handleDeleteProduct(selectedProduct.id)}
                  />
                  <Button title="Close" color="gray" onPress={closeModal} />
                </View>
              </KeyboardAwareScrollView>
            </View>

            <DatePickerModal
              visible={activeDatePicker !== null}
              inlineOverlay={true}
              title={activeDatePicker === 'expiration' ? 'Select Expiration Date' : 'Select Bought Date'}
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
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000ff' },
  container: { padding: 15, paddingBottom: 30 },
  header: {
    textAlign: 'left',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 20,
    color: '#f1f1f1ee',
    letterSpacing: 0.5,
  },
  card: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  cardToBuy: { borderLeftColor: '#00BCD4' },
  cardInProgress: { borderLeftColor: '#ffd103ff' },
  cardImage: { width: 80, height: 80, borderRadius: 12, marginRight: 12, backgroundColor: '#2a2a2a' },
  noImagePlaceholder: { backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center' },
  noImageText: { color: '#888', fontSize: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4, color: '#f1f1f1ee' },
  cardSubtitle: { fontSize: 13, color: '#888', marginBottom: 2 },

  markBoughtBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00BCD4',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  markBoughtBtnText: { fontSize: 24, color: '#111', fontWeight: 'bold' },

  markDoneBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffd103ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  markDoneBtnText: { fontSize: 24, color: '#111', fontWeight: 'bold' },

  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#1a1a1a',
    borderRadius: 18,
    padding: 24,
    elevation: 15,
    borderTopWidth: 3,
    borderTopColor: '#4CAF50',
  },
  modalContentToBuy: { borderTopColor: '#00BCD4' },
  modalContentInProgress: { borderTopColor: '#ffd103ff' },
  modalTitle: { fontSize: 24, fontWeight: '800', marginBottom: 18, color: '#f1f1f1ee' },
  modalButtons: { marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },

  inputLabel: { marginTop: 12, color: '#fff', fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderColor: '#333',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    backgroundColor: '#0a0a0a',
    color: '#f1f1f1ee',
    fontSize: 15,
  },
  inputReadOnly: {
    borderWidth: 1.5,
    borderColor: '#555',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    backgroundColor: '#222',
    color: '#aaa',
    fontSize: 15,
  },

  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#333',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    backgroundColor: '#0a0a0a',
  },
  datePickerText: {
    color: '#f1f1f1ee',
    fontSize: 15,
  },

  imagePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
    gap: 10,
  },
  imagePickerButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#3498db',
    borderRadius: 8,
  },
  imagePickerButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  imagePreviewSmall: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  imagePickerPlaceholder: {
    color: '#888',
    fontSize: 14,
  },

  infoSection: { marginVertical: 16, gap: 2 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    marginBottom: 6,
  },
  expirationRow: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  infoLabel: { fontSize: 13, color: '#888', fontWeight: '600', flex: 1 },
  infoValue: { fontSize: 15, color: '#f1f1f1ee', fontWeight: '600', textAlign: 'right' },
  notesSection: {
    marginTop: 5,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  notesLabel: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 6 },
  notesText: { fontSize: 14, color: '#f1f1f1ee', lineHeight: 20 },
  filterContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#0a0a0a',
    borderWidth: 1.5,
    borderColor: '#333',
  },
  filterButtonActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  filterButtonText: { fontSize: 14, fontWeight: '600', color: '#888' },
  filterButtonTextActive: { color: '#fff' },
});
