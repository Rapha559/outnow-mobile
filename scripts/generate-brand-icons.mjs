import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const source = 'assets/images/outnow-app-logo.jpg';
const iconPath = 'assets/images/icon.png';
const foregroundPath = 'assets/images/android-icon-foreground.png';

await mkdir('assets/images', { recursive: true });

const sourceSquare = await sharp(source)
  .resize(1024, 1024, { fit: 'cover', position: 'centre' })
  .png()
  .toBuffer();

const mainLogo = await sharp(sourceSquare)
  .resize(900, 900, { fit: 'contain' })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 4,
    background: { r: 5, g: 5, b: 5, alpha: 1 },
  },
})
  .composite([{ input: mainLogo, left: 62, top: 62 }])
  .png()
  .toFile(iconPath);

const adaptiveLogo = await sharp(sourceSquare)
  .resize(720, 720, { fit: 'contain' })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{ input: adaptiveLogo, left: 152, top: 152 }])
  .png()
  .toFile(foregroundPath);

console.log('Generated OutNow app icon assets from assets/images/outnow-app-logo.jpg');
