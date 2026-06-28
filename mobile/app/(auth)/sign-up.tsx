import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { auth, clearAuthError, useAuthError } from '@/src/auth';
import { Button } from '@/src/components/button';
import { Input } from '@/src/components/input';
import { ErrorBanner } from '@/src/components/card';
import { colors, spacing } from '@/src/theme';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const router = useRouter();
  const authError = useAuthError();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signUp = async () => {
    setLoading(true);
    clearAuthError();
    try {
      await auth.signUp.email({
        email: email.trim(),
        password,
        name: name.trim() || email.trim(),
      });
      router.replace('/(tabs)');
    } catch {
      /* onError */
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.brand}>MyKitchenList</Text>
          <Text style={styles.tagline}>Track your kitchen and get AI meal ideas.</Text>
        </View>

        {authError ? <ErrorBanner message={authError} /> : null}

        <View style={styles.form}>
          <Text style={styles.heading}>Create account</Text>
          <Input placeholder="Name" value={name} onChangeText={setName} />
          <Input
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Button title={loading ? 'Creating...' : 'Sign up'} onPress={signUp} loading={loading} />

          <Pressable style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Link href="/(auth)/sign-in" style={styles.link}>
                Sign in
              </Link>
            </Text>
            <Link href="/privacy" style={styles.privacyLink}>
              Privacy Policy
            </Link>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { backgroundColor: colors.gray50, flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  hero: {
    backgroundColor: colors.green700,
    borderRadius: 16,
    marginBottom: spacing.xl,
    padding: spacing.xl,
  },
  brand: { color: colors.white, fontSize: 24, fontWeight: '700' },
  tagline: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: spacing.sm },
  form: { gap: spacing.md },
  heading: { color: colors.gray900, fontSize: 22, fontWeight: '700', marginBottom: spacing.xs },
  footer: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  footerText: { color: colors.gray500, fontSize: 14 },
  link: { color: colors.green600, fontWeight: '600' },
  privacyLink: { color: colors.gray500, fontSize: 12, marginTop: spacing.xs },
});
