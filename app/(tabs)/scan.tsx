import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';

interface Food {
    id: string;
    name: string;
    description: string;
    price: number;
    image: string;
}

export default function FoodPage() {

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Scan</Text>
            
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    foodItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    foodName: { fontSize: 18, fontWeight: '600' },
    foodDesc: { fontSize: 14, color: '#666', marginTop: 4 },
    foodPrice: { fontSize: 16, fontWeight: 'bold', color: '#2ecc71', marginTop: 8 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    error: { flex: 1, color: 'red', textAlign: 'center', marginTop: 20 },
});