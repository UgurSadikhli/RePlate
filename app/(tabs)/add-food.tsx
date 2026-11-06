import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import { DatePickerModal } from '@/components/date-picker-modal';
import { useAppContext } from '@/context/AppContext';
import Product from '@/models/Product';
import { getCurrencySymbol } from '@/utils/currency';
import { formatDate } from '@/utils/date';

export default function ProductsScreen() {
  const { settings, addProducts } = useAppContext();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [expirationDate, setExpirationDate] = useState(new Date());
  const [boughtDate, setBoughtDate] = useState(new Date());
  const [quantity, setQuantity] = useState('');
  const [quantityType, setQuantityType] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [notes, setNotes] = useState('');
  const [toBuy, setToBuy] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [activePicker, setActivePicker] = useState<'bought' | 'expiration' | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: toBuy ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [toBuy, fadeAnim]);

  const resetFields = () => {
    setName('');
    setCategory('');
    setExpirationDate(new Date());
    setBoughtDate(new Date());
    setQuantity('');
    setQuantityType('');
    setPrice('');
    setImage('');
    setNotes('');
    setToBuy(false);
  };

  const handleAddProduct = async () => {
    if (!name.trim() || !quantity.trim() || !quantityType.trim() || (!toBuy && !price.trim())) {
      Alert.alert('Missing Fields', 'Please fill in all required fields marked with *.');
      return;
    }

    const parsedPrice = toBuy ? 0 : parseFloat(price.trim().replace(',', '.')) || 0;

    const newProduct = new Product(
      Date.now(),
      name.trim(),
      category.trim(),
      toBuy ? '' : formatDate(expirationDate),
      toBuy ? '' : formatDate(boughtDate),
      quantity.trim(),
      quantityType.trim(),
      parsedPrice,
      toBuy ? '' : image,
      notes.trim(),
      toBuy,
      false
    );

    await addProducts([newProduct]);
    resetFields();
    Alert.alert('Success', `${newProduct.name} has been added!`);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAwareScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        extraHeight={110}
        enableOnAndroid={true}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.header}>Add Product</Text>
          <Text style={styles.subHeader}>Add items to your inventory or shopping list</Text>
        </View>

        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name*</Text>
          <TextInput
            placeholder="Enter product name"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <TextInput
            placeholder="e.g., Dairy, Produce, Pantry"
            placeholderTextColor="#666"
            value={category}
            onChangeText={setCategory}
            style={styles.input}
          />
        </View>

        {/* Quantity */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Quantity*</Text>
            <TextInput
              placeholder="0"
              placeholderTextColor="#666"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Quantity Type*</Text>
            <TextInput
              placeholder="kg, g, pcs"
              placeholderTextColor="#666"
              value={quantityType}
              onChangeText={setQuantityType}
              style={styles.input}
            />
          </View>
        </View>

        {/* To Buy Switch */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchText}>Add to Shopping List (To Buy)</Text>
            <Text style={styles.switchHint}>Skip price & expiration until purchased</Text>
          </View>
          <Switch
            value={toBuy}
            onValueChange={setToBuy}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor="#fff"
          />
        </View>

        {/* Conditional Fields */}
        {!toBuy && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Dates */}
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.datePicker, { marginRight: 10 }]}
                onPress={() => setActivePicker('bought')}
              >
                <Text style={styles.dateText}>Bought Date</Text>
                <Text style={styles.dateText2}>{formatDate(boughtDate)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.datePicker}
                onPress={() => setActivePicker('expiration')}
              >
                <Text style={styles.dateText}>Expiration Date</Text>
                <Text style={styles.dateText2}>{formatDate(expirationDate)}</Text>
              </TouchableOpacity>
            </View>

            {/* Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price*</Text>
              <TextInput
                placeholder={`${getCurrencySymbol(settings.currency)} 0.00`}
                placeholderTextColor="#666"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                placeholder="Additional info..."
                placeholderTextColor="#666"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                style={[styles.input, { height: 84, textAlignVertical: 'top' }]}
              />
            </View>

            {/* Image Picker */}
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Text style={styles.imageButtonText}>
                {image ? 'Change Image' : 'Upload Product Photo'}
              </Text>
            </TouchableOpacity>
            {!!image && <Image source={{ uri: image }} style={styles.imagePreview} />}
          </Animated.View>
        )}

        {/* Add Button */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>

        {/* Cross-Platform Date Picker Modal */}
        <DatePickerModal
          visible={activePicker !== null}
          title={activePicker === 'expiration' ? 'Select Expiration Date' : 'Select Bought Date'}
          value={activePicker === 'expiration' ? expirationDate : boughtDate}
          onClose={() => setActivePicker(null)}
          onSelectDate={(selectedDate) => {
            if (activePicker === 'expiration') {
              setExpirationDate(selectedDate);
            } else if (activePicker === 'bought') {
              setBoughtDate(selectedDate);
            }
          }}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000' },
  screen: { flex: 1, backgroundColor: '#000000' },
  headerBlock: { marginBottom: 20, marginTop: 6 },
  header: {
    textAlign: 'left',
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subHeader: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },
  container: { paddingHorizontal: 16, paddingBottom: 40, backgroundColor: '#000000' },
  inputGroup: { marginBottom: 15 },
  label: { fontWeight: '600', fontSize: 14, marginBottom: 6, color: '#EAEAEA' },
  input: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 16,
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  switchText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  switchHint: { fontSize: 12, color: '#777777', marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  datePicker: {
    flex: 1,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    padding: 13,
    borderRadius: 12,
    marginBottom: 15,
    justifyContent: 'center',
  },
  dateText: { color: '#888888', fontSize: 12, fontWeight: '600' },
  dateText2: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginTop: 4 },
  imageButton: {
    backgroundColor: '#162436',
    borderWidth: 1,
    borderColor: '#2196F3',
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  imageButtonText: { color: '#64B5F6', fontWeight: '700', fontSize: 15 },
  imagePreview: { width: '100%', height: 160, borderRadius: 12, marginBottom: 15 },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    alignItems: 'center',
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 17 },
});
