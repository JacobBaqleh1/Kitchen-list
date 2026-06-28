import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';
import { colors, spacing } from '@/src/theme';

export const LOCATIONS = ['fridge', 'freezer', 'pantry'] as const;

export function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {children}
      {required ? ' *' : ''}
    </Text>
  );
}

export function QtyStepper({
  value,
  onChange,
  compact,
}: {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const qty = Math.max(1, Number(value) || 1);

  const dec = () => onChange(String(Math.max(1, qty - 1)));
  const inc = () => onChange(String(qty + 1));

  return (
    <View style={[styles.qtyGroup, compact && styles.qtyGroupCompact]}>
      <Pressable
        accessibilityLabel="Decrease quantity"
        disabled={qty <= 1}
        onPress={dec}
        style={({ pressed }) => [
          styles.qtyBtn,
          styles.qtyBtnLeft,
          compact && styles.qtyBtnCompact,
          qty <= 1 && styles.qtyBtnDisabled,
          pressed && qty > 1 && styles.qtyBtnPressed,
        ]}
      >
        <Text style={styles.qtyBtnText}>−</Text>
      </Pressable>
      <TextInput
        keyboardType="number-pad"
        value={value}
        onChangeText={onChange}
        style={[styles.qtyInput, compact && styles.qtyInputCompact]}
      />
      <Pressable
        accessibilityLabel="Increase quantity"
        onPress={inc}
        style={({ pressed }) => [
          styles.qtyBtn,
          styles.qtyBtnRight,
          compact && styles.qtyBtnCompact,
          pressed && styles.qtyBtnPressed,
        ]}
      >
        <Text style={styles.qtyBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

function formatDateDisplay(isoDate: string) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

export function DateField({
  value,
  onChange,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  style?: ViewStyle;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerDate = value ? new Date(value + 'T00:00:00') : new Date();

  const applyDate = (date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) onChange(date.toISOString().slice(0, 10));
  };

  return (
    <View style={style}>
      <Pressable onPress={() => setShowPicker(true)} style={styles.dateField}>
        <Text style={[styles.dateFieldText, !value && styles.datePlaceholder]}>
          {value ? formatDateDisplay(value) : 'mm/dd/yyyy'}
        </Text>
        <SymbolView name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }} tintColor={colors.gray400} size={18} />
      </Pressable>
      {showPicker ? (
        Platform.OS === 'ios' ? (
          <View style={styles.iosPickerWrap}>
            <View style={styles.iosPickerBar}>
              <Pressable onPress={() => setShowPicker(false)}>
                <Text style={styles.iosPickerDone}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display="spinner"
              onChange={(_, date) => applyDate(date)}
            />
          </View>
        ) : (
          <DateTimePicker value={pickerDate} mode="date" onChange={(_, date) => applyDate(date)} />
        )
      ) : null}
    </View>
  );
}

export function LocationRadios({ value, onChange }: { value: string; onChange: (loc: string) => void }) {
  return (
    <View style={styles.radioRow}>
      {LOCATIONS.map((loc) => {
        const selected = value === loc;
        return (
          <Pressable key={loc} onPress={() => onChange(loc)} style={styles.radioOption}>
            <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
              {selected ? <View style={styles.radioInner} /> : null}
            </View>
            <Text style={styles.radioLabel}>{loc[0].toUpperCase() + loc.slice(1)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function LocationSelect({ value, onChange }: { value: string; onChange: (loc: string) => void }) {
  const [open, setOpen] = useState(false);
  const label = value[0].toUpperCase() + value.slice(1);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.selectField}>
        <Text style={styles.selectText}>{label}</Text>
        <SymbolView name={{ ios: 'chevron.down', android: 'arrow_drop_down', web: 'arrow_drop_down' }} tintColor={colors.gray500} size={18} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.selectBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.selectMenu}>
            {LOCATIONS.map((loc) => (
              <Pressable
                key={loc}
                onPress={() => {
                  onChange(loc);
                  setOpen(false);
                }}
                style={[styles.selectOption, value === loc && styles.selectOptionActive]}
              >
                <Text style={[styles.selectOptionText, value === loc && styles.selectOptionTextActive]}>
                  {loc[0].toUpperCase() + loc.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.gray500,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  qtyGroup: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
  },
  qtyGroupCompact: {
    alignSelf: 'stretch',
  },
  qtyBtn: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  qtyBtnCompact: {
    height: 44,
    width: 44,
  },
  qtyBtnLeft: {
    borderBottomLeftRadius: 10,
    borderRightWidth: 0,
    borderTopLeftRadius: 10,
  },
  qtyBtnRight: {
    borderBottomRightRadius: 10,
    borderLeftWidth: 0,
    borderTopRightRadius: 10,
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyBtnPressed: {
    backgroundColor: colors.gray50,
  },
  qtyBtnText: {
    color: colors.gray700,
    fontSize: 18,
    lineHeight: 20,
  },
  qtyInput: {
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderWidth: 1,
    color: colors.gray900,
    fontSize: 14,
    height: 36,
    paddingHorizontal: 4,
    textAlign: 'center',
    width: 48,
  },
  qtyInputCompact: {
    flex: 1,
    fontSize: 15,
    height: 44,
    minWidth: 48,
  },
  dateField: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateFieldText: {
    color: colors.gray900,
    flex: 1,
    fontSize: 15,
  },
  datePlaceholder: {
    color: colors.gray400,
  },
  iosPickerWrap: {
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  iosPickerBar: {
    alignItems: 'flex-end',
    borderBottomColor: colors.gray200,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iosPickerDone: {
    color: colors.green600,
    fontSize: 15,
    fontWeight: '600',
  },
  radioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    paddingTop: 2,
  },
  radioOption: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  radioOuter: {
    alignItems: 'center',
    borderColor: colors.gray400,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  radioOuterSelected: {
    borderColor: colors.green600,
  },
  radioInner: {
    backgroundColor: colors.green600,
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  radioLabel: {
    color: colors.gray900,
    fontSize: 14,
  },
  selectField: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectText: {
    color: colors.gray900,
    fontSize: 15,
  },
  selectBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  selectMenu: {
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selectOption: {
    borderBottomColor: colors.gray200,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  selectOptionActive: {
    backgroundColor: colors.green50,
  },
  selectOptionText: {
    color: colors.gray900,
    fontSize: 15,
  },
  selectOptionTextActive: {
    color: colors.green700,
    fontWeight: '600',
  },
});
