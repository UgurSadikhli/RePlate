import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '@/context/AppContext';
import {
  buildPreferencePrompt,
  filterEligibleProducts,
  formatIngredientsForPrompt,
  generateMealsWithGroq,
  Meal,
} from '@/services/ai';

export default function MealsScreen() {
  const { products, settings } = useAppContext();
  const [suggestedMeals, setSuggestedMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const lastGeneratedSignatureRef = useRef<string>('');

  // 1. Pre-filter out "To Buy", already-expired items, and items violating Vegetarian / Dairy / Allergen settings
  const eligibleProducts = useMemo(() => {
    return filterEligibleProducts(products, settings.aiPreferences);
  }, [products, settings.aiPreferences]);

  // 2. Group into "URGENT - PRODUCTS ABOUT TO EXPIRE" and "OTHER AVAILABLE INGREDIENTS"
  const availableIngredients = useMemo(() => {
    return formatIngredientsForPrompt(eligibleProducts);
  }, [eligibleProducts]);

  const preferencePrompt = useMemo(() => {
    return buildPreferencePrompt(settings.aiPreferences);
  }, [settings.aiPreferences]);

  const generateMeals = useCallback(async () => {
    if (!availableIngredients) {
      Alert.alert(
        'No Eligible Ingredients',
        'No non-expired ingredients match your current dietary preferences and allergen settings.'
      );
      return;
    }

    setSuggestedMeals([]);
    setIsLoading(true);

    try {
      const meals = await generateMealsWithGroq(availableIngredients, preferencePrompt);
      setSuggestedMeals(meals);
      lastGeneratedSignatureRef.current = `${availableIngredients}||${preferencePrompt}`;
    } catch (error: any) {
      console.error('Groq API Error:', error);
      Alert.alert(
        'AI Error',
        error?.message ||
          'Could not fetch meal suggestions. Check EXPO_PUBLIC_GROQ_API_KEY in your .env file.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [availableIngredients, preferencePrompt]);

  // Auto-generate when inventory or dietary settings change, but not on redundant tab switches
  useEffect(() => {
    const currentSignature = `${availableIngredients}||${preferencePrompt}`;
    if (
      availableIngredients &&
      !isLoading &&
      lastGeneratedSignatureRef.current !== currentSignature
    ) {
      lastGeneratedSignatureRef.current = currentSignature;
      generateMeals();
    }
  }, [availableIngredients, preferencePrompt, isLoading, generateMeals]);

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
          {item.calories ? `${item.calories} cal | ` : ''}
          {item.proteins ? `${item.proteins}g protein | ` : ''}
          {item.estimatedPreparationTime ? `${item.estimatedPreparationTime}` : ''}
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
            Generating meal ideas based on your eligible ingredients...
          </Text>
        </View>
      );
    }

    if (suggestedMeals.length === 0) {
      const hasInventory = Boolean(availableIngredients);
      const message = !hasInventory
        ? 'No eligible, non-expired ingredients found matching your dietary settings.'
        : 'No meals suggested yet. Tap below to generate recipes.';

      return (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{message}</Text>
          {hasInventory && (
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
    <SafeAreaView style={styles.container} edges={['top']}>
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
                    { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
                  ]}
                >
                  {selectedMeal.image ? (
                    <Image
                      source={{ uri: selectedMeal.image }}
                      style={{ width: '100%', height: '100%', borderRadius: 10 }}
                    />
                  ) : (
                    <Text style={{ fontSize: 50 }}>🍽️</Text>
                  )}
                </View>

                <Text style={styles.subTitle}>Nutritional Info</Text>
                <Text style={styles.modalText}>
                  Calories: {selectedMeal.calories || 'N/A'} | Protein:{' '}
                  {selectedMeal.proteins ? `${selectedMeal.proteins}g` : 'N/A'} | Time:{' '}
                  {selectedMeal.estimatedPreparationTime || 'N/A'}
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
    </SafeAreaView>
  );
}

const COLOR_PRIMARY = '#4CAF50';
const COLOR_BACKGROUND = '#000000ff';
const COLOR_CARD = '#1E1E1E';
const COLOR_TEXT_LIGHT = '#f1f1f1ee';
const COLOR_TEXT_MUTED = '#B0B0B0';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_BACKGROUND, padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'left', color: COLOR_TEXT_LIGHT },
  generateButton: {
    backgroundColor: COLOR_PRIMARY,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  generateButtonText: { color: COLOR_BACKGROUND, fontWeight: 'bold', fontSize: 14 },
  card: {
    backgroundColor: COLOR_CARD,
    marginBottom: 14,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
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
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: COLOR_TEXT_LIGHT },
  cardSubtitle: { fontSize: 14, color: COLOR_TEXT_MUTED, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: COLOR_CARD,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: COLOR_TEXT_LIGHT },
  modalImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 16 },
  modalText: { color: COLOR_TEXT_LIGHT, fontSize: 15 },
  subTitle: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 6, color: COLOR_PRIMARY },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: COLOR_TEXT_MUTED, fontSize: 16 },
  emptyText: { fontSize: 16, textAlign: 'center', color: COLOR_TEXT_MUTED, marginBottom: 20 },
  primaryButton: {
    backgroundColor: COLOR_PRIMARY,
    marginTop: 25,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: COLOR_BACKGROUND, fontWeight: '800', fontSize: 16 },
});
