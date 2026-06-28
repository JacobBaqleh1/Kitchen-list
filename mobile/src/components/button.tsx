import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { colors, spacing } from '@/src/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'white';

type Props = PressableProps & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  small?: boolean;
};

const variantStyles: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.green600, text: colors.white },
  secondary: { bg: colors.gray100, text: colors.gray900, border: colors.gray200 },
  ghost: { bg: 'transparent', text: colors.gray700 },
  danger: { bg: colors.red50, text: colors.red700, border: colors.red200 },
  white: { bg: colors.white, text: colors.green700 },
};

export function Button({ title, variant = 'primary', loading, small, disabled, style, ...rest }: Props) {
  const v = variantStyles[variant];
  return (
    <Pressable
      style={({ pressed }) => {
        const base = [
          styles.base,
          small ? styles.small : null,
          { backgroundColor: v.bg, borderColor: v.border ?? v.bg, opacity: pressed || disabled ? 0.7 : 1 },
        ];
        if (typeof style === 'function') return [...base, style({ pressed })];
        return [...base, style];
      }}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <Text style={[styles.text, small && styles.smallText, { color: v.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  small: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
  smallText: {
    fontSize: 13,
  },
});
