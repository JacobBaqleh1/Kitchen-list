import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from './button';
import { Input } from './input';
import { DateField, LocationSelect } from './form-fields';
import { colors, spacing } from '@/src/theme';

type Item = {
  id: number;
  name: string;
  quantity: number;
  expiryDate: string | null;
  location: string;
  checked: boolean;
};

function expiryStatus(expiryDate: string | null) {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = (expiry.getTime() - now.getTime()) / 86400000;
  if (diff < 0) return 'expired';
  if (diff <= 3) return 'soon';
  return 'ok';
}

export function ItemCard({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: Item;
  onToggle: (id: number) => void;
  onEdit: (id: number, payload: Partial<Item>) => Promise<void>;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editQty, setEditQty] = useState(String(item.quantity));
  const [editExpiry, setEditExpiry] = useState(item.expiryDate || '');
  const [editLocation, setEditLocation] = useState(item.location);

  const startEdit = () => {
    setEditName(item.name);
    setEditQty(String(item.quantity));
    setEditExpiry(item.expiryDate || '');
    setEditLocation(item.location);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditName(item.name);
    setEditQty(String(item.quantity));
    setEditExpiry(item.expiryDate || '');
    setEditLocation(item.location);
    setEditing(false);
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    await onEdit(item.id, {
      name: editName.trim(),
      quantity: Math.max(1, Number(editQty) || 1),
      expiryDate: editExpiry || null,
      location: editLocation,
    });
    setEditing(false);
  };

  const status = expiryStatus(item.expiryDate);
  const expirySoon = status === 'soon' || status === 'expired';

  if (editing) {
    return (
      <View style={styles.editCard}>
        <View style={styles.editTopRow}>
          <Input
            value={editName}
            onChangeText={setEditName}
            placeholder="Name"
            style={styles.editName}
          />
          <Input
            value={editQty}
            onChangeText={setEditQty}
            keyboardType="number-pad"
            style={styles.editQty}
          />
        </View>
        <DateField value={editExpiry} onChange={setEditExpiry} />
        <LocationSelect value={editLocation} onChange={setEditLocation} />
        <View style={styles.editActions}>
          <Button title="Save" onPress={saveEdit} small style={styles.flex} />
          <Button title="Cancel" variant="secondary" onPress={cancelEdit} small style={styles.flex} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, item.checked && styles.checked]}>
      <Switch value={!item.checked} onValueChange={() => onToggle(item.id)} trackColor={{ true: colors.green600 }} />
      <View style={styles.content}>
        <Text style={[styles.name, item.checked && styles.nameUsed]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.qty}>×{item.quantity}</Text>
          {item.expiryDate ? (
            <Text style={[styles.expiry, expirySoon && styles.expiryWarn]}>
              {status === 'expired' ? 'Expired: ' : 'Exp: '}
              {new Date(item.expiryDate + 'T00:00:00').toLocaleDateString()}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Edit" variant="ghost" small onPress={startEdit} />
        <Button title="Del" variant="danger" small onPress={() => onDelete(item.id)} />
      </View>
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
  checked: { opacity: 0.6 },
  content: { flex: 1, minWidth: 0 },
  name: { color: colors.gray900, fontSize: 14, fontWeight: '600' },
  nameUsed: { color: colors.gray500, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 2 },
  qty: {
    backgroundColor: colors.green100,
    borderRadius: 999,
    color: colors.green700,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  expiry: { color: colors.gray500, fontSize: 11 },
  expiryWarn: { color: colors.amber600, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 2 },
  editCard: {
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  editTopRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editName: { flex: 1 },
  editQty: { width: 64, textAlign: 'center' },
  editActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
});
