import { GoogleGenAI } from "@google/genai";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { loadProducts } from "../storage/productStorage";
import { loadSetting } from "../storage/settingStorage";

const ai = new GoogleGenAI({ apiKey: "AIzaSyAtqX3GO9xQb8V5XBa2Bw--l-twC-orhR0" }); 
import { useFocusEffect } from "@react-navigation/native";

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
  estimatedPreparationTime: string;
}

interface Settings {
  aiPreferences: {
    isVegetarian: boolean;
    avoidDairy: boolean;
    spiceLevel: string;
    allergens: string;
  };
}

const INITIAL_SETTINGS: Settings = {
  aiPreferences: {
    isVegetarian: false,
    avoidDairy: false,
    spiceLevel: "medium",
    allergens: "",
  },
};

export default function MealsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
  const [suggestedMeals, setSuggestedMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);

useFocusEffect(
  React.useCallback(() => {
    const fetchData = async () => {
      try {
        const storedProducts = await loadProducts();
        setProducts(storedProducts);

        const storedSettings = await loadSetting();
        if (storedSettings) {
          setSettings({
            ...INITIAL_SETTINGS,
            ...storedSettings,
            aiPreferences: {
              ...INITIAL_SETTINGS.aiPreferences,
              ...(storedSettings.aiPreferences || {}),
            },
          });
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };

    fetchData();
  }, [])
);

  // Compute available ingredients
  const availableIngredients = useMemo(() => {
    return products
      .filter((p) => !p.toBuy)
      .map((p) => `${p.name} (${p.quantity} ${p.quantityType})`)
      .join(", ");
  }, [products]);

  // Create AI preference prompt
  const createPreferencePrompt = (prefs: Settings["aiPreferences"]): string => {
    const header = "\n**User Preferences & Restrictions:**\n";
    let prompt = header;

    if (prefs.isVegetarian) {
      prompt += "- STRICTLY exclude all meat, poultry, and fish. User is vegetarian.\n";
    }

    if (prefs.avoidDairy) {
      prompt += "- Avoid all dairy products (milk, butter, cheese, cream).\n";
    }

    if (prefs.allergens && prefs.allergens.trim() !== "") {
      prompt += `- STRICTLY exclude the following ingredients due to allergies: ${prefs.allergens}.\n`;
    }

    if (prefs.spiceLevel && prefs.spiceLevel.toLowerCase() !== "medium") {
      prompt += `- The preferred maximum spice level is ${prefs.spiceLevel.toUpperCase()}. ADJUST RECIPES ACCORDINGLY.\n`;
    }

    if (prompt === header) {
      prompt += "- No special preferences or restrictions set.\n";
    }

    return prompt;
  };

  // Fetch image from Unsplash
  const fetchUnsplashImage = async (mealName: string): Promise<string> => {
    try {
      const response = await fetch(
        `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
          mealName
        )}&orientation=landscape&client_id=ucLoht6_G-Ejw7LQvx7nQFGMQCh_OR2-HbgQDRgmJfU`
      );
      const data = await response.json();
      return data.urls?.small || "https://via.placeholder.com/400x300?text=Meal";
    } catch {
      return "https://via.placeholder.com/400x300?text=Meal";
    }
  };

  // Generate meals using AI
  const generateMeals = async () => {
    if (!availableIngredients) {
      Alert.alert(
        "No Ingredients",
        "Please add some available products (not marked 'To Buy') to your inventory first."
      );
      return;
    }

    setSuggestedMeals([]);
    setIsLoading(true);

    const preferencePrompt = createPreferencePrompt(settings.aiPreferences);

    // console.log("Generating meals with preferences:", preferencePrompt);

    const prompt = `Based on the following available ingredients, suggest 6-8 quick and easy meal recipes.
RESTRICTIONS:
${preferencePrompt}

Available ingredients:
${availableIngredients}

Return as JSON array of Meal objects (no explanation, no markdown):
interface Meal {
  name: string;
  image?: string;
  ingredients: string[];
  steps: string[];
  calories: number; 
  proteins: number; 
  estimatedPreparationTime: string;
}`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const jsonString = response.text.trim();
      let meals: Meal[] = JSON.parse(jsonString);

      meals = await Promise.all(
        meals.map(async (meal) => ({
          ...meal,
          image: await fetchUnsplashImage(meal.name),
        }))
      );

      setSuggestedMeals(meals);
    } catch (error) {
      console.error("Gemini API Error:", error);
      Alert.alert(
        "API Error",
        "Could not fetch meal suggestions. Check your API key and network connection."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate meals when ingredients or settings are ready
  useEffect(() => {
    if (availableIngredients && products.length > 0 && settings) {
      generateMeals();
    }
  }, [availableIngredients, products, settings]);

  // Render a single meal card
  const renderMealCard = ({ item }: { item: Meal }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelectedMeal(item)}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.cardImage} />
      ) : (
        <View style={styles.cardPlaceholder}>
          <Text style={{ fontSize: 24 }}>🍽️</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>
          {item.calories ? `${item.calories} cal | ` : ""}
          {item.proteins ? `${item.proteins}g protein | ` : ""}
          {item.estimatedPreparationTime ? `${item.estimatedPreparationTime}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>
            Generating meal ideas based on your food list...
          </Text>
        </View>
      );
    }

    if (suggestedMeals.length === 0 && !isLoading) {
      const message =
        products.length === 0
          ? "Your inventory is empty! Add some products to get meal ideas."
          : "No meals suggested yet. Tap below to generate recipes.";

      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{message}</Text>
          {products.length > 0 && (
            <TouchableOpacity
              onPress={generateMeals}
              style={[styles.primaryButton, { marginTop: 30 }]}
            >
              <Text style={styles.buttonText}>Generate Meals Now</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <FlatList
        data={suggestedMeals}
        renderItem={renderMealCard}
        keyExtractor={(item, index) => item.name + index}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Suggested Meals</Text>
        {suggestedMeals.length > 0 && !isLoading && (
          <TouchableOpacity onPress={generateMeals} style={styles.generateButton}>
            <Text style={styles.generateButtonText}>New Meals</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderContent()}

      <Modal
        visible={!!selectedMeal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedMeal(null)}
      >
        <View style={styles.modalOverlay}>
          {selectedMeal && (
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{selectedMeal.name}</Text>

                <View
                  style={[
                    styles.modalImage,
                    { backgroundColor: "#333", justifyContent: "center", alignItems: "center" },
                  ]}
                >
                  {selectedMeal.image ? (
                    <Image
                      source={{ uri: selectedMeal.image }}
                      style={{ width: "100%", height: "100%", borderRadius: 10 }}
                    />
                  ) : (
                    <Text style={{ fontSize: 50 }}>🍽️</Text>
                  )}
                </View>

                <Text style={styles.subTitle}>Nutritional Info</Text>
                <Text style={styles.modalText}>
                  Calories: {selectedMeal.calories || "N/A"} | Protein:{" "}
                  {selectedMeal.proteins ? `${selectedMeal.proteins}g` : "N/A"} | Time:{" "}
                  {selectedMeal.estimatedPreparationTime || "N/A"}
                </Text>

                <Text style={styles.subTitle}>Ingredients</Text>
                <View style={{ marginBottom: 10 }}>
                  {selectedMeal.ingredients.map((ing, index) => (
                    <Text key={index} style={styles.modalText}>
                      • {ing}
                    </Text>
                  ))}
                </View>

                <Text style={styles.subTitle}>Steps</Text>
                <View>
                  {selectedMeal.steps.map((step, index) => (
                    <Text key={index} style={[styles.modalText, { marginBottom: 4 }]}>
                      {index + 1}) {step}
                    </Text>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setSelectedMeal(null)}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ----- Styles -----
const COLOR_PRIMARY = "#4CAF50";
const COLOR_BACKGROUND = "#000000ff";
const COLOR_CARD = "#1E1E1E";
const COLOR_TEXT_LIGHT = "#f1f1f1ee";
const COLOR_TEXT_MUTED = "#B0B0B0";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_BACKGROUND, padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: "bold", textAlign: "left", color: COLOR_TEXT_LIGHT },
  generateButton: {
    backgroundColor: COLOR_PRIMARY,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  generateButtonText: { color: COLOR_BACKGROUND, fontWeight: "bold", fontSize: 14 },
  card: {
    backgroundColor: COLOR_CARD,
    marginBottom: 14,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  cardImage: { width: 70, height: 70, borderRadius: 12, marginRight: 16 },
  cardPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: "600", color: COLOR_TEXT_LIGHT },
  cardSubtitle: { fontSize: 14, color: COLOR_TEXT_MUTED, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "90%", maxHeight: "90%", backgroundColor: COLOR_CARD, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 24, fontWeight: "bold", marginBottom: 16, color: COLOR_TEXT_LIGHT },
  modalImage: { width: "100%", height: 180, borderRadius: 12, marginBottom: 16 },
  modalText: { color: COLOR_TEXT_LIGHT, fontSize: 15 },
  subTitle: { fontSize: 18, fontWeight: "700", marginTop: 12, marginBottom: 6, color: COLOR_PRIMARY },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: COLOR_TEXT_MUTED, fontSize: 16 },
  emptyText: { fontSize: 16, textAlign: "center", color: COLOR_TEXT_MUTED, marginBottom: 20 },
  primaryButton: { backgroundColor: COLOR_PRIMARY, marginTop: 25, padding: 14, borderRadius: 12, alignItems: "center" },
  buttonText: { color: COLOR_BACKGROUND, fontWeight: "800", fontSize: 16 },
});
