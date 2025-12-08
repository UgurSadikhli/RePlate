import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; 

// Current date for versioning
const EFFECTIVE_DATE = "December 8, 2025";
const COMPANY_NAME = "Replate Technologies Inc.";

const TermsOfService: React.FC = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.subtitle}>Effective Date: {EFFECTIVE_DATE}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤝 Acceptance of Terms</Text>
          <Text style={styles.bodyText}>
            By accessing or using the Replate mobile application (the "Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the Service. These terms govern your use of the Service provided by {COMPANY_NAME}.
          </Text>
        </View>

        {/* --- Section: User Rights and Restrictions --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account and Usage Rules</Text>
          
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}><Ionicons name="license-outline" size={16} color="#FFFFFF" /> License to Use</Text>
            <Text style={styles.detailBody}>
              {COMPANY_NAME} grants you a limited, non-exclusive, non-transferable, revocable license to use the Service solely for personal, non-commercial purposes in accordance with these Terms.
            </Text>
          </View>
          
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}><Ionicons name="close-circle-outline" size={16} color="#FFFFFF" /> Prohibited Conduct</Text>
            <Text style={styles.detailBody}>
              You agree not to misuse the Service. Prohibited actions include: reverse engineering the app, attempting unauthorized data collection, spamming, harassment, or using the Service for any unlawful purpose.
            </Text>
          </View>
          
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}><Ionicons name="trash-outline" size={16} color="#FFFFFF" /> Termination</Text>
            <Text style={styles.detailBody}>
              We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </Text>
          </View>
        </View>
        
        {/* --- Section: Intellectual Property & Disclaimers --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal & Financial Clauses</Text>
          
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}><Ionicons name="bulb-outline" size={16} color="#FFFFFF" /> Intellectual Property</Text>
            <Text style={styles.detailBody}>
              The Service and its original content (excluding your food data and user submissions) are and will remain the exclusive property of {COMPANY_NAME} and its licensors. Our trademarks may not be used without prior written consent.
            </Text>
          </View>
          
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}><Ionicons name="alert-circle-outline" size={16} color="#FFFFFF" /> Disclaimer of Warranty</Text>
            <Text style={styles.detailBody}>
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis. {COMPANY_NAME} makes no warranties, expressed or implied, that the Service will be uninterrupted, secure, or free from errors or viruses.
            </Text>
          </View>
          
          {/* <View style={styles.detailCard}>
            <Text style={styles.detailTitle}><Ionicons name="cut-outline" size={16} color="#FFFFFF" /> Governing Law</Text>
            <Text style={styles.detailBody}>
              These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction, e.g., the State of California], without regard to its conflict of law provisions.
            </Text>
          </View> */}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to Terms</Text>
          <Text style={styles.bodyText}>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
          </Text>
        </View>
        


      </ScrollView>
    </SafeAreaView>
  );
};

// --- Stylesheet (Consistent with previous components) ---
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
  
  // Header styles
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
  
  // General Section styles
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
    marginBottom: 5,
  },

  // Detail Cards (used for key clauses)
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailBody: {
    fontSize: 15,
    color: '#E0E0E0',
    lineHeight: 22,
  },
  
  // New style for hyperlink text
  linkText: {
    color: '#4CAF50', // Use branding color for links
    textDecorationLine: 'underline',
    fontWeight: '700',
  }
});

export default TermsOfService;