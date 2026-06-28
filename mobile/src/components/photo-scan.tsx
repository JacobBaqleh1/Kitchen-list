import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '@/src/api';
import { Button } from './button';
import { Input } from './input';
import { Card, ErrorBanner } from './card';
import { Spinner } from './spinner';
import { colors, spacing } from '@/src/theme';

type DetectedItem = { name: string; quantity: number; location: string };

const LOCATIONS = ['fridge', 'freezer', 'pantry'] as const;

export function PhotoScan({
  onItemsConfirmed,
  location,
}: {
  onItemsConfirmed: (items: DetectedItem[]) => Promise<void>;
  location: string;
}) {
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<DetectedItem[] | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState('1');
  const [manualLoc, setManualLoc] = useState(location);

  const pickAndScan = async (type: 'food' | 'receipt', useCamera: boolean) => {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow camera or photo library access.');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: false });

    if (result.canceled || !result.assets[0]) return;

    setScanning(true);
    setDetected(null);
    setError('');

    try {
      const asset = result.assets[0];
      const form = new FormData();
      form.append('image', {
        uri: asset.uri,
        name: 'photo.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as unknown as Blob);
      form.append('type', type);
      const data = await apiFetch('/api/photos/scan', { method: 'POST', body: form });
      setDetected(data.items.map((i: DetectedItem) => ({ ...i, location })));
    } catch {
      setError('Could not read photo, please try again.');
    } finally {
      setScanning(false);
    }
  };

  const showPicker = (type: 'food' | 'receipt') => {
    Alert.alert('Scan photo', 'Choose a source', [
      { text: 'Camera', onPress: () => pickAndScan(type, true) },
      { text: 'Photo library', onPress: () => pickAndScan(type, false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmAdd = async () => {
    if (!detected?.length) return;
    setAdding(true);
    try {
      await onItemsConfirmed(
        detected.map((i) => ({
          name: i.name,
          quantity: i.quantity || 1,
          location: i.location,
        })),
      );
      setDetected(null);
      setManualOpen(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Scan photo</Text>
      <View style={styles.grid}>
        <Pressable style={styles.scanBtn} onPress={() => showPicker('food')} disabled={scanning}>
          <Text style={styles.emoji}>🥦</Text>
          <Text style={styles.scanTitle}>Scan food items</Text>
          <Text style={styles.scanSub}>Photo of groceries or produce</Text>
        </Pressable>
        <Pressable style={styles.scanBtn} onPress={() => showPicker('receipt')} disabled={scanning}>
          <Text style={styles.emoji}>🧾</Text>
          <Text style={styles.scanTitle}>Scan receipt</Text>
          <Text style={styles.scanSub}>Extract items from a receipt</Text>
        </Pressable>
      </View>

      {scanning ? <Spinner label="Reading your photo..." /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {detected ? (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>
            We found {detected.length} item{detected.length !== 1 ? 's' : ''} — review and add:
          </Text>
          <FlatList
            data={detected}
            keyExtractor={(_, i) => String(i)}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <View style={styles.detectedRow}>
                <Text style={styles.detectedQty}>×{item.quantity}</Text>
                <Text style={styles.detectedName}>{item.name}</Text>
                <View style={styles.locRow}>
                  {LOCATIONS.map((loc) => (
                    <Pressable
                      key={loc}
                      onPress={() =>
                        setDetected((prev) =>
                          prev!.map((d, i) => (i === index ? { ...d, location: loc } : d)),
                        )
                      }
                      style={[styles.locChip, item.location === loc && styles.locChipActive]}
                    >
                      <Text style={[styles.locText, item.location === loc && styles.locTextActive]}>
                        {loc[0].toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Button
                  title="✕"
                  variant="danger"
                  small
                  onPress={() => setDetected((prev) => prev!.filter((_, i) => i !== index))}
                />
              </View>
            )}
          />
          {manualOpen ? (
            <View style={styles.manual}>
              <Input placeholder="Item name" value={manualName} onChangeText={setManualName} />
              <Input value={manualQty} onChangeText={setManualQty} keyboardType="number-pad" />
              <View style={styles.row}>
                <Button
                  title="Add"
                  small
                  onPress={() => {
                    if (!manualName.trim()) return;
                    setDetected((prev) => [
                      ...prev!,
                      { name: manualName.trim(), quantity: Number(manualQty) || 1, location: manualLoc },
                    ]);
                    setManualName('');
                    setManualQty('1');
                    setManualOpen(false);
                  }}
                />
                <Button title="Cancel" variant="ghost" small onPress={() => setManualOpen(false)} />
              </View>
            </View>
          ) : (
            <Button title="+ Add item" variant="ghost" small onPress={() => setManualOpen(true)} />
          )}
          <View style={styles.row}>
            <Button
              title={adding ? 'Adding...' : `Add all ${detected.length}`}
              onPress={confirmAdd}
              disabled={adding || !detected.length}
              style={styles.flex}
            />
            <Button
              title="Dismiss"
              variant="ghost"
              onPress={() => {
                setDetected(null);
                setManualOpen(false);
              }}
              style={styles.flex}
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, marginBottom: spacing.lg },
  title: { color: colors.gray900, fontSize: 14, fontWeight: '600' },
  grid: { gap: spacing.sm },
  scanBtn: {
    borderColor: colors.gray200,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  emoji: { fontSize: 28 },
  scanTitle: { color: colors.gray900, fontSize: 14, fontWeight: '600' },
  scanSub: { color: colors.gray500, fontSize: 12 },
  results: {
    backgroundColor: colors.green50,
    borderColor: '#86efac',
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  resultsTitle: { color: colors.gray900, fontSize: 14 },
  detectedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  detectedQty: {
    backgroundColor: colors.green100,
    borderRadius: 999,
    color: colors.green700,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  detectedName: { color: colors.gray900, flex: 1, fontSize: 14 },
  locRow: { flexDirection: 'row', gap: 4 },
  locChip: {
    borderColor: colors.gray200,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  locChipActive: { backgroundColor: colors.green100, borderColor: colors.green600 },
  locText: { color: colors.gray500, fontSize: 10 },
  locTextActive: { color: colors.green700, fontWeight: '600' },
  manual: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
