import { useState,useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Animated,
  Image,
  Modal,
  Button
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import Product from "../models/Product";
import { saveProducts, loadProducts } from "../storage/productStorage";

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [expirationDate, setExpirationDate] = useState(new Date());
  const [boughtDate, setBoughtDate] = useState(new Date());
  const [quantity, setQuantity] = useState("");
  const [quantityType, setQuantityType] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [notes, setNotes] = useState("");
  const [toBuy, setToBuy] = useState(false);

  const fadeAnim = useState(new Animated.Value(1))[0];

  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [currentPicker, setCurrentPicker] = useState("");
  const [tempDate, setTempDate] = useState(new Date());


  const loadData = async () => {
    const data = await loadProducts();
    setProducts(data);
  //  console.log("Products in add page :", data );
  };
  

    useFocusEffect(
      useCallback(() => {
        loadData();
      }, [])
    );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: toBuy ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [toBuy]);

  const resetFields = () => {
    setName("");
    setCategory("");
    setExpirationDate(new Date());
    setBoughtDate(new Date());
    setQuantity("");
    setQuantityType("");
    setPrice("");
    setImage("");
    setNotes("");
    setToBuy(false);
  };

  const addProduct = async () => {
    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    // Store immutable copies
    const newProduct = new Product(
      Date.now(),
      name.trim(),
      category.trim(),
      toBuy ? "" : expirationDate.toISOString().split("T")[0],
      toBuy ? "" : boughtDate.toISOString().split("T")[0],
      quantity.trim(),
      quantityType.trim(),
      toBuy ? "" : price.trim(),
      toBuy ? "" : image,
      notes.trim(),
      toBuy
    );

    const updated = [...products, newProduct];
    setProducts(updated);
    await saveProducts(updated);
    resetFields();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const openDatePicker = (type) => {
    setCurrentPicker(type);
    setTempDate(type === "expiration" ? expirationDate : boughtDate);
    setPickerModalVisible(true);
  };

  const saveDate = () => {
    if (currentPicker === "expiration") setExpirationDate(new Date(tempDate));
    else setBoughtDate(new Date(tempDate));
    setPickerModalVisible(false);
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      extraHeight={110}
      enableOnAndroid={true}
    >
   
      <ScrollView contentContainerStyle={styles.container}>
           <Text style={styles.header}>New product</Text>
        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            placeholder="Enter product name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <TextInput
            placeholder="Enter category"
            placeholderTextColor="#999"
            value={category}
            onChangeText={setCategory}
            style={styles.input}
          />
        </View>

        {/* Quantity */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              placeholder="0"
              placeholderTextColor="#999"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Quantity Type</Text>
            <TextInput
              placeholder="kg, pcs"
              placeholderTextColor="#999"
              value={quantityType}
              onChangeText={setQuantityType}
              style={styles.input}
            />
          </View>
        </View>

        {/* To Buy Switch */}
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>To Buy</Text>
          <Switch value={toBuy} onValueChange={setToBuy} />
        </View>

        {/* Conditional Fields */}
        {!toBuy && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Dates */}
            <View style={styles.row}>

               <TouchableOpacity
                style={styles.datePicker}
                onPress={() => openDatePicker("bought")}
              >
                <Text style={styles.dateText}>Bought: </Text>
                <Text style={styles.dateText2}>
                  {boughtDate.toISOString().split("T")[0]}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.datePicker}
                onPress={() => openDatePicker("expiration")}
              >
                <Text style={styles.dateText}>Expiration: </Text>
                <Text style={styles.dateText2}>
                  {expirationDate.toISOString().split("T")[0]}
                </Text>
              </TouchableOpacity>

             
            </View>

            {/* Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price</Text>
              <TextInput
                placeholder="$0.00"
                placeholderTextColor="#999"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                placeholder="Additional info..."
                placeholderTextColor="#999"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                style={[styles.input, { height: 80 }]}
              />
            </View>

            {/* Image Picker */}
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Text style={styles.imageButtonText}>
                {image ? "Change Image" : "Upload Image"}
              </Text>
            </TouchableOpacity>
            {image && <Image source={{ uri: image }} style={styles.imagePreview} />}
          </Animated.View>
        )}

        {/* Add Button */}
        <TouchableOpacity style={styles.addButton} onPress={addProduct}>
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>

        {/* Date Picker Modal */}
        <Modal
          transparent
          animationType="slide"
          visible={pickerModalVisible}
          onRequestClose={() => setPickerModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 10, color: "#f1f1f1ee" }}>
                Select {currentPicker === "expiration" ? "Expiration" : "Bought"} Date
              </Text>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={(e, selectedDate) => {
                  if (selectedDate) setTempDate(selectedDate);
                }}
                style={{ width: "100%" }}
              />
              <Button title="Done" onPress={saveDate} />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  header: { textAlign: "left", fontSize: 26, fontWeight: "800", marginBottom: 20, color: "#f1f1f1ee", letterSpacing: 0.5 },
  container: { padding: 15, backgroundColor: "#000000ff" },
  inputGroup: { marginBottom: 15 },
  label: { fontWeight: "600", marginBottom: 5, color: "#f1f1f1ee" },
  input: {
    backgroundColor: "#f1f1f1ee",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333131ff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  switchRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  switchText: { fontSize: 16, marginRight: 10, color: "#f1f1f1ee" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  datePicker: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    marginRight: 10,
    justifyContent: "center",
    shadowColor: "#000000ca",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  dateText: { color: "#555", fontWeight: "500" },
  dateText2: { color: "#4e4949ff", fontWeight: "700" },
  imageButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  imageButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  imagePreview: { width: "100%", height: 150, borderRadius: 12, marginBottom: 15 },
  addButton: { backgroundColor: "#4CAF50", paddingVertical: 15, borderRadius: 12, marginTop: 10, alignItems: "center" },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.77)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#0f0e0eff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
});
