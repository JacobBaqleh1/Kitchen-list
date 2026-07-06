#!/usr/bin/env node
/**
 * Regenerate mobile app icons from the web favicon (client/public/favicon.svg).
 * Run: cd server && npm run icons:mobile
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'client/public/favicon.svg'));
const out = join(root, 'mobile/assets/images');

const BG = '#ffffff';
const ANDROID_BG = '#E6F4FE';

async function iconOnBackground(size, bg, padding = 0.12) {
  const inner = Math.round(size * (1 - padding * 2));
  const icon = await sharp(svg).resize(inner, inner).png().toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: icon, gravity: 'centre' }])
    .png()
    .toBuffer();
}

async function foregroundTransparent(size) {
  const inner = Math.round(size * 0.62);
  const icon = await sharp(svg).resize(inner, inner).png().toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: icon, gravity: 'centre' }])
    .png()
    .toBuffer();
}

async function solid(size, color) {
  return sharp({
    create: { width: size, height: size, channels: 3, background: color },
  }).png().toBuffer();
}

const jobs = [
  ['icon.png', () => iconOnBackground(1024, BG)],
  ['favicon.png', () => iconOnBackground(48, BG, 0.08)],
  ['splash-icon.png', () => iconOnBackground(288, BG, 0.1)],
  ['android-icon-foreground.png', () => foregroundTransparent(1024)],
  ['android-icon-background.png', () => solid(1024, ANDROID_BG)],
  ['android-icon-monochrome.png', () => sharp(svg).resize(512, 512).png().toBuffer()],
];

for (const [name, fn] of jobs) {
  const buf = await fn();
  await sharp(buf).toFile(join(out, name));
  console.log(`wrote ${name}`);
}
