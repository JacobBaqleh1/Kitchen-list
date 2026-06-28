import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/src/theme';

export function Spinner({ label }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.green600} size="large" />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  label: {
    color: colors.gray500,
    fontSize: 15,
  },
});
