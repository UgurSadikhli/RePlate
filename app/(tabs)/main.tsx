import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from "@react-navigation/native";

const getExpirationDays = (expirationDateStr) => {
    const expDate = new Date(expirationDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const aggregateByExpiration = (products, getExpirationDays) => {
    const filtered = products.filter(p => !p.toBuy && p.expirationDate);
    const counts = {
        '7 Days': 0,
        '14 Days': 0,
        '30 Days': 0,
    };

    filtered.forEach(p => {
        const days = getExpirationDays(p.expirationDate);
        if (days >= 0 && days <= 7) {
            counts['7 Days']++;
        }
        if (days > 7 && days <= 14) {
            counts['14 Days']++;
        }
        if (days > 14 && days <= 30) {
            counts['30 Days']++;
        }
    });

    return [
        { label: '0-7 Days', count: counts['7 Days'], color: '#FF6B6B' },
        { label: '8-14 Days', count: counts['14 Days'], color: '#FFD700' },
        { label: '15-30 Days', count: counts['30 Days'], color: '#4CAF50' },
    ];
};

function ExpirationTimelineChart({ products, getExpirationDays }) {
    if (products.filter(p => !p.toBuy && p.expirationDate && getExpirationDays(p.expirationDate) >= 0).length === 0) return null;

    const data = aggregateByExpiration(products, getExpirationDays);
    const maxCount = Math.max(...data.map(item => item.count), 1);

    return (
        <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Expiration Timeline 🗓️</Text>
            <View style={styles.barChartWrapper}>
                {data.map((item, index) => (
                    <View key={index} style={styles.barContainer}>
                        <Text style={styles.barLabel}>{item.label}</Text>
                        <View style={styles.barTrack}>
                            <View 
                                style={[
                                    styles.barFill, 
                                    { 
                                        width: `${(item.count / maxCount) * 100}%`,
                                        backgroundColor: item.color
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.barCount}>{item.count}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

function MonthlyConsumptionTracker({ monthlyConsumption }) {
    const { thisMonth, lastMonth } = monthlyConsumption;
    
    const difference = thisMonth - lastMonth;
    const isHigher = difference > 0;
    const isSame = difference === 0;
    
    let icon, comparisonText, color;

    if (isSame) {
        icon = 'remove-circle';
        comparisonText = 'Same as last month.';
        color = '#888';
    } else if (isHigher) {
        icon = 'arrow-up-circle';
        comparisonText = `${difference} more than last month! Great job!`;
        color = '#4CAF50';
    } else {
        icon = 'arrow-down-circle';
        comparisonText = `${Math.abs(difference)} less than last month. Aim higher!`;
        color = '#FFD700';
    }

    return (
        <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Monthly Purchase Rate</Text>
            <View style={styles.consumptionStats}>
                <View style={styles.consumptionItem}>
                    <Text style={styles.consumptionValue}>{thisMonth}</Text>
                    <Text style={styles.consumptionLabel}>Purchased This Month</Text>
                </View>
                <View style={styles.consumptionDivider} />
                 <View style={styles.consumptionItem}>
                    <Text style={styles.consumptionValue}>{lastMonth}</Text>
                    <Text style={styles.consumptionLabel}>Purchased Last Month</Text>
                </View>
            </View>
            <View style={[styles.comparisonBar, { backgroundColor: color }]}>
                <Ionicons name={icon} size={20} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.comparisonText}>
                    {isSame ? comparisonText : comparisonText}
                </Text>
            </View>
        </View>
    );
}

// NEW COMPONENT: Monthly Spending Tracker
function MonthlySpendingTracker({ monthlySpending }) {
  
    const thisMonth = parseFloat(monthlySpending.thisMonth) || 0;
    const lastMonth = parseFloat(monthlySpending.lastMonth) || 0;
    const diff = thisMonth - lastMonth;
    const isHigher = diff > 0;
    
    let icon, comparisonText, color;

    if (diff === 0) {
        icon = 'remove-circle';
        comparisonText = 'Spending is the same as last month.';
        color = '#888';
    } else if (isHigher) {
        icon = 'arrow-up-circle';
        comparisonText = `Up $${diff.toFixed(2)} from last month.`;
        color = '#FF6B6B'; // Red for higher spending
    } else {
        icon = 'arrow-down-circle';
        comparisonText = `Down $${Math.abs(diff).toFixed(2)} from last month. Nice saving!`;
        color = '#4CAF50'; // Green for lower spending
    }
    const formatCurrency = (amount) => {
        const numericAmount = isFinite(amount) ? amount : 0;
        return `$${numericAmount.toFixed(2)}`;
    };

    return (
        <View style={[styles.chartContainer, { marginTop: 10 }]}>
            <Text style={styles.chartTitle}>Monthly Spending 💰</Text>
            <View style={styles.consumptionStats}>
                <View style={styles.consumptionItem}>
                    <Text style={[styles.consumptionValue, { color: '#00BCD4' }]}>
                        {formatCurrency(thisMonth)}
                    </Text>
                    <Text style={styles.consumptionLabel}>Spent This Month</Text>
                </View>
                <View style={styles.consumptionDivider} />
                 <View style={styles.consumptionItem}>
                    <Text style={styles.consumptionValue}>
                        {formatCurrency(lastMonth)}
                    </Text>
                    <Text style={styles.consumptionLabel}>Spent Last Month</Text>
                </View>
            </View>
            <View style={[styles.comparisonBar, { backgroundColor: color }]}>
                <Ionicons name={icon} size={20} color="#000" style={{ marginRight: 9 }} />
                <Text style={styles.comparisonText}>
                    {comparisonText}
                </Text>
            </View>
        </View>
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

export default function DashboardScreen() {
  const [products, setProducts] = useState([]);
  const [monthlyConsumption, setMonthlyConsumption] = useState({ thisMonth: 0, lastMonth: 0 });
  const [monthlySpending, setMonthlySpending] = useState({ thisMonth: 0, lastMonth: 0 }); // NEW STATE
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
    
    // DEMO DATA SETUP: Ensure products have a price and boughtDate for tracking
    const demoList = list.map((p, index) => ({
      ...p,
      price: p.price ||0, // Assign a dummy price
      boughtDate: p.boughtDate || new Date().toISOString().split('T')[0], // Ensure a date
    }));
    
    const now = new Date();
    
    // --- 1. Calculate Monthly Purchase Count ---
    const thisMonthProducts = demoList.filter(p => {
        if (!p.boughtDate) return false;
        if (p.inProgress) return false;
        if (p.toBuy) return false;
        const d = new Date(p.boughtDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const lastMonthProducts = demoList.filter(p => {
        if (!p.boughtDate) return false;
        if (p.inProgress) return false;
        if (p.toBuy) return false;
        const d = new Date(p.boughtDate);
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return d.getMonth() === lastMonth && d.getFullYear() === year;
    });

    const consumption =  { 
        thisMonth: thisMonthProducts.length,
        lastMonth: lastMonthProducts.length,
    }; 
    

 const calculateTotalSpending = (products) => {
        
        const acquiredProducts = products.filter(p => !p.toBuy && !p.inProgress);
        
        return acquiredProducts.reduce((sum, p) => {
            const rawPrice = p.price || 0;
            
            const cleanPrice = String(rawPrice).replace(',', '.'); 
            
            return sum + (parseFloat(cleanPrice) || 0);
        }, 0);
    };

    const spending = {
        thisMonth: calculateTotalSpending(thisMonthProducts),
        lastMonth: calculateTotalSpending(lastMonthProducts),
    };

    setProducts(demoList);
    setMonthlyConsumption(consumption);
    setMonthlySpending(spending); // SET NEW STATE
    calculateStats(demoList);
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
      <Animated.View style={[styles.headerContainer, { backgroundColor: headerColor }]}>
        <Text style={styles.headerTitle}>Food Dashboard</Text>
        <Text style={styles.headerSubtitle}>Visualize your inventory</Text>
      </Animated.View>

      <View style={styles.statsContainer}>
        <StatCard title="Total Foods" value={stats.total} icon="fast-food" color="#4CAF50" />
        <StatCard title="To Buy" value={stats.toBuy} icon="cart" color="#FF6B6B"  />
        <StatCard title="Expires Soon" value={stats.expiresSoon} icon="time" color="#FFD700" />
        <StatCard title="In Progress" value={stats.inProgress} icon="bicycle" color="#00BCD4" />
      </View>
      
      {/* NEW: Monthly Spending Tracker is placed first for financial overview */}
      <MonthlySpendingTracker monthlySpending={monthlySpending} /> 

      <MonthlyConsumptionTracker monthlyConsumption={monthlyConsumption} />

      <ExpirationTimelineChart products={products} getExpirationDays={getExpirationDays} />
    
    </ScrollView>
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
  
  consumptionStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 10,
  },
  consumptionItem: {
      alignItems: 'center',
      flex: 1,
  },
  consumptionValue: {
      fontSize: 32,
      fontWeight: '800',
      color: '#4CAF50', // Default color, overridden in spending tracker
  },
  consumptionLabel: {
      fontSize: 13,
      color: '#888',
      marginTop: 4,
  },
  consumptionDivider: {
      width: 1,
      height: '80%',
      backgroundColor: '#333',
  },
  comparisonBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 15,
      borderRadius: 8,
      marginTop: 10,
  },
  comparisonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#000',
  },

  chartContainer: { 
      marginTop: 20, 
      marginHorizontal: 16, 
      backgroundColor: '#1a1a1a', 
      padding: 15, 
      borderRadius: 12 
  },
  chartTitle: { 
      fontSize: 18, 
      fontWeight: '700', 
      color: '#fff', 
      marginBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#333',
      paddingBottom: 8,
  },
  
  barChartWrapper: { paddingVertical: 5 },
  barContainer: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      marginBottom: 10 
  },
  barLabel: { 
      width: 90, 
      fontSize: 13, 
      color: '#ddd', 
      marginRight: 10 
  },
  barTrack: { 
      flex: 1, 
      height: 12, 
      backgroundColor: '#333', 
      borderRadius: 6, 
      overflow: 'hidden' 
  },
  barFill: { 
      height: '100%', 
      borderRadius: 6,
  },
  barCount: { 
      width: 30, 
      textAlign: 'right', 
      fontSize: 14, 
      fontWeight: '600', 
      color: '#fff' 
  },
});