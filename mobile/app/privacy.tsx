import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PRIVACY_POLICY } from '@/src/content/privacy-policy';
import { colors, spacing } from '@/src/theme';

export default function PrivacyPolicyScreen() {
  const { title, effectiveDate, intro, sections } = PRIVACY_POLICY;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.date}>Effective {effectiveDate}</Text>
      <Text style={styles.intro}>{intro}</Text>

      {sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading}>{section.heading}</Text>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph.slice(0, 40)} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.gray50, flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { color: colors.gray900, fontSize: 28, fontWeight: '700' },
  date: { color: colors.gray500, fontSize: 13, marginTop: spacing.xs },
  intro: { color: colors.gray700, fontSize: 15, lineHeight: 22, marginTop: spacing.lg },
  section: { marginTop: spacing.xl },
  heading: { color: colors.gray900, fontSize: 18, fontWeight: '600', marginBottom: spacing.sm },
  paragraph: { color: colors.gray700, fontSize: 15, lineHeight: 22, marginBottom: spacing.sm },
});
