import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  SafeAreaView 
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; 


const TEAM_MEMBERS = [
  { name: 'Ugur Sadixli', title: 'CEO & Founder', icon: 'star-outline' },

];

const AboutUs: React.FC = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Our Story</Text>
          <Text style={styles.subtitle}>Building a brighter future, one step at a time.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Our Mission</Text>
          <Text style={styles.bodyText}>
           Our mission at Replate is to help people take control of their food, reduce waste, and make smarter decisions every day through the power of AI.
           Replate was created to transform the way you manage food at home — by giving you a smart, intuitive system that tracks your ingredients, monitors expiration dates,
           and recommends meals based on what you already have.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meet the Team</Text>
          
          {TEAM_MEMBERS.map((member, index) => (
            <View key={index} style={styles.teamCard}>
              <Ionicons name={member.icon as any} size={30} color="#FFFFFF" style={styles.teamIcon} />
              <View style={styles.teamDetails}>
                <Text style={styles.teamName}>{member.name}</Text>
                <Text style={styles.teamTitle}>{member.title}</Text>
              </View>
            </View>
          ))}


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
  },
  
  valueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  valueIcon: {
    marginRight: 10,
  },
  valueText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },


  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C', 
    borderRadius: 10,
    marginBottom: 10,
  },
  teamIcon: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    padding: 5,
    marginRight: 15,
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  teamTitle: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  
  contactButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AboutUs;