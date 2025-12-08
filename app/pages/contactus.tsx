import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView, 
  Linking // Used to open external links (like email)
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; 

// Contact Details
const CONTACT_DETAILS = {
  email: 'andrewmart1545@gmail.com',
  phone: 'not available yet', 
//   address: '123 Smart Kitchen St, Expo City, RN 50000', 
  social: 'ReplateApp', 
};

// Function to handle opening the email client
const handleEmailPress = () => {
  const url = `mailto:${CONTACT_DETAILS.email}?subject=Support Request from Replate App`;
  Linking.openURL(url).catch((err) => console.error("Could not open mail client", err));
};


const ContactUs: React.FC = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Get In Touch</Text>
          <Text style={styles.subtitle}>We're here to help you reduce food waste.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send Us a Message</Text>
          <Text style={styles.bodyText}>
            The best way to reach our support team is by email. We aim to respond within 24 hours.
          </Text>
          
          {/* Main Contact Button */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleEmailPress}
          >
            <Ionicons name="mail-outline" size={20} color="#000000" />
            <Text style={styles.actionButtonText}>Email Support</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Ways to Connect</Text>
          
          <View style={styles.contactDetailItem}>
            <Ionicons name="at-circle-outline" size={20} color="#4CAF50" style={styles.detailIcon} />
            <View>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{CONTACT_DETAILS.email}</Text>
            </View>
          </View>
          
          <View style={styles.contactDetailItem}>
            <Ionicons name="call-outline" size={20} color="#4CAF50" style={styles.detailIcon} />
            <View>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{CONTACT_DETAILS.phone}</Text>
            </View>
          </View>
          
          {/* <View style={styles.contactDetailItem}>
            <Ionicons name="location-outline" size={20} color="#4CAF50" style={styles.detailIcon} />
            <View>
              <Text style={styles.detailLabel}>Office</Text>
              <Text style={styles.detailValue}>{CONTACT_DETAILS.address}</Text>
            </View>
          </View> */}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// --- Stylesheet ---
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
  
  // Header styles (from your previous components)
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
    marginBottom: 20,
  },

  // NEW STYLES for Contact Details
  contactDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C', 
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  detailIcon: {
    marginRight: 15,
    padding: 5,
    borderRadius: 5,
  },
  detailLabel: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  // Action Button (Email Button)
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

export default ContactUs;