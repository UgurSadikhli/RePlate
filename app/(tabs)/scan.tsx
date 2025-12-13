import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import { GoogleGenAI } from "@google/genai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import deleteImg from '../../assets/images/delete.png';

const ai = new GoogleGenAI({
    apiKey: "AIzaSyAtqX3GO9xQb8V5XBa2Bw--l-twC-orhR0"
});

const STORAGE_KEY = "products_list";

async function saveProducts(products) {
    
    try {
        
        const normalized = products.map(item => ({
            
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            name: item.name,
            quantity: item.quantity_estimate,
            quantityType: item.quantity_estimate_type,
            inProgress: true,
            toBuy:false,
            category: item.item_category,
            boughtDate: new Date().toISOString().split('T')[0]}));
        const existing = await AsyncStorage.getItem(STORAGE_KEY);
        const arr = existing ? JSON.parse(existing) : [];

        const updated = [...arr, ...normalized];

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    } catch (error) {
        console.error("Saving error:", error);
    }
}


interface IdentifiedFoodItem {
    name: string;
    quantity_estimate: string;
    quantity_estimate_type: string;
    confidence_score: number;
    item_category: string;
}

export default function FoodPage() {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [base64Image, setBase64Image] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [identifiedItems, setIdentifiedItems] = useState<IdentifiedFoodItem[]>([]);

    const manipulateImage = async (uri: string) => {
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (!manipResult.base64) {
            throw new Error("manipulateAsync did not return base64.");
        }

        return { uri: manipResult.uri, base64: manipResult.base64 };
    };

    useEffect(() => {
        (async () => {
            if (Platform.OS !== 'web') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                const { status: libStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

                if (status !== 'granted' || libStatus !== 'granted') {
                    setPermissionStatus('denied');
                    Alert.alert("Permission needed");
                } else {
                    setPermissionStatus('granted');
                }
            }
        })();
    }, []);

    const pickImage = async () => {
        if (permissionStatus !== 'granted') return;

        setIdentifiedItems([]);

        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 1
        });

        if (!result.canceled) {
            const originalUri = result.assets[0].uri;
            const { uri, base64 } = await manipulateImage(originalUri);
            setImageUri(uri);
            setBase64Image(base64);
        }
    };

    const takePhoto = async () => {
        if (permissionStatus !== 'granted') return;

        setIdentifiedItems([]);

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 1
        });

        if (!result.canceled) {
            const originalUri = result.assets[0].uri;
            const { uri, base64 } = await manipulateImage(originalUri);
            setImageUri(uri);
            setBase64Image(base64);
        }
    };
    
    const removeItem = (index: number) => {
    const updated = [...identifiedItems];
    updated.splice(index, 1);
    setIdentifiedItems(updated);
    };


    const scanImage = async () => {
        if (!base64Image) return;

        setIsScanning(true);
        setIdentifiedItems([]);

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                    { text: "Analyze image and return ONLY JSON [{name, quantity_estimate, quantity_estimate_type(example: kg,g,pcs), item_category(fruir,vegetable), confidence_score}]" },
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: "image/jpeg",
                        },
                    },
                ],
                config: { responseMimeType: "application/json" }
            });

            const items: IdentifiedFoodItem[] = JSON.parse(response.text.trim());
            setIdentifiedItems(items);

        } catch (error) {
            console.error(error);
        } finally {
            setIsScanning(false);
        }
    };

const addToList = async () => {
        if (identifiedItems.length === 0) {
            Alert.alert("Empty List", "There are no items to add yet.");
            return;
        }
        
        try {
            await saveProducts(identifiedItems); 

            setIdentifiedItems([]);
            setImageUri(null); 

            Alert.alert("Saved!", "Items added to your list.");
            
        } catch (error) {
            console.error("Failed to save items:", error);
            Alert.alert("Error", "Failed to save items. Please try again.");
        }
    };

    const resetImage = () => {
        setImageUri(null);
        setBase64Image(null);
        setIdentifiedItems([]);
    };


    return (
        <View style={styles.container}>
            <Text style={styles.title}>Scan Food</Text>

            <View style={styles.cameraFrame}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : (
                    <View style={styles.cameraPlaceholder}>
                        <Text style={{ fontSize: 40, color: "#aaa" }}></Text>
                        <Text style={styles.placeholderText}>No Image Selected</Text>
                    </View>
                )}
            </View>

            {identifiedItems.length > 0 && (
                <View style={styles.resultsContainer}>
                    <Text style={styles.resultsTitle}>Identified Items</Text>
                <ScrollView style={{ maxHeight: 120 }}>
    {identifiedItems.map((item, index) => (
        <View key={index} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDetail}>
                    {item.quantity_estimate} {item.quantity_estimate_type} ({(item.confidence_score * 100).toFixed(0)}%)
                </Text>
            </View>
            <TouchableOpacity
                onPress={() => removeItem(index)}
                style={styles.deleteButton}
            >
                <Text style={styles.deleteButtonText}><Image style={styles.deleteIcon} source={deleteImg}/></Text>
            </TouchableOpacity>
        </View>
    ))}
</ScrollView>

                  

                </View>
            )}

            <View style={styles.buttonContainer}>
                    {identifiedItems.length > 0 ? (
                    <>
                        <TouchableOpacity style={[styles.button, styles.galleryButton]} onPress={resetImage}>
                            <Text style={styles.buttonText}>Retake</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, styles.cameraButton]} onPress={scanImage}>
                            <Text style={styles.buttonText}>Rescan</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, styles.scanButton]} onPress={addToList}>
                            <Text style={styles.buttonText}>Add to List</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <TouchableOpacity style={[styles.button, styles.cameraButton]} onPress={takePhoto}>
                            <Text style={styles.buttonText}>Take Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, styles.galleryButton]} onPress={pickImage}>
                            <Text style={styles.buttonText}>Upload</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.scanButton]}
                            onPress={scanImage}
                            disabled={!base64Image}
                        >
                            <Text style={styles.buttonText}>
                                {isScanning ? "Scanning..." : "Scan"}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: "#121212" },
    title: { fontSize: 26, fontWeight: "bold", textAlign: "left", color: "#f1f1f1ee", marginBottom: 20 },
    cameraFrame: {
        height: 300,
        backgroundColor: "#333",
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20
    },
    cameraPlaceholder: { alignItems: "center" },
    placeholderText: { color: "#aaa", marginTop: 8 },
    imagePreview: { width: "100%", height: "100%" },
    buttonContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 30 },
    button: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        marginHorizontal: 4,
        alignItems: "center"
    },
    cameraButton: { backgroundColor: "#4CAF50" },
    galleryButton: { backgroundColor: "#2196F3" },
    scanButton: { backgroundColor: "#FF9800" },
    buttonText: { color: "white", fontWeight: "bold" },
    resultsContainer: { backgroundColor: "#1E1E1E", padding: 15, borderRadius: 10 },
    resultsTitle: { color: "#4CAF50", fontSize: 18, marginBottom: 10 },

    itemName: { color: "white", fontSize: 16 },
    itemDetail: { color: "#ccc", fontSize: 14 },
itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#4caf4f71"
},
deleteButton: {
    padding: 4,
    marginLeft: 8,
},
deleteIcon: {

    width: 20,
    height: 20,
},

});
