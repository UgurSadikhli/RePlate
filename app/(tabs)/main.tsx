import { useEffect, useState,useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from "@react-navigation/native";

export default function DashboardScreen() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    toBuy: 0,
    expiresSoon: 0,
    inProgress: 0,
  });

  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    loadData();
    animateHeader();
  }, []);

  useFocusEffect(
      useCallback(() => {
        loadData();
      }, [])
    );
  
  
  const loadData = async () => {
    const data = await AsyncStorage.getItem('products_list');
    const list = data ? JSON.parse(data) : [];
    setProducts(list);
    calculateStats(list);
  };

  const calculateStats = (list) => {
    const total = list.length;
    const toBuy = list.filter(p => p.toBuy).length;
    const inProgress = list.filter(p => p.inProgress).length;
    const expiresSoon = list.filter(p => {
      if (!p.expirationDate) return false;
      const days = getExpirationDays(p.expirationDate);
      return days >= 0 && days <= 5 && !p.toBuy;
    }).length;

    setStats({ total, toBuy, expiresSoon, inProgress });
  };

  const getExpirationDays = (expirationDateStr) => {
    const expDate = new Date(expirationDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const animateHeader = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(animatedValue, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
  };

  const headerColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000', '#4CAF50']
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      {/* Animated Header */}
      <Animated.View style={[styles.headerContainer, { backgroundColor: headerColor }]}>
        <Text style={styles.headerTitle}>Food Dashboard</Text>
        <Text style={styles.headerSubtitle}>Manage your products efficiently</Text>
      </Animated.View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <StatCard title="Total Foods" value={stats.total} icon="fast-food" color="#4CAF50" />
        <StatCard title="To Buy" value={stats.toBuy} icon="cart" color="#FF6B6B"  />
        <StatCard title="Expires Soon" value={stats.expiresSoon} icon="time" color="#FFD700" />
        <StatCard title="In Progress" value={stats.inProgress} icon="bicycle" color="#00BCD4" />
      </View>
    </ScrollView>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={28} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerContainer: { padding: 15, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 16, color: '#ddd', marginTop: 6 },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', marginTop: 20 },
  statCard: { width: '45%', backgroundColor: '#1a1a1a', padding: 16, marginBottom: 12, borderRadius: 12, borderLeftWidth: 5, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 8 },
  statTitle: { fontSize: 14, color: '#888', marginTop: 4 },
  cardsSection: { marginTop: 20, paddingHorizontal: 12 },
  productCard: { flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 14, marginBottom: 12, padding: 12, alignItems: 'center', shadowColor: '#4CAF50', shadowOpacity: 0.3, shadowRadius: 8 },
  productImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#333' },
  productName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  productCategory: { fontSize: 12, color: '#888', marginTop: 2 },
  productQuantity: { fontSize: 13, color: '#fff', marginTop: 2 },
  expirationText: { fontSize: 12, color: '#FFD700', marginTop: 4 },
});
