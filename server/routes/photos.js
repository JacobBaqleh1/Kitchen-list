import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const BoxSDK = require('box-node-sdk').default;
import { Readable } from 'stream';
import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import { db } from '../db.js';
import { receipts } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const anthropic = new AnthropicBedrock({
  awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
  awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION || 'us-east-1',
});

function getBoxClient() {
  const sdk = BoxSDK.getPreconfiguredInstance({
    boxAppSettings: {
      clientID: process.env.BOX_CLIENT_ID,
      clientSecret: process.env.BOX_CLIENT_SECRET,
      appAuth: {
        publicKeyID: process.env.BOX_PUBLIC_KEY_ID,
        privateKey: process.env.BOX_PRIVATE_KEY.replace(/\\n/g, '\n'),
        passphrase: process.env.BOX_PASSPHRASE,
      },
    },
    enterpriseID: process.env.BOX_ENTERPRISE_ID,
  });
  return sdk.getAppAuthClient('enterprise');
}

async function getOrCreateFolder(client, parentId, name) {
  const resp = await client.folders.getItems(parentId, { limit: 1000 });
  const found = resp.entries.find(e => e.type === 'folder' && e.name === name);
  if (found) return found.id;
  const created = await client.folders.create(parentId, name);
  return created.id;
}

router.post('/scan', upload.single('image'), async (req, res) => {
  const { type } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No image provided' });
  if (!['food', 'receipt'].includes(type)) return res.status(400).json({ error: 'type must be food or receipt' });

  try {
    // 1. Compress with sharp
    const compressed = await sharp(req.file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    // 2. Upload to Box
    const client = getBoxClient();
    const photosId = await getOrCreateFolder(client, '0', 'photos');
    const userFolderId = await getOrCreateFolder(client, photosId, req.user.id);
    const filename = `${Date.now()}.jpg`;
    const stream = Readable.from(compressed);
    const uploaded = await client.files.uploadFile(userFolderId, filename, stream);
    const boxFileId = uploaded.entries[0].id;

    // 3. Save to receipts table
    await db.insert(receipts).values({ userId: req.user.id, boxFileId, photoType: type });

    // 4. Send to Claude for analysis
    const systemPrompt = type === 'receipt'
      ? 'Extract every grocery/food item from this receipt image. Return ONLY valid JSON, no markdown: { "items": [{ "name": "string", "quantity": 1 }] } Ignore prices, totals, store name, dates, and non-food items.'
      : 'Identify every visible food or grocery item in this photo. Estimate quantity where possible. Return ONLY valid JSON, no markdown: { "items": [{ "name": "string", "quantity": 1 }] } Only include food items — ignore packaging, surfaces, and non-food objects.';

    const response = await anthropic.messages.create({
      model: 'us.anthropic.claude-opus-4-5-20251101-v1:0',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: compressed.toString('base64') },
          },
          { type: 'text', text: 'Analyze this image.' },
        ],
      }],
    });

    // 5. Parse and return detected items (no DB insert yet — client confirms first)
    const raw = response.content[0].text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    try {
      const parsed = JSON.parse(raw);
      res.json({ items: parsed.items });
    } catch {
      res.status(500).json({ error: 'Could not read photo, please try again' });
    }
  } catch (e) {
    console.error('Photo scan error:', e.message);
    res.status(500).json({ error: e.message || 'Could not read photo, please try again' });
  }
});

export default router;
