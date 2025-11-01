const fs = require('fs');
const path = require('path');

const raFiles = [
  'scrape-bambi-nightclub-events.js',
  'scrape-stories-nightclub-events.js',
  'scrape-velvet-underground-events.js'
];

for (const file of raFiles) {
  const filepath = path.join(__dirname, 'scrapers', 'cities', 'Toronto', file);
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Replace puppeteer with puppeteer-extra + stealth
  content = content.replace(
    "const puppeteer = require('puppeteer');",
    "const puppeteer = require('puppeteer-extra');\nconst StealthPlugin = require('puppeteer-extra-plugin-stealth');\npuppeteer.use(StealthPlugin());"
  );
  
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`✅ Updated ${file} with stealth plugin`);
}

console.log('\n🕵️ All RA scrapers now use stealth to bypass Cloudflare!');
