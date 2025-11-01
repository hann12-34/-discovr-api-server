const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Analyzing scrapers with 0 events...\n');

// Run import and capture output
const output = execSync('node ImportFiles/import-all-toronto-events.js 2>&1', {
  cwd: __dirname,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024
});

// Find all scrapers that return 0 events (not errors)
const lines = output.split('\n');
const zeroEventScrapers = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('✅ Scraped 0 events from')) {
    const match = line.match(/✅ Scraped 0 events from (.+)/);
    if (match) {
      zeroEventScrapers.push(match[1]);
    }
  }
}

console.log(`Found ${zeroEventScrapers.length} scrapers returning 0 events:\n`);

// Now check each scraper to see if it has date parsing
const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
const issues = {
  noDateParsing: [],
  hasDateParsing: []
};

zeroEventScrapers.forEach(venueName => {
  // Find the scraper file
  const files = fs.readdirSync(scrapersDir);
  const scraperFile = files.find(f => {
    const content = fs.readFileSync(path.join(scrapersDir, f), 'utf8');
    return content.includes(`from ${venueName}`);
  });
  
  if (scraperFile) {
    const content = fs.readFileSync(path.join(scrapersDir, scraperFile), 'utf8');
    
    // Check if it has date parsing
    const hasDateParsing = content.includes('parseDateText') || 
                          content.includes('parseEventDate') ||
                          content.includes('new Date(');
    
    if (hasDateParsing) {
      issues.hasDateParsing.push({ name: venueName, file: scraperFile });
    } else {
      issues.noDateParsing.push({ name: venueName, file: scraperFile });
    }
  }
});

console.log(`\n📊 Analysis:`);
console.log(`- Scrapers with date parsing: ${issues.hasDateParsing.length}`);
console.log(`- Scrapers WITHOUT date parsing: ${issues.noDateParsing.length}`);

if (issues.noDateParsing.length > 0) {
  console.log(`\n❌ Scrapers missing date parsing:`);
  issues.noDateParsing.slice(0, 10).forEach(s => {
    console.log(`   - ${s.name} (${s.file})`);
  });
}

console.log(`\n✅ Scrapers with date parsing but 0 events:`);
issues.hasDateParsing.slice(0, 15).forEach(s => {
  console.log(`   - ${s.name}`);
});
