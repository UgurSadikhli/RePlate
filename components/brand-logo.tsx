import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md' }) => {
  const iconBoxSize = size === 'sm' ? 28 : size === 'lg' ? 40 : 34;
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 19;
  const fontSize = size === 'sm' ? 18 : size === 'lg' ? 26 : 22;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconBadge,
          {
            width: iconBoxSize,
            height: iconBoxSize,
            borderRadius: iconBoxSize * 0.3,
          },
        ]}
      >
        <Ionicons name="restaurant" size={iconSize} color="#4CAF50" />
      </View>
      <Text style={[styles.brandText, { fontSize }]}>
        Re<Text style={styles.brandAccent}>Plate</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  iconBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  brandAccent: {
    color: '#4CAF50',
  },
});
