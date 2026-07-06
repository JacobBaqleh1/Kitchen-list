export const PRIVACY_POLICY_URL = 'https://mykitchenlist.app/privacy';

export const PRIVACY_POLICY = {
  title: 'Privacy Policy',
  effectiveDate: 'June 28, 2026',
  contactEmail: 'jacobbaqleh@yahoo.com',
  intro:
    'MyKitchenList ("we", "us", or "our") helps you track what is in your fridge, freezer, and pantry and suggests meals based on your inventory. This policy explains what information we collect, how we use it, and the choices you have.',
  sections: [
    {
      heading: 'Information we collect',
      paragraphs: [
        'Account information: When you create an account, we collect your email address and name through our authentication provider (Neon Auth). If you sign in with Google or GitHub, we receive basic profile information from that provider.',
        'Kitchen inventory: Items you add — including name, quantity, expiry date, and storage location — are stored in your account.',
        'Dietary preferences: Allergies and dislikes you enter in Settings are stored with your account.',
        'Photos: If you use photo scan, images you upload are sent to our servers to detect grocery items. Photos may be stored temporarily for processing.',
        'Sharing and chat: If you share your list, we store share links, invited email addresses, and chat messages sent on shared lists.',
        'Usage data: Our hosting providers may collect standard technical logs (IP address, device type, request timestamps) for security and reliability.',
      ],
    },
    {
      heading: 'How we use your information',
      paragraphs: [
        'We use your information to provide the service: storing your inventory, generating AI meal suggestions, sharing lists with people you invite, and keeping you signed in.',
        'We do not sell your personal information. We do not use your data for third-party advertising.',
      ],
    },
    {
      heading: 'Third-party services',
      paragraphs: [
        'We use trusted providers to run MyKitchenList: Neon (database and authentication), Render (API hosting), Vercel (web app hosting), AWS Bedrock (AI meal suggestions and photo analysis), and Box (photo storage). These providers process data only as needed to operate the service.',
      ],
    },
    {
      heading: 'Data retention and deletion',
      paragraphs: [
        'We keep your data while your account is active. You can delete individual items at any time in the app.',
        'You can delete your account and all associated data from Settings. Deletion is permanent and removes your inventory, preferences, and shared lists.',
      ],
    },
    {
      heading: 'Security',
      paragraphs: [
        'We use HTTPS for all communication between the app and our servers. Authentication tokens are stored securely on your device. No method of transmission or storage is 100% secure, but we take reasonable measures to protect your information.',
      ],
    },
    {
      heading: "Children's privacy",
      paragraphs: [
        'MyKitchenList is not directed at children under 13. We do not knowingly collect personal information from children under 13.',
      ],
    },
    {
      heading: 'Changes to this policy',
      paragraphs: [
        'We may update this policy from time to time. We will post the revised policy on this page and update the effective date above.',
      ],
    },
    {
      heading: 'Contact us',
      paragraphs: [
        'Questions about this policy or your data? Email jacobbaqleh@yahoo.com.',
      ],
    },
  ],
};
