import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
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
import { EXPIRES_SOON_DAYS, getExpirationDays } from '@/utils/date';

export default function MealsScreen() {
  const router = useRouter();
  const { products, settings } = useAppContext();
  const [suggestedMeals, setSuggestedMeals] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const lastGeneratedSignatureRef = useRef<string>('');

  // 1. Pre-filter out "To Buy", already-expired items, and items violating Vegetarian / Dairy / Allergen settings
  const eligibleProducts = useMemo(() => {
    return filterEligibleProducts(products, settings.aiPreferences);
  }, [products, settings.aiPreferences]);

  // Count expiring soon items among eligible products
  const expiringSoonProducts = useMemo(() => {
    return eligibleProducts.filter((item) => {
      const days = getExpirationDays(item.expirationDate);
      return days !== null && days >= 0 && days <= EXPIRES_SOON_DAYS;
    });
  }, [eligibleProducts]);

  // 2. Group into "URGENT - PRODUCTS ABOUT TO EXPIRE" and "OTHER AVAILABLE INGREDIENTS"
  const availableIngredients = useMemo(() => {
    return formatIngredientsForPrompt(eligibleProducts);
  }, [eligibleProducts]);

  const preferencePrompt = useMemo(() => {
    return buildPreferencePrompt(settings.aiPreferences);
  }, [settings.aiPreferences]);

  const openMealModal = (meal: Meal) => {
    setCheckedIngredients({});
    setCompletedSteps({});
    setSelectedMeal(meal);
  };

  const closeMealModal = () => {
    setSelectedMeal(null);
    setCheckedIngredients({});
    setCompletedSteps({});
  };

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Check if a recipe ingredient string mentions one of the user's expiring-soon items
  const isExpiringIngredient = useCallback(
    (ingredientLine: string) => {
      const lower = ingredientLine.toLowerCase();
      return expiringSoonProducts.some((p) => {
        const name = p.name.trim().toLowerCase();
        return name.length >= 3 && lower.includes(name);
      });
    },
    [expiringSoonProducts]
  );

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
        'Could Not Load Recipes',
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

  const activeDietaryBadges = useMemo(() => {
    const badges: { label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [];
    const prefs = settings.aiPreferences;
    if (prefs.isVegetarian) {
      badges.push({ icon: 'leaf-outline', label: 'Vegetarian' });
    }
    if (prefs.avoidDairy) {
      badges.push({ icon: 'water-outline', label: 'Dairy-Free' });
    }
    if (prefs.spiceLevel) {
      badges.push({ icon: 'flame-outline', label: prefs.spiceLevel });
    }
    if (prefs.allergens && prefs.allergens.trim().length > 0) {
      badges.push({ icon: 'shield-checkmark-outline', label: `No ${prefs.allergens.trim()}` });
    }
    return badges;
  }, [settings.aiPreferences]);

  const renderMealCard = ({ item }: { item: Meal }) => {
    const matchedUrgentCount = item.ingredients.filter((ing) => isExpiringIngredient(ing)).length;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => openMealModal(item)}
      >
        <View style={styles.cardTopRow}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.cardImage} />
          ) : (
            <View style={styles.cardPlaceholder}>
              <Ionicons name="restaurant-outline" size={26} color="#4CAF50" />
            </View>
          )}

          <View style={styles.cardBody}>
            {matchedUrgentCount > 0 && (
              <View style={styles.cardTagRow}>
                <View style={styles.urgentMatchBadge}>
                  <Ionicons name="time-outline" size={12} color="#FFB300" />
                  <Text style={styles.urgentMatchBadgeText}>
                    Uses {matchedUrgentCount} expiring item{matchedUrgentCount > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.name}
            </Text>

            <Text style={styles.cardMetaCount}>
              {item.ingredients.length} ingredients · {item.steps.length} steps
            </Text>
          </View>

          <View style={styles.cardChevronBox}>
            <Ionicons name="chevron-forward" size={18} color="#777777" />
          </View>
        </View>

        <View style={styles.cardMetricsRow}>
          <View style={styles.metricPill}>
            <Ionicons name="time-outline" size={14} color="#888888" />
            <Text style={styles.metricPillText}>
              {item.estimatedPreparationTime || '25 mins'}
            </Text>
          </View>

          <View style={styles.metricPill}>
            <Ionicons name="flame-outline" size={14} color="#888888" />
            <Text style={styles.metricPillText}>
              {item.calories ? `${item.calories} kcal` : '—'}
            </Text>
          </View>

          <View style={styles.metricPill}>
            <Ionicons name="barbell" size={14} color="#888888" />
            <Text style={styles.metricPillText}>
              {item.proteins ? `${item.proteins}g protein` : '—'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeaderContext = () => (
    <View style={styles.contextSection}>
      <View style={styles.inventorySummaryRow}>
        <View style={styles.summaryPill}>
          <Ionicons name="cube-outline" size={13} color="#4CAF50" />
          <Text style={styles.summaryPillText}>
            {eligibleProducts.length} Available
          </Text>
        </View>

        {expiringSoonProducts.length > 0 && (
          <View style={[styles.summaryPill, styles.summaryPillUrgent]}>
            <Ionicons name="alert-circle-outline" size={13} color="#FFB300" />
            <Text style={[styles.summaryPillText, { color: '#FFB300' }]}>
              {expiringSoonProducts.length} Expiring Soon
            </Text>
          </View>
        )}

        {activeDietaryBadges.map((badge, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.dietaryBadge}
            onPress={() => router.push('/pages/settings')}
            activeOpacity={0.75}
          >
            <Ionicons name={badge.icon} size={12} color="#888888" />
            <Text style={styles.dietaryBadgeText}>{badge.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerCard}>
          <View style={styles.loadingSpinnerBox}>
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
          <Text style={styles.loadingTitle}>RePlate AI is generating meal...</Text>
          <Text style={styles.loadingSubtitle}>
            Matching your available ingredients and preferences.
          </Text>
        </View>
      );
    }

    if (suggestedMeals.length === 0) {
      const hasInventory = Boolean(availableIngredients);
      return (
        <View style={styles.centerCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons
              name={hasInventory ? 'restaurant-outline' : 'basket-outline'}
              size={30}
              color="#4CAF50"
            />
          </View>
          <Text style={styles.emptyTitle}>
            {hasInventory ? 'No Recipes Loaded' : 'No Eligible Ingredients'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {hasInventory
              ? 'Tap below to get recipe ideas using the ingredients in your inventory.'
              : 'Add non-expired items to your inventory or update your dietary filters in Settings.'}
          </Text>
          {hasInventory ? (
            <TouchableOpacity
              onPress={generateMeals}
              style={styles.primaryCtaButton}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryCtaButtonText}>Get Recipes</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/add-food')}
              style={styles.primaryCtaButton}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryCtaButtonText}>Add Ingredients</Text>
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
        ListHeaderComponent={renderHeaderContext}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const checkedIngredientsCount = Object.values(checkedIngredients).filter(Boolean).length;
  const completedStepsCount = Object.values(completedSteps).filter(Boolean).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Suggested Meals</Text>
          <Text style={styles.subtitle}>Based on your current inventory</Text>
        </View>
        {suggestedMeals.length > 0 && !isLoading && (
          <TouchableOpacity
            onPress={generateMeals}
            style={styles.regenerateButton}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
            <Text style={styles.regenerateButtonText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>

      {suggestedMeals.length === 0 && renderHeaderContext()}
      {renderContent()}

      {/* Recipe Detail Bottom Sheet Modal */}
      <Modal
        visible={!!selectedMeal}
        transparent
        animationType="slide"
        onRequestClose={closeMealModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMealModal} />

          {selectedMeal && (
            <View style={styles.modalSheet}>
              <View style={styles.sheetHandle} />

              {/* Sheet Top Bar */}
              <View style={styles.sheetTopBar}>
                <View style={styles.sheetBadge}>
                  <Ionicons name="book-outline" size={13} color="#4CAF50" />
                  <Text style={styles.sheetBadgeText}>Recipe Details</Text>
                </View>

                <TouchableOpacity
                  style={styles.closeIconBtn}
                  onPress={closeMealModal}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={18} color="#999999" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetScrollContent}
              >
                {/* Hero Banner / Image */}
                <View style={styles.heroImageContainer}>
                  {selectedMeal.image ? (
                    <Image source={{ uri: selectedMeal.image }} style={styles.heroImage} />
                  ) : (
                    <View style={styles.heroPlaceholder}>
                      <Ionicons name="restaurant-outline" size={40} color="#4CAF50" />
                    </View>
                  )}
                </View>

                {/* Recipe Title */}
                <Text style={styles.sheetMealTitle}>{selectedMeal.name}</Text>

                {/* 3-Column Quick Stats Grid */}
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Ionicons name="time-outline" size={18} color="#4CAF50" />
                    <Text style={styles.statValue}>
                      {selectedMeal.estimatedPreparationTime || '25 mins'}
                    </Text>
                    <Text style={styles.statLabel}>Prep Time</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Ionicons name="flame-outline" size={18} color="#4CAF50" />
                    <Text style={styles.statValue}>
                      {selectedMeal.calories ? `${selectedMeal.calories}` : '—'}
                    </Text>
                    <Text style={styles.statLabel}>Calories</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Ionicons name="barbell-outline" size={18} color="#4CAF50" />
                    <Text style={styles.statValue}>
                      {selectedMeal.proteins ? `${selectedMeal.proteins}g` : '—'}
                    </Text>
                    <Text style={styles.statLabel}>Protein</Text>
                  </View>
                </View>

                {/* Interactive Ingredients Checklist */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <View>
                      <Text style={styles.sectionTitle}>INGREDIENTS</Text>
                      <Text style={styles.sectionHint}>Tap to check off items</Text>
                    </View>
                    <View style={styles.progressBadge}>
                      <Text style={styles.progressBadgeText}>
                        {checkedIngredientsCount}/{selectedMeal.ingredients.length}
                      </Text>
                    </View>
                  </View>

                  {selectedMeal.ingredients.map((ing, idx) => {
                    const isChecked = !!checkedIngredients[idx];
                    const urgentMatch = isExpiringIngredient(ing);

                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.ingredientRow,
                          isChecked && styles.ingredientRowChecked,
                        ]}
                        onPress={() => toggleIngredient(idx)}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.checkboxCircle,
                            isChecked && styles.checkboxCircleChecked,
                          ]}
                        >
                          {isChecked && (
                            <Ionicons name="checkmark" size={14} color="#000000" />
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.ingredientText,
                              isChecked && styles.ingredientTextChecked,
                            ]}
                          >
                            {ing}
                          </Text>
                          {urgentMatch && (
                            <View style={styles.ingredientUrgentTag}>
                              <Ionicons name="time-outline" size={11} color="#FFB300" />
                              <Text style={styles.ingredientUrgentTagText}>
                                Expiring soon in inventory
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Interactive Cooking Steps */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <View>
                      <Text style={styles.sectionTitle}>STEPS</Text>
                      <Text style={styles.sectionHint}>Tap a step when completed</Text>
                    </View>
                    <View style={styles.progressBadge}>
                      <Text style={styles.progressBadgeText}>
                        {completedStepsCount}/{selectedMeal.steps.length}
                      </Text>
                    </View>
                  </View>

                  {selectedMeal.steps.map((step, idx) => {
                    const isDone = !!completedSteps[idx];
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.stepCard, isDone && styles.stepCardDone]}
                        onPress={() => toggleStep(idx)}
                        activeOpacity={0.8}
                      >
                        <View
                          style={[
                            styles.stepNumberBadge,
                            isDone && styles.stepNumberBadgeDone,
                          ]}
                        >
                          {isDone ? (
                            <Ionicons name="checkmark" size={14} color="#000000" />
                          ) : (
                            <Text style={styles.stepNumberText}>{idx + 1}</Text>
                          )}
                        </View>

                        <Text style={[styles.stepText, isDone && styles.stepTextDone]}>
                          {step}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Bottom Action Row */}
                <View style={styles.sheetFooterRow}>
                  {(checkedIngredientsCount > 0 || completedStepsCount > 0) && (
                    <TouchableOpacity
                      style={styles.resetProgressButton}
                      onPress={() => {
                        setCheckedIngredients({});
                        setCompletedSteps({});
                      }}
                    >
                      <Text style={styles.resetProgressText}>Reset</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.doneModalButton}
                    onPress={closeMealModal}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.doneModalButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  regenerateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  contextSection: {
    marginBottom: 14,
  },
  inventorySummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  summaryPillUrgent: {
    backgroundColor: 'rgba(255, 179, 0, 0.08)',
    borderColor: 'rgba(255, 179, 0, 0.3)',
  },
  summaryPillText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
  },
  dietaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
  },
  dietaryBadgeText: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 28,
  },
  card: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: '#0A0A0A',
  },
  cardPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#242424',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTagRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  urgentMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.3)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  urgentMatchBadgeText: {
    color: '#FFB300',
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  cardMetaCount: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
    fontWeight: '500',
  },
  cardChevronBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  cardMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
  },
  metricPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 5,
  },
  metricPillText: {
    color: '#BBBBBB',
    fontSize: 12,
    fontWeight: '600',
  },
  centerCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingSpinnerBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  primaryCtaButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  // Modal Bottom Sheet Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: '#242424',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333333',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sheetBadgeText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '700',
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScrollContent: {
    paddingBottom: 34,
  },
  heroImageContainer: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#242424',
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  sheetMealTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242424',
    gap: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  statLabel: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
    letterSpacing: 0.7,
  },
  sectionHint: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  progressBadge: {
    backgroundColor: '#141414',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242424',
  },
  progressBadgeText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '700',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#141414',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222222',
    gap: 12,
  },
  ingredientRowChecked: {
    backgroundColor: 'rgba(76, 175, 80, 0.06)',
    borderColor: 'rgba(76, 175, 80, 0.25)',
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#444444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  ingredientText: {
    color: '#EEEEEE',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  ingredientTextChecked: {
    color: '#666666',
    textDecorationLine: 'line-through',
  },
  ingredientUrgentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 4,
  },
  ingredientUrgentTagText: {
    color: '#FFB300',
    fontSize: 10,
    fontWeight: '600',
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222222',
    gap: 12,
  },
  stepCardDone: {
    backgroundColor: 'rgba(76, 175, 80, 0.06)',
    borderColor: 'rgba(76, 175, 80, 0.25)',
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#2C2C2C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberBadgeDone: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  stepNumberText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    color: '#DDDDDD',
    fontSize: 14,
    lineHeight: 20,
  },
  stepTextDone: {
    color: '#666666',
    textDecorationLine: 'line-through',
  },
  sheetFooterRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  resetProgressButton: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#242424',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetProgressText: {
    color: '#BBBBBB',
    fontSize: 14,
    fontWeight: '700',
  },
  doneModalButton: {
    flex: 1.5,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneModalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
