const fs = require('fs');
const path = require('path');

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js') && f.startsWith('scrape-'));

console.log(`🚀 Making scrapers extract dates from EVERYWHERE...\n`);

let fixedCount = 0;

files.forEach((file, index) => {
  const filePath = path.join(scrapersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Find scrapers that extract dateText with limited selectors
  const simpleSelectorPattern = /const dateText = \$event\.find\('\.date[^']+'\)[^;]+;/;
  
  if (simpleSelectorPattern.test(content)) {
    // Replace with SUPER aggressive date extraction
    content = content.replace(
      /const dateText = \$event\.find\('[^']+'\)\.first\(\)\.text\(\)\.trim\(\)(?: \|\| \$event\.find\([^)]+\)\.attr\([^)]+\))?(?: \|\| '')?;/g,
      `const dateText = (() => {
        // Try datetime attribute (most reliable)
        const dt = $event.find('[datetime]').attr('datetime');
        if (dt) return dt;
        
        // Try data-date
        const dd = $event.attr('data-date') || $event.find('[data-date]').attr('data-date');
        if (dd) return dd;
        
        // Try specific date selectors
        const selectors = ['.date', '.datetime', '.event-date', '.start-date', '.date-time', 
                          '[class*="date"]', 'time', '.when', '.schedule', '.event-time'];
        for (const sel of selectors) {
          const text = $event.find(sel).first().text().trim();
          if (text && text.length > 4) return text;
        }
        
        // Last resort: scan all text for date patterns
        const allText = $event.text();
        const patterns = [
          /\\d{4}-\\d{2}-\\d{2}/,
          /\\d{1,2}\\/\\d{1,2}\\/\\d{4}/,
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2},?\\s+\\d{4}/i,
          /(January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}/i
        ];
        
        for (const pattern of patterns) {
          const match = allText.match(pattern);
          if (match) return match[0];
        }
        
        return '';
      })();`
    );
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    if ((index + 1) % 50 === 0) {
      console.log(`✅ [${index + 1}/${files.length}]`);
    }
    fixedCount++;
  }
});

console.log(`\n📊 Supercharged ${fixedCount}/${files.length} scrapers!`);
console.log(`\n🎯 Scrapers now search EVERYWHERE for dates!`);
