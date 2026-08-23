const sharp = require('sharp');

// Odo icon: asphalt-dark field, a yellow road sweeping up-right with a
// dashed center line, and a bold horizon glow. Reads at 60px.
const svg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#23262B"/>
      <stop offset="1" stop-color="#121417"/>
    </linearGradient>
    <linearGradient id="road" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#3A3E45"/>
      <stop offset="1" stop-color="#2B2F35"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.5" cy="0.32" r="0.5">
      <stop offset="0" stop-color="#FFC93C" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#FFC93C" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="512" cy="330" r="260" fill="url(#sun)"/>
  <circle cx="512" cy="330" r="118" fill="#FFC93C"/>
  <!-- road: perspective trapezoid -->
  <path d="M 462 330 L 562 330 L 810 1024 L 214 1024 Z" fill="url(#road)"/>
  <!-- road edges -->
  <path d="M 462 330 L 214 1024 L 258 1024 L 486 330 Z" fill="#FFC93C" opacity="0.85"/>
  <path d="M 562 330 L 810 1024 L 766 1024 L 538 330 Z" fill="#FFC93C" opacity="0.85"/>
  <!-- dashed center line -->
  <path d="M 512 360 L 512 1024" stroke="#FFC93C" stroke-width="34" stroke-dasharray="88 66" stroke-linecap="round"/>
</svg>`;

(async () => {
  const buf = Buffer.from(svg);
  await sharp(buf).resize(1024, 1024).png().toFile('../assets/icon.png');
  // Android adaptive: foreground = road art on transparent, background = flat dark
  await sharp(buf).resize(1024, 1024).png().toFile('../assets/android-icon-foreground.png');
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#15171A' } })
    .png().toFile('../assets/android-icon-background.png');
  await sharp(buf).resize(1024, 1024).grayscale().png().toFile('../assets/android-icon-monochrome.png');
  await sharp(buf).resize(48, 48).png().toFile('../assets/favicon.png');
  await sharp(buf).resize(512, 512).png().toFile('../assets/splash-icon.png');
  console.log('icons written');
})();
