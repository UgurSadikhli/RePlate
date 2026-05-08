import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const { height: SH } = Dimensions.get('window');

const G        = '#4CAF50';
const G_DIM    = '#1e3d20';
const G_FAINT  = '#0d1f0e';
const SURFACE  = '#0a0a0a';
const CARD     = '#111111';
const BORDER   = '#1e1e1e';
const TEXT     = '#ffffff';
const MUTED    = '#555555';

const DATE_KEYWORDS    = ['date', 'expiry', 'expiration', 'dob', 'birth', 'deadline', 'due', 'start', 'end'];
const NUMERIC_KEYWORDS = ['price', 'amount', 'number', 'qty', 'quantity', 'cost', 'total', 'count', 'age', 'year'];

/**
 * Helper: Converts "YYYY-MM-DD" string back to Date object.
 */
const parseFormattedDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date();
  // parts[0] = YYYY, parts[1] = MM, parts[2] = DD
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return isNaN(d.getTime()) ? new Date() : d;
};

function resolveFieldType(
  field: string,
  overrides?: Record<string, 'date' | 'numeric' | 'text'>
): 'date' | 'numeric' | 'text' {
  if (!field || typeof field !== 'string') return 'text';
  if (overrides?.[field]) return overrides[field];
  const lower = field.toLowerCase().trim();
  if (DATE_KEYWORDS.some((kw) => lower.includes(kw))) return 'date';
  if (NUMERIC_KEYWORDS.some((kw) => lower.includes(kw))) return 'numeric';
  return 'text';
}

type Props = {
  missingDetails: string[];
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
  fieldTypes?: Record<string, 'date' | 'numeric' | 'text'>;
};

