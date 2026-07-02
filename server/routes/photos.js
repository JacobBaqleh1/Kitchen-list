import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const BoxSDK = require('box-node-sdk').default;
import { Readable } from 'stream';
import { db } from '../db.js';
import { receipts } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';
import { llmRateLimit } from '../middleware/rateLimit.js';
import { invokeNova, extractJson, NOVA_MODELS } from '../lib/nova.js';

const router = Router();
router.use(requireAuth);
// Cap photo scans per user (each one is an LLM vision call).
router.use(llmRateLimit({ windowMs: 10 * 60 * 1000, max: 30 }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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

    const raw = await invokeNova({
      model: NOVA_MODELS.lite,
      maxTokens: 1024,
      system: systemPrompt,
      user: 'Analyze this image.',
      images: [{ format: 'jpeg', data: compressed.toString('base64') }],
    });

    // 5. Parse and return detected items (no DB insert yet — client confirms first)
    const parsed = extractJson(raw);
    if (!parsed || !Array.isArray(parsed.items)) {
      console.error('Nova raw response:', String(raw).slice(0, 500));
      return res.status(500).json({ error: 'Could not read photo, please try again' });
    }
    res.json({ items: parsed.items });
  } catch (e) {
    console.error('Photo scan error:', e.message);
    res.status(500).json({ error: e.message || 'Could not read photo, please try again' });
  }
});

router.post('/parse-text', async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const raw = await invokeNova({
      model: NOVA_MODELS.lite,
      maxTokens: 1024,
      system: 'You extract grocery and food items from noisy pasted text. Return ONLY valid JSON, no markdown: { "items": [{ "name": "string", "quantity": 1 }] }. Split concatenated words into likely grocery items where appropriate (example: "apricotsushi" -> apricot, sushi). Ignore prices, discounts, dates, store metadata, order numbers, and non-food lines.',
      user: `Parse this text into grocery items:\n\n${text}`,
    });

    const parsed = extractJson(raw);
    if (!parsed || !Array.isArray(parsed.items)) {
      console.error('Nova raw response:', String(raw).slice(0, 500));
      return res.status(500).json({ error: 'Could not parse text, please try again' });
    }

    const items = parsed.items
      .map((item) => ({
        name: String(item?.name || '').trim(),
        quantity: Number(item?.quantity) > 0 ? Number(item.quantity) : 1,
      }))
      .filter(item => item.name);

    res.json({ items });
  } catch (e) {
    console.error('Text parse error:', e.message);
    res.status(500).json({ error: e.message || 'Could not parse text, please try again' });
  }
});

export default router;
