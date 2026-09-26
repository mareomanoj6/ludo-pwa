const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// Simple pure Node PNG generator
function createPng(width, height, getPixel) {
  // width, height: dimensions
  // getPixel(x, y) returns [r, g, b, a] 0-255
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Generate Ludo Icon: Dark minimalist badge with 4 quadrant colors & dice dots
function drawLudoIcon(size, isMaskable = false) {
  return createPng(size, size, (x, y) => {
    const cx = size / 2;
    const cy = size / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Padding for maskable icon vs standard rounded icon
    const cornerRadius = isMaskable ? 0 : size * 0.22;
    const maxRadius = isMaskable ? size : size * 0.48;

    // Background base: dark slate #0f131a
    let r = 15, g = 19, b = 26, a = 255;

    // Corner mask if not maskable
    if (!isMaskable) {
      const edgeX = Math.abs(dx) - (cx - cornerRadius);
      const edgeY = Math.abs(dy) - (cy - cornerRadius);
      if (edgeX > 0 && edgeY > 0) {
        const cDist = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
        if (cDist > cornerRadius) return [0, 0, 0, 0];
      }
    }

    // Outer subtle border
    const borderThickness = size * 0.03;
    const innerSize = size * (isMaskable ? 0.72 : 0.82);
    const boxLeft = cx - innerSize / 2;
    const boxRight = cx + innerSize / 2;
    const boxTop = cy - innerSize / 2;
    const boxBottom = cy + innerSize / 2;

    if (x >= boxLeft && x <= boxRight && y >= boxTop && y <= boxBottom) {
      // 4 Ludo quadrants with subtle gaps
      const gap = size * 0.03;
      const isLeft = x < cx - gap / 2;
      const isRight = x > cx + gap / 2;
      const isTop = y < cy - gap / 2;
      const isBottom = y > cy + gap / 2;

      if (isLeft && isTop) {
        // Red: #ef4444
        r = 239; g = 68; b = 68;
      } else if (isRight && isTop) {
        // Green: #10b981
        r = 16; g = 185; b = 129;
      } else if (isRight && isBottom) {
        // Yellow: #f59e0b
        r = 245; g = 158; b = 11;
      } else if (isLeft && isBottom) {
        // Blue: #3b82f6
        r = 59; g = 130; b = 246;
      } else {
        // Gap area: center dark slate
        r = 26; g = 32; b = 44;
      }

      // Center white dice pip / circle
      if (dist < size * 0.12) {
        r = 255; g = 255; b = 255;
      } else if (dist < size * 0.14) {
        r = 20; g = 24; b = 33;
      }
    }

    return [r, g, b, a];
  });
}

// Generate icons
const iconDir = path.join(__dirname, 'icons');
fs.writeFileSync(path.join(iconDir, 'icon-192.png'), drawLudoIcon(192, false));
fs.writeFileSync(path.join(iconDir, 'icon-512.png'), drawLudoIcon(512, false));
fs.writeFileSync(path.join(iconDir, 'icon-maskable-512.png'), drawLudoIcon(512, true));

// Also generate crisp SVG icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" rx="112" fill="#0d1117"/>
  <rect x="76" y="76" width="160" height="160" rx="28" fill="#ef4444"/>
  <rect x="276" y="76" width="160" height="160" rx="28" fill="#10b981"/>
  <rect x="276" y="276" width="160" height="160" rx="28" fill="#f59e0b"/>
  <rect x="76" y="276" width="160" height="160" rx="28" fill="#3b82f6"/>
  <circle cx="256" cy="256" r="44" fill="#0d1117"/>
  <circle cx="256" cy="256" r="30" fill="#ffffff"/>
  <circle cx="156" cy="156" r="22" fill="#ffffff" opacity="0.95"/>
  <circle cx="356" cy="156" r="22" fill="#ffffff" opacity="0.95"/>
  <circle cx="356" cy="356" r="22" fill="#ffffff" opacity="0.95"/>
  <circle cx="156" cy="356" r="22" fill="#ffffff" opacity="0.95"/>
</svg>`;
fs.writeFileSync(path.join(iconDir, 'icon.svg'), svgIcon);

console.log('Icons generated successfully!');