const FillInMissingDetailsGap: React.FC<Props> = ({
  missingDetails,
  visible,
  onClose,
  onSubmit,
  fieldTypes,
}) => {
  const [values, setValues]             = useState<Record<string, string>>({});
  const [index, setIndex]             = useState(0);
  const [showPicker, setShowPicker]   = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const slideAnim   = useRef(new Animated.Value(SH)).current;
  const dragY       = useRef(new Animated.Value(0)).current;
  const cardScale   = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const indexRef      = useRef(0);
  const totalRef      = useRef(missingDetails.length);
  const isDismissing  = useRef(false);

  useEffect(() => {
    totalRef.current = missingDetails.length;
  }, [missingDetails.length]);

  useEffect(() => {
    if (visible) {
      setValues({});
      setIndex(0);
      indexRef.current  = 0;
      isDismissing.current = false;
      dragY.setValue(0);
      cardScale.setValue(1);
      progressAnim.setValue(0);
      slideAnim.setValue(SH);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 180,
        mass: 0.8,
      }).start();
    }
  }, [visible]);

  const goTo = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(totalRef.current - 1, next));
    if (clamped === indexRef.current) return;
    indexRef.current = clamped;
    setIndex(clamped);
    Animated.spring(progressAnim, {
      toValue: clamped / Math.max(totalRef.current - 1, 1),
      useNativeDriver: false,
      damping: 18,
      stiffness: 140,
    }).start();
  }, []);

  const dismiss = useCallback(() => {
    if (isDismissing.current) return;
    isDismissing.current = true;
    Animated.timing(slideAnim, {
      toValue: SH,
      duration: 260,
      useNativeDriver: true,
    }).start(onClose);
  }, [onClose]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(null);
    
    if (event.type === 'set' && selectedDate && showPicker) {
      const d = selectedDate;
      // Formatter: YYYY-MM-DD
      const formatted = [
        d.getFullYear(),
        (d.getMonth() + 1).toString().padStart(2, '0'),
        d.getDate().toString().padStart(2, '0'),
      ].join('-');
      
      setValues((prev) => ({ ...prev, [showPicker]: formatted }));
    } else if (event.type === 'dismissed') {
      setShowPicker(null);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        dy > 6 && Math.abs(dy) > Math.abs(dx),
      onPanResponderGrant: () => {
        dragY.setOffset(0);
        dragY.setValue(0);
      },
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) {
          dragY.setValue(dy);
          const progress = Math.min(dy / (SH * 0.45), 1);
          cardScale.setValue(1 - progress * 0.08);
        }
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        dragY.flattenOffset();
        if (dy > SH * 0.28 || vy > 1.4) {
          Animated.timing(dragY, {
            toValue: SH,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            isDismissing.current = true;
            onClose();
          });
        } else {
          Animated.parallel([
            Animated.spring(dragY, {
              toValue: 0,
              useNativeDriver: true,
              damping: 18,
              stiffness: 200,
            }),
            Animated.spring(cardScale, {
              toValue: 1,
              useNativeDriver: true,
              damping: 15,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const swipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderRelease: (_, { dx }) => {
        if (dx < -50 && indexRef.current < totalRef.current - 1) {
          goTo(indexRef.current + 1);
        } else if (dx > 50 && indexRef.current > 0) {
          goTo(indexRef.current - 1);
        }
      },
    })
  ).current;

  const filledCount = missingDetails.filter(
    (d) => values[d] && values[d].trim() !== ''
  ).length;
  const isComplete = filledCount === missingDetails.length;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const modalTranslate = Animated.add(slideAnim, dragY);
  const currentField = missingDetails[index] ?? '';
  const fieldValue   = values[currentField] ?? '';
  const isFilled     = fieldValue.trim() !== '';
  const fieldType    = resolveFieldType(currentField, fieldTypes);

  return (
    <>
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
        <View style={s.root}>
          <Animated.View
            style={[
              s.backdrop,
              {
                opacity: dragY.interpolate({
                  inputRange: [0, SH * 0.4],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={dismiss}
            />
          </Animated.View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={s.kav}
            pointerEvents="box-none"
          >
            <Animated.View
              style={[
                s.sheet,
                {
                  transform: [
                    { translateY: modalTranslate },
                    { scale: cardScale },
                  ],
                },
              ]}
            >
              <View style={s.handleWrap} {...panResponder.panHandlers}>
                <View style={s.handle} />
              </View>

              <View style={s.header} {...panResponder.panHandlers}>
                <View style={s.headerLeft}>
                  <View style={s.iconRing}>
                    <Text style={s.iconText}>✦</Text>
                  </View>
                  <View>
                    <Text style={s.title}>Missing details</Text>
                    <Text style={s.subtitle}>
                      {filledCount} of {missingDetails.length} filled
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={s.closeBtn} onPress={dismiss}>
                  <Text style={s.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={s.progressTrack}>
                <Animated.View style={[s.progressFill, { width: progressWidth }]} />
              </View>

              <View style={s.pills} {...swipeResponder.panHandlers}>
                {missingDetails.map((field, i) => {
                  const done   = !!(values[field] && values[field].trim() !== '');
                  const active = i === index;
                  return (
                    <TouchableOpacity
                      key={`${field}-${i}`}
                      style={[s.pill, active && s.pillActive, done && !active && s.pillDone]}
                      onPress={() => goTo(i)}
                    >
                      <Text style={[s.pillNum, active && s.pillNumActive]}>
                        {done && !active ? '✓' : i + 1}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={s.body} {...swipeResponder.panHandlers}>
                <Text style={s.fieldLabel} numberOfLines={1}>{currentField}</Text>
                <Text style={s.fieldHint}>
                  Step {index + 1} of {missingDetails.length}
                </Text>

                {fieldType === 'date' ? (
                  <TouchableOpacity
                    style={[s.dateBtn, focusedField === currentField && s.inputWrapFocused]}
                    onPress={() => setShowPicker(currentField)}
                  >
                    <Text style={s.dateBtnLabel}>Tap to set: </Text>
                    <Text style={s.dateBtnValue}>
                      {isFilled ? fieldValue : 'YYYY-MM-DD'}
                    </Text>
                    {isFilled && (
                      <View style={[s.checkMark, { marginLeft: 'auto' }]}>
                        <Text style={s.checkMarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={[s.inputWrap, focusedField === currentField && s.inputWrapFocused]}>
                    <TextInput
                      style={s.input}
                      value={fieldValue}
                      placeholder={`Enter ${currentField.toLowerCase()}...`}
                      placeholderTextColor={MUTED}
                      keyboardType={fieldType === 'numeric' ? 'numeric' : 'default'}
                      keyboardAppearance="dark"
                      onFocus={() => setFocusedField(currentField)}
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(t) => setValues((prev) => ({ ...prev, [currentField]: t }))}
                      onSubmitEditing={() => index < missingDetails.length - 1 && goTo(index + 1)}
                    />
                    {isFilled && (
                      <View style={s.checkMark}>
                        <Text style={s.checkMarkText}>✓</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={s.navRow}>
                  <TouchableOpacity
                    style={[s.navBtn, index === 0 && s.navBtnDisabled]}
                    onPress={() => goTo(index - 1)}
                    disabled={index === 0}
                  >
                    <Text style={s.navBtnText}>← Previous</Text>
                  </TouchableOpacity>

                  {index < missingDetails.length - 1 ? (
                    <TouchableOpacity
                      style={[s.navBtnNext, isFilled && s.navBtnNextActive]}
                      onPress={() => goTo(index + 1)}
                    >
                      <Text style={[s.navBtnNextText, isFilled && s.navBtnNextTextActive]}>Next →</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[s.lastHintText, isComplete && s.lastHintDone]}>
                      {isComplete ? 'Ready to save ✓' : 'Finish all fields'}
                    </Text>
                  )}
                </View>
              </View>

              <View style={s.footer}>
                <TouchableOpacity style={s.cancelBtn} onPress={dismiss}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.submitBtn, !isComplete && s.submitBtnDisabled]}
                  onPress={() => isComplete && onSubmit(values)}
                  disabled={!isComplete}
                >
                  <Text style={s.submitText}>Confirm Details</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>

          {/* Date Picker Overlay (IOS) / Trigger (Android) */}
          {Platform.OS === 'ios' ? (
            <Modal
              visible={!!showPicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowPicker(null)}
            >
              <View style={s.pickerOverlay}>
                <View style={s.pickerCard}>
                  <Text style={s.pickerTitle}>{showPicker}</Text>
                  <View style={s.pickerDivider} />
                  <DateTimePicker
                    value={showPicker ? parseFormattedDate(values[showPicker]) : new Date()}
                    mode="date"
                    display="spinner"
                    themeVariant="dark"
                    textColor="#ffffff"
                    onChange={onDateChange}
                    style={s.picker}
                  />
                  <TouchableOpacity style={s.pickerConfirmBtn} onPress={() => setShowPicker(null)}>
                    <Text style={s.pickerConfirmText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          ) : (
            showPicker && (
              <DateTimePicker
                value={parseFormattedDate(values[showPicker])}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )
          )}
        </View>
      </Modal>
    </>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)' },
  kav: { width: '100%' },
  sheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: BORDER,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  handleWrap: { alignItems: 'center', paddingVertical: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconRing: { width: 40, height: 40, borderRadius: 12, backgroundColor: G_FAINT, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: G_DIM },
  iconText: { color: G, fontSize: 18 },
  title: { color: TEXT, fontSize: 18, fontWeight: '700' },
  subtitle: { color: MUTED, fontSize: 13 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: TEXT, fontSize: 12 },
  progressTrack: { height: 3, backgroundColor: '#1a1a1a', marginHorizontal: 20, borderRadius: 2, marginBottom: 20 },
  progressFill: { height: 3, backgroundColor: G, borderRadius: 2 },
  pills: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 25 },
  pill: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#111', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  pillActive: { borderColor: G, backgroundColor: G_FAINT },
  pillDone: { borderColor: G_DIM },
  pillNum: { color: MUTED, fontSize: 12, fontWeight: '700' },
  pillNumActive: { color: G },
  body: { paddingHorizontal: 20, marginBottom: 20 },
  fieldLabel: { color: TEXT, fontSize: 24, fontWeight: '800', marginBottom: 4 },
  fieldHint: { color: MUTED, fontSize: 14, marginBottom: 20 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 16, height: 60 },
  inputWrapFocused: { borderColor: G, backgroundColor: '#0d130d' },
  input: { flex: 1, color: TEXT, fontSize: 17 },
  checkMark: { width: 22, height: 22, borderRadius: 11, backgroundColor: G, alignItems: 'center', justifyContent: 'center' },
  checkMarkText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 16, height: 60 },
  dateBtnLabel: { color: MUTED, fontSize: 16 },
  dateBtnValue: { color: TEXT, fontSize: 16, fontWeight: '600' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  navBtn: { padding: 10 },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { color: MUTED, fontWeight: '600' },
  navBtnNext: { backgroundColor: '#1a1a1a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  navBtnNextActive: { backgroundColor: G_FAINT, borderWidth: 1, borderColor: G },
  navBtnNextText: { color: MUTED, fontWeight: '700' },
  navBtnNextTextActive: { color: G },
  lastHintText: { color: MUTED, fontSize: 14 },
  lastHintDone: { color: G },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  cancelBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: MUTED, fontSize: 16, fontWeight: '600' },
  submitBtn: { flex: 2, height: 56, borderRadius: 16, backgroundColor: G, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { backgroundColor: G_DIM, opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
  pickerCard: { backgroundColor: '#000', borderRadius: 24, borderWidth: 1, borderColor: '#222', overflow: 'hidden' },
  pickerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', padding: 20, textTransform: 'capitalize' },
  pickerDivider: { height: 1, backgroundColor: '#111' },
  pickerConfirmBtn: { padding: 20, alignItems: 'center', backgroundColor: G_FAINT },
  pickerConfirmText: { color: G, fontSize: 16, fontWeight: '700' },
  picker: { width: '100%', height: 220 },
});

export default FillInMissingDetailsGap;