const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js') && f.startsWith('scrape-'));

const issues = [];

files.forEach(file => {
  const filePath = path.join(scrapersDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  const usesDateParsing = content.includes('parseDateText') || content.includes('parseEventDate');
  const hasDateValidation = content.includes('if (!dateText') || 
                            content.includes('if (!dateInfo') ||
                            content.includes('if (!eventDate');
  
  if (usesDateParsing && !hasDateValidation) {
    issues.push(file);
  }
});

console.log(`Found ${issues.length} scrapers missing date validation:\n`);
issues.forEach(f => console.log(`  ${f}`));
