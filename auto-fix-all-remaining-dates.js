/**
 * AUTO-FIX ALL REMAINING SCRAPERS
 * Fix the 100 medium and low priority scrapers
 */

const fs = require('fs');

const priority = JSON.parse(fs.readFileSync('scraper-fix-priority.json', 'utf8'));
const toFix = [...priority.medium, ...priority.low];

console.log(`🔧 AUTO-FIXING ${toFix.length} REMAINING SCRAPERS...\n`);

// Same comprehensive date extraction code
const comprehensiveDateExtraction = `
          // COMPREHENSIVE DATE EXTRACTION
          let dateText = null;
          const dateSelectors = [
            'time[datetime]', '[datetime]', '.date', '.event-date', '.show-date',
            '[class*="date"]', 'time', '.datetime', '.when', '[itemprop="startDate"]',
            '[data-date]', '.day', '.event-time', '.schedule'
          ];
          
          for (const selector of dateSelectors) {
            const dateEl = $element.find(selector).first();
            if (dateEl.length > 0) {
              dateText = dateEl.attr('datetime') || dateEl.attr('content') || dateEl.text().trim();
              if (dateText && dateText.length > 0 && dateText.length < 100) break;
            }
          }
          
          if (!dateText) {
            const $parent = $element.closest('.event, .event-item, .show, article, [class*="event"]');
            if ($parent.length > 0) {
              for (const selector of dateSelectors) {
                const dateEl = $parent.find(selector).first();
                if (dateEl.length > 0) {
                  dateText = dateEl.attr('datetime') || dateEl.attr('content') || dateEl.text().trim();
                  if (dateText && dateText.length > 0 && dateText.length < 100) break;
                }
              }
            }
          }
          
          if (dateText) {
            dateText = dateText.replace(/\\s+/g, ' ').trim().replace(/^(Date:|When:|Time:)\\s*/i, '');
            if (dateText.length < 5 || dateText.length > 100) dateText = null;
          }
`;

let fixedCount = 0;
let alreadyFixed = 0;

toFix.forEach((scraper, index) => {
  const filePath = `scrapers/cities/${scraper.city}/${scraper.file}`;
  
  if (!fs.existsSync(filePath)) {
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('COMPREHENSIVE DATE EXTRACTION') || content.includes('// Extract date from event element')) {
    alreadyFixed++;
    return;
  }
  
  const patterns = [
    /(seenUrls\.add\([^)]+\);?\s*(?:\/\/[^\n]*\n)?)\s*(events\.push\(\{)/,
    /(if \([^)]+\) return;?\s*\n)\s*(events\.push\(\{)/,
    /(\n\s+)(events\.push\(\{)/
  ];
  
  let modified = false;
  
  for (const pattern of patterns) {
    if (content.match(pattern)) {
      content = content.replace(pattern, `$1${comprehensiveDateExtraction}\n          $2`);
      content = content.replace(/date:\s*null(?=\s*[,}])/g, 'date: dateText || null');
      modified = true;
      break;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    if ((index + 1) % 10 === 0) {
      console.log(`✅ Fixed ${index + 1}/${toFix.length}...`);
    }
    fixedCount++;
  }
});

console.log(`\n${'='.repeat(80)}`);
console.log(`✅ Auto-fixed: ${fixedCount}`);
console.log(`✓ Already fixed: ${alreadyFixed}`);
console.log(`📊 Total processed: ${fixedCount + alreadyFixed}/${toFix.length}`);
console.log(`${'='.repeat(80)}`);
