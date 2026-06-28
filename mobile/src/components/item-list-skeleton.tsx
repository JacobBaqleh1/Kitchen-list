import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SectionLabel } from './card';
import { colors, spacing } from '@/src/theme';

function SkeletonBlock({
  style,
  opacity,
}: {
  style: object;
  opacity: Animated.Value;
}) {
  return <Animated.View style={[styles.block, style, { opacity }]} />;
}

function ItemCardSkeleton({ opacity }: { opacity: Animated.Value }) {
  return (
    <View style={styles.card}>
      <SkeletonBlock style={styles.toggle} opacity={opacity} />
      <View style={styles.content}>
        <SkeletonBlock style={styles.name} opacity={opacity} />
        <View style={styles.metaRow}>
          <SkeletonBlock style={styles.badge} opacity={opacity} />
          <SkeletonBlock style={styles.expiry} opacity={opacity} />
        </View>
      </View>
      <View style={styles.actions}>
        <SkeletonBlock style={styles.actionBtn} opacity={opacity} />
        <SkeletonBlock style={styles.actionBtn} opacity={opacity} />
      </View>
    </View>
  );
}

export function ItemListSkeleton({ count = 4 }: { count?: number }) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View>
      <SectionLabel>In stock</SectionLabel>
      {Array.from({ length: count }, (_, i) => (
        <ItemCardSkeleton key={i} opacity={pulse} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  block: {
    backgroundColor: colors.gray200,
    borderRadius: 6,
  },
  toggle: {
    borderRadius: 14,
    height: 28,
    width: 48,
  },
  content: {
    flex: 1,
    gap: 8,
  },
  name: {
    height: 14,
    width: '55%',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badge: {
    borderRadius: 999,
    height: 18,
    width: 36,
  },
  expiry: {
    height: 12,
    width: 72,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    borderRadius: 8,
    height: 28,
    width: 40,
  },
});
