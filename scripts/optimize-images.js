const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const GALLERY_DIR = path.join(__dirname, '..', 'src', 'gallery', 'gallery-images');
const SUPPORTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff']);
const MAX_DIMENSION = 2000; // Optimal for 4K web displays & fullscreen lightboxes

async function optimizeImages() {
  if (!fs.existsSync(GALLERY_DIR)) {
    return;
  }

  const files = fs.readdirSync(GALLERY_DIR);
  let processedCount = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!SUPPORTED_EXTS.has(ext)) continue;

    const filePath = path.join(GALLERY_DIR, file);
    const inputBuffer = fs.readFileSync(filePath);
    const originalSize = inputBuffer.length;

    try {
      const image = sharp(inputBuffer);
      const metadata = await image.metadata();

      // Check if image needs processing:
      // 1. Has any EXIF metadata (camera, GPS location, timestamps, etc.)
      // 2. Has dimensions larger than MAX_DIMENSION
      // 3. Or file size is larger than 800 KB
      const hasExif = !!metadata.exif;
      const isOversized = metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION;
      const isHeavy = originalSize > 800 * 1024;

      if (!hasExif && !isOversized && !isHeavy) {
        continue;
      }

      // Auto-orient according to EXIF orientation before orientation tag is stripped
      let pipeline = image.rotate();

      if (isOversized) {
        pipeline = pipeline.resize({
          width: metadata.width >= metadata.height ? MAX_DIMENSION : undefined,
          height: metadata.height > metadata.width ? MAX_DIMENSION : undefined,
          withoutEnlargement: true,
          fit: 'inside'
        });
      }

      // Format-specific high-quality compression
      // sharp automatically removes all EXIF/GPS/XMP/IPTC when withMetadata() is not called
      if (ext === '.jpg' || ext === '.jpeg') {
        pipeline = pipeline.jpeg({
          quality: 82,
          mozjpeg: true
        });
      } else if (ext === '.png') {
        pipeline = pipeline.png({
          compressionLevel: 9,
          palette: true,
          quality: 85
        });
      } else if (ext === '.webp') {
        pipeline = pipeline.webp({
          quality: 82
        });
      }

      const outputBuffer = await pipeline.toBuffer();

      // Only write to file if size reduced or EXIF stripped
      if (outputBuffer.length <= originalSize || hasExif) {
        fs.writeFileSync(filePath, outputBuffer);
        processedCount++;
        console.log(`[optimize-images] ✔ Processed ${file}: ${(originalSize / 1024).toFixed(1)} KB -> ${(outputBuffer.length / 1024).toFixed(1)} KB (EXIF stripped)`);
      }
    } catch (err) {
      console.error(`[optimize-images] ✖ Error processing ${file}:`, err.message);
    }
  }

  if (processedCount > 0) {
    console.log(`[optimize-images] Processed ${processedCount} image(s).`);
  }
}

optimizeImages().catch((err) => {
  console.error('[optimize-images] Fatal error:', err);
  process.exit(1);
});
