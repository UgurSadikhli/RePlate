import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity 
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; 

// Current date for versioning (Good practice)
const LAST_UPDATED = "December 8, 2025";

const PrivacyPolicy: React.FC = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.subtitle}>Last Updated: {LAST_UPDATED}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Our Commitment to Privacy</Text>
          <Text style={styles.bodyText}>
            Replate is dedicated to protecting your privacy. This policy explains what information we collect, how we use it, and your rights regarding that information. By using the Replate application, you consent to the data practices described in this policy.
          </Text>
        </View>

        {/* --- Section: Information We Collect --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Collection & Use</Text>
          
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Personal Information</Text>
            <Text style={styles.detailBody}>
              We collect information you directly provide, the photo of scaning items is not saved to our remote data bases or your local device.
            </Text>
          </View>
          
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Inventory Data</Text>
            <Text style={styles.detailBody}>
              Information about your food items (type, quantity, expiration date, price) is stored securely in your device. This data is **anonymized** and used solely to power the AI meal recommendations, track waste reduction goals, and provide personalized alerts.
            </Text>
          </View>
          
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Usage Data</Text>
            <Text style={styles.detailBody}>
              We track basic app usage (e.g., screens visited, features used) to improve the app's performance and user experience. This data is aggregated and does not identify you personally.
            </Text>
          </View>
        </View>

        {/* --- Section: Data Security and Rights --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security and Your Rights</Text>
          
          <Text style={styles.bodyText}>
            We implement industry-standard security measures to protect your data. You have the right to access, update, or request deletion of your personal data at any time via your account settings or by contacting us.
          </Text>
          
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
    marginBottom: 15,
  },


  detailCard: {
    backgroundColor: '#1C1C1C', 
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50', 
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  detailBody: {
    fontSize: 15,
    color: '#E0E0E0',
    lineHeight: 22,
  },

  actionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  actionButtonText: {
    color: '#000000', 
    fontSize: 18,
    fontWeight: '700',
  },
});

export default PrivacyPolicy;