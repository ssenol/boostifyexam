// Dev sürümü ikonlarını normal ikonlardan üretir: assets/images/dev-badge.png'yi üzerlerine bindirir.
// Normal ikon değiştiğinde proje kökünden `npm run icons:dev` çalıştırmak yeterli, dev ikonları ayrıca tasarlanmaz.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const IMAGES = path.join(process.cwd(), 'assets', 'images');

// Konumlar 1024x1024 ikona göre (Figma'daki dev ikonlarından ölçüldü).
// iOS'ta badge altta; Android'de maske kenarları kırptığı için ortada.
// Koyu ikonda badge, iOS koyu modundaki genel parlaklığa uysun diye karartılır.
const TARGETS = [
  { from: 'icon.png', to: 'icon-dev.png', x: 327, y: 694, brightness: 1 },
  { from: 'icon-dark.png', to: 'icon-dev-dark.png', x: 327, y: 694, brightness: 0.66 },
  { from: 'adaptive-icon.png', to: 'adaptive-icon-dev.png', x: 327, y: 427, brightness: 1 },
];

const badge = PNG.sync.read(fs.readFileSync(path.join(IMAGES, 'dev-badge.png')));

for (const { from, to, x, y, brightness } of TARGETS) {
  const icon = PNG.sync.read(fs.readFileSync(path.join(IMAGES, from)));
  if (icon.width !== 1024 || icon.height !== 1024) {
    throw new Error(`${from} 1024x1024 olmalı (şu an ${icon.width}x${icon.height})`);
  }

  // Badge'i alfa karışımıyla ikonun üzerine bindir
  for (let by = 0; by < badge.height; by++) {
    for (let bx = 0; bx < badge.width; bx++) {
      const b = (by * badge.width + bx) * 4;
      const alpha = badge.data[b + 3] / 255;
      if (alpha === 0) continue;
      const i = ((y + by) * icon.width + (x + bx)) * 4;
      for (let c = 0; c < 3; c++) {
        icon.data[i + c] = Math.round(badge.data[b + c] * brightness * alpha + icon.data[i + c] * (1 - alpha));
      }
      icon.data[i + 3] = Math.max(icon.data[i + 3], badge.data[b + 3]);
    }
  }

  fs.writeFileSync(path.join(IMAGES, to), PNG.sync.write(icon));
  console.log(`${from} -> ${to}`);
}
