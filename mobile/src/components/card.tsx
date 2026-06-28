import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import type { ReactNode } from 'react';
import { colors, spacing } from '@/src/theme';

export function Card({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.error}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Text style={styles.retry} onPress={onRetry}>
          Tap to retry
        </Text>
      ) : null}
    </View>
  );
}

export function NoticeBanner({ message }: { message: string }) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  section: {
    color: colors.gray500,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  error: {
    backgroundColor: colors.red50,
    borderColor: colors.red200,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  errorText: {
    color: colors.red800,
    fontSize: 14,
  },
  retry: {
    color: colors.red700,
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  notice: {
    backgroundColor: colors.green50,
    borderColor: '#86efac',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  noticeText: {
    color: colors.green700,
    fontSize: 14,
  },
});
