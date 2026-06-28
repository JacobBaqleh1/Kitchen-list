import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './button';
import { Input } from './input';
import { Card, ErrorBanner } from './card';
import { DateField, FieldLabel, LocationRadios, QtyStepper } from './form-fields';
import { colors, spacing } from '@/src/theme';

type Payload = {
  name: string;
  quantity: number;
  expiryDate: string | null;
  location: string;
};

export function AddItemForm({
  onAdd,
  defaultLocation = 'fridge',
  error,
}: {
  onAdd: (payload: Payload) => Promise<void>;
  defaultLocation?: string;
  error?: string;
}) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [expiryDate, setExpiryDate] = useState('');
  const [location, setLocation] = useState(defaultLocation);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocation(defaultLocation);
  }, [defaultLocation]);

  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onAdd({
        name: name.trim(),
        quantity: Math.max(1, Number(quantity) || 1),
        expiryDate: expiryDate || null,
        location,
      });
      setName('');
      setQuantity('1');
      setExpiryDate('');
    } catch {
      /* parent surfaces the error */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Add item</Text>

      <View style={styles.field}>
        <FieldLabel required>Name</FieldLabel>
        <Input placeholder="e.g. Milk" value={name} onChangeText={setName} />
      </View>

      <View style={styles.field}>
        <FieldLabel>Qty</FieldLabel>
        <QtyStepper value={quantity} onChange={setQuantity} />
      </View>

      <View style={styles.field}>
        <FieldLabel>Expiry (optional)</FieldLabel>
        <DateField value={expiryDate} onChange={setExpiryDate} />
      </View>

      <View style={styles.field}>
        <FieldLabel>Location</FieldLabel>
        <LocationRadios value={location} onChange={setLocation} />
      </View>

      {error ? <ErrorBanner message={error} /> : null}
      <Button title={loading ? 'Adding...' : 'Add'} onPress={submit} disabled={loading || !name.trim()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, marginBottom: spacing.lg },
  title: { color: colors.gray900, fontSize: 14, fontWeight: '600' },
  field: { gap: 0 },
});
