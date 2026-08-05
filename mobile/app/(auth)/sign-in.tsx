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

export default function SignInScreen() {
  const router = useRouter();
  const authError = useAuthError();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const signIn = async () => {
    setLoading(true);
    clearAuthError();
    try {
      await auth.signIn.email({ email: email.trim(), password });
      router.replace('/(tabs)');
    } catch {
      // onError handler surfaces message via useAuthError
    } finally {
      setLoading(false);
    }
  };

  const socialSignIn = async (provider: 'google' | 'github' | 'apple') => {
    setSocialLoading(provider);
    clearAuthError();
    try {
      await auth.signIn.social({
        provider,
        callbackURL: 'mykitchenlist://',
      });
      router.replace('/(tabs)');
    } catch {
      /* onError */
    } finally {
      setSocialLoading(null);
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
          <Text style={styles.tagline}>Your kitchen, perfectly organized.</Text>
        </View>

        {authError ? <ErrorBanner message={authError} /> : null}

        <View style={styles.form}>
          <Text style={styles.heading}>Sign in</Text>
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
          <Button title={loading ? 'Signing in...' : 'Sign in'} onPress={signIn} loading={loading} />

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.line} />
          </View>

          <Button
            title="Continue with Google"
            variant="secondary"
            onPress={() => socialSignIn('google')}
            loading={socialLoading === 'google'}
          />
          {Platform.OS === 'ios' ? (
            <Button
              title="Continue with Apple"
              variant="apple"
              onPress={() => socialSignIn('apple')}
              loading={socialLoading === 'apple'}
            />
          ) : null}
          <Button
            title="Continue with GitHub"
            variant="secondary"
            onPress={() => socialSignIn('github')}
            loading={socialLoading === 'github'}
          />

          <Pressable style={styles.footer}>
            <Text style={styles.footerText}>
              No account?{' '}
              <Link href="/(auth)/sign-up" style={styles.link}>
                Sign up
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
  divider: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginVertical: spacing.sm },
  line: { backgroundColor: colors.gray200, flex: 1, height: 1 },
  dividerText: { color: colors.gray500, fontSize: 13 },
  footer: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  footerText: { color: colors.gray500, fontSize: 14 },
  link: { color: colors.green600, fontWeight: '600' },
  privacyLink: { color: colors.gray500, fontSize: 12, marginTop: spacing.xs },
});
