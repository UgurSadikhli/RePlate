import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState,useEffect } from "react";
import {
  Button,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  Alert
} from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { loadProducts, saveProducts } from "../storage/productStorage";


const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function ProductsListScreen() {
  const [products, setProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editing, setEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [isDoneAction, setIsDoneAction] = useState(false); 

  const [editQuantity, setEditQuantity] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editExpirationDate, setEditExpirationDate] = useState("");
  const [editBoughtDate, setEditBoughtDate] = useState("");
  const [editQuantityType, setEditQuantityType] = useState("");
  const [editImage, setEditImage] = useState("");

  const [showBoughtDatePicker, setShowBoughtDatePicker] = useState(false);
  const [showExpirationDatePicker, setShowExpirationDatePicker] = useState(false);

  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
        if (Platform.OS !== 'web') {
            const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (libraryStatus !== 'granted') {
                setPermissionStatus('denied');
                Alert.alert(
                    'Permission Required',
                    'Media Library permission is needed to upload photos.'
                );
            } else {
                setPermissionStatus('granted');
            }
        }
    })();
  }, []);

  const pickImage = async () => {
    if (permissionStatus !== 'granted') {
         Alert.alert('Permission Denied', 'Please grant media library access in your settings.');
         return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5, 
    });

    if (!result.canceled) {
        setEditImage(result.assets[0].uri);
    }
  };

  const loadData = async () => {
    const data = await loadProducts();
    setProducts(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const openModal = (product, isEditing = false, isDone = false) => {
    setSelectedProduct(product);
    setEditing(isEditing || isDone);
    setIsDoneAction(isDone);
    
    if (isEditing || isDone) {
      setEditQuantity(String(product.quantity));
      setEditCategory(product.category);
      setEditNotes(product.notes);
      setEditPrice(String(product.price));
      setEditExpirationDate(product.expirationDate || '');
      setEditBoughtDate(product.boughtDate || '');
      setEditQuantityType(product.quantityType);
      setEditImage(product.image || '');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setEditing(false);
    setIsDoneAction(false);
    setEditQuantity("");
    setEditCategory("");
    setEditNotes("");
    setEditPrice("");
    setEditExpirationDate("");
    setEditBoughtDate("");
    setEditQuantityType("");
    setEditImage("");
    setModalVisible(false);
  };

  const deleteProduct = async (id) => {
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    await saveProducts(updated);
    closeModal();
  };

  const saveEdit = async () => {
    const updatedProducts = products.map((p) => {
      if (p.id === selectedProduct.id) {
        const newInProgress = isDoneAction ? false : p.inProgress;
        
        return { 
          ...p, 
          quantity: editQuantity, 
          category: editCategory, 
          notes: editNotes,
          price: parseFloat(editPrice) || 0,
          expirationDate: editExpirationDate,
          boughtDate: editBoughtDate,
          quantityType: editQuantityType,
          image: editImage,
          inProgress: newInProgress
        };
      }
      return p;
    });
    setProducts(updatedProducts);
    await saveProducts(updatedProducts);
    closeModal();
  };
  
  const markAsDone = (product) => {
    if (!product.price || !product.expirationDate || !product.quantity || !product.quantityType) {
        Alert.alert(
            "Missing Details",
            "Please ensure Price, Expiration Date, Quantity, and Quantity Type are entered before marking as Done."
        );
        return;
    }
    openModal(product, false, true);
  };

  const handleBoughtDateChange = (event, selectedDate) => {
    setShowBoughtDatePicker(false);
    if (selectedDate) {
        setEditBoughtDate(formatDate(selectedDate));
    }
  };

  const handleExpirationDateChange = (event, selectedDate) => {
    setShowExpirationDatePicker(false);
    if (selectedDate) {
        setEditExpirationDate(formatDate(selectedDate));
    }
  };

  const showBoughtPicker = () => setShowBoughtDatePicker(true);
  const showExpirationPicker = () => setShowExpirationDatePicker(true);
  
  const getExpirationDays = (expirationDateStr) => {
    try {
      const expDate = new Date(expirationDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expDate.setHours(0, 0, 0, 0);
      const diffTime = expDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (e) {
      return null;
    }
  };

  const getExpirationColor = (days) => {
    if (days < 0) return "#FF6B6B";
    if (days === 0) return "#FF6B6B";
    if (days <= 5) return "#FFD700";
    return "#4CAF50";
  };

  const getExpirationText = (days) => {
    if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
    if (days === 0) return "Today";
    if (days === 1) return "In 1 day";
    return `In ${days} days`;
  };

  const filteredProducts = products.filter(p => {
    if (filter === 'toBuy') return p.toBuy;
    if (filter === 'expiresSoon') return getExpirationDays(p.expirationDate) !== null && getExpirationDays(p.expirationDate) <= 4 && !p.toBuy;
    if (filter === 'inProgress') return p.inProgress;
    return true;
  });


  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.header}>Products</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'toBuy' && styles.filterButtonActive]}
          onPress={() => setFilter('toBuy')}
        >
          <Text style={[styles.filterButtonText, filter === 'toBuy' && styles.filterButtonTextActive]}>To Buy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'expiresSoon' && styles.filterButtonActive]}
          onPress={() => setFilter('expiresSoon')}
        >
          <Text style={[styles.filterButtonText, filter === 'expiresSoon' && styles.filterButtonTextActive]}>Expires Soon</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'inProgress' && styles.filterButtonActive]}
          onPress={() => setFilter('inProgress')}
        >
          <Text style={[styles.filterButtonText, filter === 'inProgress' && styles.filterButtonTextActive]}>In Progress</Text>
        </TouchableOpacity>
      </ScrollView>


      {filteredProducts.map((p) => (
        <View key={p.id} style={{ marginBottom: 14, position: 'relative' }}>
          <TouchableOpacity
            style={[styles.card, p.toBuy && styles.cardToBuy, p.inProgress && styles.cardInProgress]}
            onPress={() => openModal(p)}
          >
            {p.image ? (
              <Image source={{ uri: p.image }} style={styles.cardImage} />
            ) : (
              <View style={[styles.cardImage, { backgroundColor: "#ddd", justifyContent: "center", alignItems: "center" }]}>
                <Text>No Image</Text>
              </View>
            )}
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{p.name}</Text>
              <Text style={styles.cardSubtitle}>{p.category}</Text>
              <Text style={styles.cardSubtitle}>
                Quantity: {p.quantity} {p.quantityType}
              </Text>
              {getExpirationDays(p.expirationDate) !== null && !p.toBuy && (
                <Text style={[styles.cardSubtitle, { marginTop: 4, color: getExpirationColor(getExpirationDays(p.expirationDate)), fontWeight: "600" }]}>
                  {getExpirationText(getExpirationDays(p.expirationDate))}
                </Text>
              )}
            </View>

            {p.toBuy && (
              <TouchableOpacity
                style={styles.markBoughtBtn}
                onPress={async () => {
                  const updatedProducts = products.map((item) =>
                    item.id === p.id ? { ...item, toBuy: false,  inProgress: true } : item
                  );

                  setProducts(updatedProducts);
                  await saveProducts(updatedProducts);
                }}
              >
                <Text style={styles.markBoughtBtnText}>✓</Text>
              </TouchableOpacity>
            )}
            
            {p.inProgress && (
              <TouchableOpacity
                style={styles.markDoneBtn}
                onPress={() => markAsDone(p)}
              >
                <Text style={styles.markDoneBtnText}>✓</Text>
              </TouchableOpacity>
            )}

          </TouchableOpacity>
        </View>
      ))}

      {selectedProduct && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, selectedProduct?.toBuy && styles.modalContentToBuy,selectedProduct?.inProgress && styles.modalContentInProgress]} >
              <KeyboardAwareScrollView>
                <Text style={styles.modalTitle}>
                  {isDoneAction ? "Finalize Usage" : selectedProduct.name}
                </Text>
                


                {(editing || isDoneAction) ? ( 
                  <>
                    <Text style={styles.inputLabel}>Name (Read Only):</Text>
                    <TextInput value={selectedProduct.name} editable={false} style={styles.inputReadOnly} />

                    <Text style={styles.inputLabel}>Image:</Text>
                    <View style={styles.imagePickerContainer}>
                        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage} disabled={permissionStatus !== 'granted'}>
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
                    <TextInput value={editCategory} onChangeText={setEditCategory} style={styles.input} />
                    
                    <Text style={styles.inputLabel}>Price:</Text>
                    <TextInput value={editPrice} onChangeText={setEditPrice} keyboardType="numeric" style={styles.input} />

                    <Text style={styles.inputLabel}>Bought Date:</Text>
                    <TouchableOpacity onPress={showBoughtPicker} style={styles.datePickerButton}>
                        <Text style={styles.datePickerText}>
                            {editBoughtDate || 'Select Date'}
                        </Text>
                        <Text style={styles.datePickerIcon}></Text>
                    </TouchableOpacity>
                    {showBoughtDatePicker && (
                        <DateTimePicker
                            value={editBoughtDate ? new Date(editBoughtDate) : new Date()}
                            mode="date"
                            display="default"
                            onChange={handleBoughtDateChange}
                        />
                    )}

                    <Text style={styles.inputLabel}>Expiration Date:</Text>
                    <TouchableOpacity onPress={showExpirationPicker} style={styles.datePickerButton}>
                        <Text style={styles.datePickerText}>
                            {editExpirationDate || 'Select Date'}
                        </Text>
                         <Text style={styles.datePickerIcon}></Text>
                    </TouchableOpacity>
                    {showExpirationDatePicker && (
                        <DateTimePicker
                            value={editExpirationDate ? new Date(editExpirationDate) : new Date()}
                            mode="date"
                            display="default"
                            onChange={handleExpirationDateChange}
                        />
                    )}

                    <Text style={styles.inputLabel}>Quantity:</Text>
                    <TextInput value={editQuantity} onChangeText={setEditQuantity} keyboardType="numeric" style={styles.input} />

                    <Text style={styles.inputLabel}>Quantity Type:</Text>
                    <TextInput value={editQuantityType} onChangeText={setEditQuantityType} style={styles.input} />

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
                        <Text style={styles.infoValue}>{selectedProduct.quantity} {selectedProduct.quantityType}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Price</Text>
                        <Text style={styles.infoValue}>${selectedProduct.price}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Bought Date</Text>
                        <Text style={styles.infoValue}>{selectedProduct.boughtDate}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Expiration Date</Text>
                        <Text style={styles.infoValue}>{selectedProduct.expirationDate}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>To Buy</Text>
                        <Text style={[styles.infoValue, { color: selectedProduct.toBuy ? "#f25921ff" : "#4CAF50" }]}>
                          {selectedProduct.toBuy ? "Yes" : "No"}
                        </Text>
                      </View>
                      {getExpirationDays(selectedProduct.expirationDate) !== null && !selectedProduct.toBuy && (
                        <View style={[styles.infoRow, styles.expirationRow]}>
                          <Text style={styles.infoLabel}>Expires</Text>
                          <Text style={[styles.infoValue, { color: getExpirationColor(getExpirationDays(selectedProduct.expirationDate)), fontWeight: "700" }]}>
                            {getExpirationText(getExpirationDays(selectedProduct.expirationDate))}
                          </Text>
                        </View>
                      )}
                    </View>
                      <View style={styles.notesSection}>
                        <Text style={styles.notesLabel}>Notes</Text>
                        <Text style={styles.notesText}>{selectedProduct.notes}</Text>
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
                    <Button
                      title="Edit"
                      onPress={() => openModal(selectedProduct, true)}
                    />
                  )}
                  
                  <Button
                    title="Delete"
                    color="#F44336"
                    onPress={() => deleteProduct(selectedProduct.id)}
                  />
                  <Button title="Close" color="gray" onPress={closeModal} />
                </View>
              </KeyboardAwareScrollView>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 15, backgroundColor: "#000000ff", paddingBottom: 30 },
  header: { textAlign: "left", fontSize: 26, fontWeight: "800", marginBottom: 20, color: "#f1f1f1ee", letterSpacing: 0.5 },
  card: { flexDirection: "row", width: "100%", backgroundColor: "#1a1a1a", borderRadius: 14, padding: 12, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, borderLeftWidth: 4, borderLeftColor: "#4CAF50" },
  cardToBuy: { borderLeftColor: "#00BCD4" },
  cardInProgress: { borderLeftColor: "#ffd103ff" },
  cardImage: { width: 80, height: 80, borderRadius: 12, marginRight: 12, backgroundColor: "#2a2a2a" },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "700", marginBottom: 4, color: "#f1f1f1ee" },
  cardSubtitle: { fontSize: 13, color: "#888", marginBottom: 2 },
  
  markBoughtBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#4CAF50", justifyContent: "center", alignItems: "center", marginLeft: 8 },
  markBoughtBtnText: { fontSize: 24, color: "#fff", fontWeight: "bold" },

  markDoneBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#ffd103ff", justifyContent: "center", alignItems: "center", marginLeft: 8 },
  markDoneBtnText: { fontSize: 24, color: "#000000d8", fontWeight: "bold"  },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "90%", maxHeight: "85%", backgroundColor: "#1a1a1a", borderRadius: 18, padding: 24, elevation: 15, borderTopWidth: 3, borderTopColor: "#4CAF50" },
  modalContentToBuy: { borderTopColor: "#00BCD4" },
  modalContentInProgress: { borderTopColor: "#ffd103ff" },
  modalTitle: { fontSize: 24, fontWeight: "800", marginBottom: 18, color: "#f1f1f1ee" },
  productImage: { width: "100%", height: 180, marginBottom: 18, borderRadius: 12, backgroundColor: "#2a2a2a" },
  modalButtons: { marginTop: 24, flexDirection: "row", justifyContent: "space-between", gap: 8 },
  
  inputLabel: { marginTop: 12, color: "#fff", fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: 1.5,
    borderColor: "#333",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    backgroundColor: "#0a0a0a",
    color: "#f1f1f1ee",
    fontSize: 15,
  },
  inputReadOnly: {
    borderWidth: 1.5,
    borderColor: "#555",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    backgroundColor: "#222",
    color: "#aaa",
    fontSize: 15,
  },
  
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    backgroundColor: "#0a0a0a",
  },
  datePickerText: {
    color: "#f1f1f1ee",
    fontSize: 15,
  },
  datePickerIcon: {
      fontSize: 18,
      color: '#4CAF50',
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
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, backgroundColor: "#0a0a0a", borderRadius: 10, marginBottom: 6 },
  expirationRow: { backgroundColor: "rgba(255, 107, 107, 0.1)", borderWidth: 1, borderColor: "rgba(255, 107, 107, 0.3)" },
  infoLabel: { fontSize: 13, color: "#888", fontWeight: "600", flex: 1 },
  infoValue: { fontSize: 15, color: "#f1f1f1ee", fontWeight: "600", textAlign: "right" },
  notesSection: { marginTop: 5, paddingHorizontal: 12, paddingVertical: 14, backgroundColor: "#0a0a0a", borderRadius: 10, borderLeftWidth: 3 },
  notesLabel: { fontSize: 13, color: "#888", fontWeight: "600", marginBottom: 6 },
  notesText: { fontSize: 14, color: "#f1f1f1ee", lineHeight: 20 },
  filterContainer: { flexDirection: "row", gap: 10, marginBottom: 20, justifyContent: "center" },
  filterButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, backgroundColor: "#0a0a0a", borderWidth: 1.5, borderColor: "#333" },
  filterButtonActive: { backgroundColor: "#4CAF50", borderColor: "#4CAF50" },
  filterButtonText: { fontSize: 14, fontWeight: "600", color: "#888" },
  filterButtonTextActive: { color: "#fff" },
});