const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js') && f.startsWith('scrape-'));

console.log(`🔧 Improving date selectors in ${files.length} scrapers...\n`);

let fixedCount = 0;

files.forEach((file, index) => {
  const filePath = path.join(scrapersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Look for simple date selectors and enhance them
  // Pattern: const dateText = $event.find('.date, [class*="date"], time').text().trim();
  // Enhance to look for more date-related selectors
  
  const simplePattern = /const dateText = \$event\.find\('\.date, \[class\*="date"\], time'\)\.text\(\)\.trim\(\);/g;
  
  if (simplePattern.test(content)) {
    content = content.replace(
      simplePattern,
      `const dateText = $event.find('.date, .datetime, .event-date, .event-time, [class*="date"], [class*="time"], time, .when, .schedule, [datetime], [data-date]').first().text().trim() || $event.find('[datetime]').attr('datetime') || '';`
    );
  }
  
  // Also look for scrapers that don't extract dates at all and add it
  if (!content.includes('dateText') && content.includes('events.push({')) {
    // Find the event push block and add date extraction before it
    const hasDateField = /date:\s*dateText/.test(content);
    
    if (!hasDateField && /const title =/.test(content)) {
      // Add dateText extraction after title extraction
      content = content.replace(
        /(const title = [^;]+;)(\s*)/g,
        `$1$2\n      const dateText = $event.find('.date, .datetime, .event-date, [class*="date"], time, .when, [datetime]').first().text().trim() || $event.find('[datetime]').attr('datetime') || '';\n`
      );
    }
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    if ((index + 1) % 50 === 0) {
      console.log(`✅ [${index + 1}/${files.length}]`);
    }
    fixedCount++;
  }
});

console.log(`\n📊 Fixed ${fixedCount}/${files.length} scrapers`);
