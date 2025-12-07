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
} from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { loadProducts, saveProducts } from "../storage/productStorage";

export default function ProductsListScreen() {
  const [products, setProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editing, setEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const [editQuantity, setEditQuantity] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const loadData = async () => {
    const data = await loadProducts();
    setProducts(data);
    // console.log("Products loaded:", data);
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

  const openModal = (product, isEditing = false) => {
    setSelectedProduct(product);
    setEditing(isEditing);
    if (isEditing) {
      setEditQuantity(product.quantity);
      setEditNotes(product.notes);
      setEditCategory(product.category);
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setEditing(false);
    setEditQuantity("");
    setEditNotes("");
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
        return { ...p, quantity: editQuantity, notes: editNotes, category: editCategory};
      }
      return p;
    });
    setProducts(updatedProducts);
    await saveProducts(updatedProducts);
    closeModal();
  };

  const markAsBought = async () => {
    if (!selectedProduct) return;
    const updatedProducts = products.map((p) =>
      p.id === selectedProduct.id ? { ...p, toBuy: false } : p
    );
    setProducts(updatedProducts);
    await saveProducts(updatedProducts);
    closeModal();
  };

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
    if (days < 0) return "#FF6B6B"; // Expired - red
    if (days === 0) return "#FF6B6B"; // Today - red
    if (days <= 5) return "#FFD700"; // 1-5 days - yellow
    return "#4CAF50"; // 6+ days - green
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

            {/* Mark as bought button for toBuy items */}
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
                <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
                {selectedProduct.image && (
                  <Image
                    source={{ uri: selectedProduct.image }}
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                )}



                {editing ? (
                  <>

                   <Text style={{ marginTop: 10, color: "#fff", fontSize: 14, fontWeight: "600" }}>Category:</Text>
                    <TextInput
                      value={editCategory}
                      onChangeText={setEditCategory}
                      style={styles.input}
                    />

                    <Text style={{ marginTop: 12, color: "#fff", fontSize: 14, fontWeight: "600" }}>Quantity:</Text>
                    <TextInput
                      value={editQuantity}
                      onChangeText={setEditQuantity}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                    <Text style={{ marginTop: 12, color: "#fff", fontSize: 14, fontWeight: "600" }}>Notes:</Text>
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
                  {!editing && (
                    <Button
                      title="Edit"
                      onPress={() => openModal(selectedProduct, true)}
                    />
                  )}
                  {editing && (
                    <Button title="Save" onPress={saveEdit} color="#4CAF50" />
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "90%", maxHeight: "85%", backgroundColor: "#1a1a1a", borderRadius: 18, padding: 24, elevation: 15, borderTopWidth: 3, borderTopColor: "#4CAF50" },
  modalContentToBuy: { borderTopColor: "#00BCD4" },
  modalContentInProgress: { borderTopColor: "#ffd103ff" },
  modalTitle: { fontSize: 24, fontWeight: "800", marginBottom: 18, color: "#f1f1f1ee" },
  productImage: { width: "100%", height: 180, marginBottom: 18, borderRadius: 12, backgroundColor: "#2a2a2a" },
  modalButtons: { marginTop: 24, flexDirection: "row", justifyContent: "space-between", gap: 8 },
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
