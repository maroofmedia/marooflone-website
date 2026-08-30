const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

function findBrowserPath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }

  const potentialPaths = [
    // Windows Edge
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    // Windows Chrome
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env.PROGRAMFILES || '', 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google\\Chrome\\Application\\chrome.exe'),
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
  ];

  for (const candidate of potentialPaths) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function generatePdf() {
  const executablePath = findBrowserPath();

  if (!executablePath) {
    console.warn('⚠️ No Chrome/Edge binary found. Skipping automated PDF export (HTML version available at /pdf/).');
    return;
  }

  console.log(`Using browser binary: ${executablePath}`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport for clean rendering
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

    const htmlPath = path.resolve(__dirname, '../public/pdf/index.html');
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`PDF source HTML not found at: ${htmlPath}. Make sure Eleventy built the site first.`);
    }

    const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
    console.log(`Loading PDF template: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // Wait for web fonts to load
    await page.evaluateHandle('document.fonts.ready');

    const outputDir = path.resolve(__dirname, '../public');
    const srcDir = path.resolve(__dirname, '../src');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'maroof-lone-profile.pdf');
    const srcOutputPath = path.join(srcDir, 'maroof-lone-profile.pdf');

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '12mm',
        right: '12mm'
      }
    });

    // Also persist to src/ for reliable CI/CD deployment
    fs.copyFileSync(outputPath, srcOutputPath);

    const stats = fs.statSync(outputPath);
    console.log(`✅ PDF successfully generated: ${outputPath} and copied to src/ (${(stats.size / 1024).toFixed(1)} KB)`);
  } finally {
    await browser.close();
  }
}

generatePdf().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
