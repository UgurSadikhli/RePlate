import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { loadProducts } from "../storage/productStorage";

interface Product {
  id: number;
  name: string;
  quantity: string;
  quantityType: string;
  category?: string;
  price?: string;
  image?: string;
  notes?: string;
  toBuy?: boolean;
}

interface Meal {
  name: string;
  image?: string;
  ingredients: string[];
  steps: string[];
  calories?: number;
  proteins?: number;
}

export default function MealsScreen() {


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Suggested Meals</Text>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  card: {
    backgroundColor: "#f8f8f8",
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  cardImage: { width: 60, height: 60, borderRadius: 10, marginRight: 12 },
  cardPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "85%", maxHeight: "80%", backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  modalImage: { width: "100%", height: 150, borderRadius: 10, marginBottom: 12 },
  subTitle: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  closeButton: {
    backgroundColor: "#2196F3",
    marginTop: 20,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  closeButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
