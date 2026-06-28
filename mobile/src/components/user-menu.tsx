import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { clientSignOut, usePersistentSession } from '@/src/auth';
import { colors, spacing } from '@/src/theme';

function userInitials(name?: string | null, email?: string | null) {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || '?';
  }
  if (email?.trim()) return email.trim()[0].toUpperCase();
  return '?';
}

export function UserMenuButton() {
  const { data: session } = usePersistentSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const user = session?.user;
  const initials = userInitials(user?.name, user?.email);

  const signOut = async () => {
    setOpen(false);
    await clientSignOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <>
      <Pressable
        accessibilityLabel="Account menu"
        onPress={() => setOpen(true)}
        style={styles.avatar}
      >
        <Text style={styles.initials}>{initials}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            {user?.name ? <Text style={styles.name}>{user.name}</Text> : null}
            {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setOpen(false);
                router.push('/(tabs)/settings');
              }}
            >
              <Text style={styles.menuText}>Settings</Text>
            </Pressable>
            <Pressable style={[styles.menuItem, styles.signOutItem]} onPress={signOut}>
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.green100,
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 34,
  },
  initials: { color: colors.green700, fontSize: 13, fontWeight: '700' },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
  },
  menu: {
    alignSelf: 'flex-end',
    backgroundColor: colors.white,
    borderColor: colors.gray200,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  name: { color: colors.gray900, fontSize: 14, fontWeight: '600', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  email: {
    color: colors.gray500,
    fontSize: 13,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  menuItem: { borderTopColor: colors.gray200, borderTopWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  menuText: { color: colors.gray900, fontSize: 15 },
  signOutItem: { backgroundColor: colors.red50 },
  signOutText: { color: colors.red800, fontSize: 15, fontWeight: '600' },
});
