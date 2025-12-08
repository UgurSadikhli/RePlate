import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView 
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; 

const USAGE_STEPS = [
  { 
    title: '1. Scan & Track Inventory', 
    icon: 'scan-circle-outline', 
    description: 'Quickly add items to your virtual fridge or pantry by scanning items or manually entering the details. Set initial quantity and price.' 
  },
  { 
    title: '2. Set Expiration Alerts', 
    icon: 'alarm-outline', 
    description: 'As you add items, set an expiration date. Replate will notify you 3 days before any item expires, ensuring zero waste.' 
  },
  { 
    title: '3. Get Smart Meal Ideas', 
    icon: 'restaurant-outline', 
    description: 'Based on what you currently have in stock, Replate’s AI instantly suggests recipes you can cook right now.' 
  },
  { 
    title: '4. Plan Your Shopping List', 
    icon: 'cart-outline', 
    description: 'Instantly add missing ingredients to your shopping list. Keep your list organized and accessible.' 
  },
];

const STATUS_CARDS = [
  { 
    color: '#00BCD4', 
    icon: 'basket-outline', 
    title: 'To Buy', 
    description: 'This item is on your shopping list. It is ignored by the AI for meal suggestions.' 
  },
  { 
    color: '#ffd103ff', 
    icon: 'time-outline', 
    title: 'In Progress', 
    description: 'The item has been added, but critical information is missing (Expiration Date, Price, Quantity/Type). AI may use it for meal ideas, but NO expiration alerts will be sent.',
  },
  { 
    color: '#4CAF50', 
    icon: 'checkmark-circle-outline', 
    title: 'Active / Ready', 
    description: 'The item is fully set up. It is included in AI meal planning, and you WILL receive notifications when the food is going to expire soon.' 
  },
];


const HowToUse: React.FC = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.title}>How to Use Replate</Text>
          <Text style={styles.subtitle}>Your guide to smarter food management.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Getting Started</Text>
          <Text style={styles.bodyText}>
            Replate is designed to be intuitive, but mastering these four core features will maximize your food savings and minimize waste.
          </Text>
        </View>

        <View style={styles.stepsSection}>
          {USAGE_STEPS.map((step, index) => (
            <View key={index} style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <Ionicons name={step.icon as any} size={24} color="#4CAF50" />
                <Text style={styles.stepTitle}>{step.title}</Text>
              </View>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          ))}
        </View>
        

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item Status Key</Text>
          <Text style={styles.bodyText}>
            Item cards change color based on their status in your inventory. Green means go!
          </Text>
          
          {STATUS_CARDS.map((card, index) => (
            <View key={index} style={[styles.statusCard, { borderLeftColor: card.color }]}>
              <View style={styles.cardHeader}>
                <Ionicons name={card.icon as any} size={24} color={card.color} style={styles.cardIcon} />
                <Text style={[styles.cardTitle, { color: card.color }]}>{card.title}</Text>
              </View>
              <Text style={styles.cardDescription}>{card.description}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dashboard Metrics</Text>
          <Text style={styles.bodyText}>
            Your main dashboard provides insight into your food habits and spending:
          </Text>
          
          <View style={styles.metricContainer}>
            <Text style={styles.metricItem}>
              <Ionicons name="funnel-outline" size={16} color="#4CAF50" /> **All Items:** The total count of items across all status types.
            </Text>
            <Text style={styles.metricItem}>
              <Ionicons name="time-outline" size={16} color="#FFEB3B" /> **In Progress:** Items awaiting full details (Expiration, Price, Quantity).
            </Text>
            <Text style={styles.metricItem}>
              <Ionicons name="alert-circle-outline" size={16} color="#E91E63" /> **Expire Soon:** Active items approaching expiration (within 3 days).
            </Text>
            <Text style={styles.metricItem}>
              <Ionicons name="cash-outline" size={16} color="#E91E63" /> **Monthly Expenditure:** Total money spent on new items this month.
            </Text>
            <Text style={styles.metricItem}>
              <Ionicons name="archive-outline" size={16} color="#4CAF50" /> **Monthly Acquired:** The number of items moved to the fully Active status this month.
            </Text>
          </View>
          
     
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000', 
  },
  container: {
    padding: 20,
    backgroundColor: '#000000', 
    paddingBottom: 40,
  },
  
  header: {
    marginBottom: 30,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#4CAF5050', 
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#AAAAAA',
  },
  
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#4CAF50', 
    marginBottom: 15,
  },
  bodyText: {
    fontSize: 16,
    color: '#E0E0E0',
    lineHeight: 24,
    marginBottom: 10, 
  },


  stepsSection: {
    marginBottom: 30,
  },
  stepCard: {
    backgroundColor: '#1C1C1C', 
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50', 
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  stepDescription: {
    fontSize: 15,
    color: '#AAAAAA',
    lineHeight: 22,
  },
  
  statusCard: {
    backgroundColor: '#1C1C1C', 
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4, 
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 15,
    color: '#E0E0E0',
    lineHeight: 22,
  },
  
  metricContainer: {
    backgroundColor: '#1C1C1C', 
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  metricItem: {
    fontSize: 15,
    color: '#E0E0E0',
    lineHeight: 24,
    marginBottom: 5,
  },


  actionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#000000', 
    fontSize: 18,
    fontWeight: '700',
  },
});

export default HowToUse;