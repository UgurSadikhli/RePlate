import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import React from 'react';
import { ColorValue, OpaqueColorValue, StyleProp, TextStyle } from 'react-native';

const MAPPING: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'list.bullet': 'format-list-bulleted',
  'plus.circle.fill': 'add-circle',
  'diamond.fill': 'add-box',
  'book.fill': 'menu-book',
  'barcode': 'qr-code-scanner',
  'barcode.viewfinder': 'qr-code-scanner',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'sparkles': 'auto-awesome',
  'camera.fill': 'photo-camera',
  'photo.fill': 'photo-library',
  'calendar': 'calendar-today',
  'pencil': 'edit',
  'trash': 'delete',
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: string;
  size?: number;
  color: string | OpaqueColorValue | ColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const mappedName = MAPPING[name] ?? (name as React.ComponentProps<typeof MaterialIcons>['name']);
  return <MaterialIcons color={color as string} size={size} name={mappedName} style={style} />;
}
