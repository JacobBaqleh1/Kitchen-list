import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { colors, spacing } from '@/src/theme';

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.gray400}
      style={[styles.input, props.multiline && styles.multiline, props.style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.gray900,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  multiline: {
    minHeight: 80,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
});
