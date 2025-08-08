const fs = require('fs');
const path = require('path');

const scrapersDirectory = path.join(__dirname, '../cities');
const compliantScrapers = [];
const nonCompliantScrapers = [];

function auditScraper(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const importsCityUtil = content.includes(`require('../../utils/city-util.js')`);
    const usesGetCityFromArgs = content.includes('getCityFromArgs()');

    if (importsCityUtil && usesGetCityFromArgs) {
      compliantScrapers.push(path.basename(filePath));
    } else {
      nonCompliantScrapers.push(path.basename(filePath));
    }
  } catch (error) {
    console.error(`Error auditing file ${filePath}:`, error);
  }
}

function findScrapers(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findScrapers(fullPath);
    } else if (file.startsWith('scrape-') && file.endsWith('.js')) {
      auditScraper(fullPath);
    }
  }
}

console.log('Starting scraper audit...');
findScrapers(scrapersDirectory);

console.log('\n--- Audit Results ---');
console.log(`✅ Compliant Scrapers: ${compliantScrapers.length}`);
console.log(`❌ Non-Compliant Scrapers: ${nonCompliantScrapers.length}`);

if (nonCompliantScrapers.length > 0) {
  console.log('\n--- Non-Compliant Scrapers List ---');
  nonCompliantScrapers.forEach(scraper => console.log(`- ${scraper}`));
}

console.log('\nAudit complete.');
