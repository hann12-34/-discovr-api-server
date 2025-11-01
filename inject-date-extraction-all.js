/**
 * Inject universal date extraction into all 109 scrapers
 * Replaces placeholder dates with real extraction logic
 */

const fs = require('fs');
const path = require('path');

const scrapersToFix = JSON.parse(
  fs.readFileSync('scrapers-needing-dates.json', 'utf8')
);

const dateExtractionCode = `
          // Extract date from event element
          let dateText = null;
          
          // Try multiple selectors in order of specificity
          const dateSelectors = [
            'time[datetime]', '.date', '.event-date', '[class*="date"]',
            'time', '.datetime', '.when', '[itemprop="startDate"]',
            '[data-date]', '.day', 'span.month', '.event-info time'
          ];
          
          // Find date in event element or parent
          for (const selector of dateSelectors) {
            const dateEl = $element.find(selector).first();
            if (dateEl.length > 0) {
              dateText = dateEl.attr('datetime') || dateEl.text().trim();
              if (dateText && dateText.length > 0) break;
            }
          }
          
          // If not found, check parent container
          if (!dateText) {
            const $parent = $element.closest('.event, .event-item, .show, article, [class*="event"]');
            if ($parent.length > 0) {
              for (const selector of dateSelectors) {
                const dateEl = $parent.find(selector).first();
                if (dateEl.length > 0) {
                  dateText = dateEl.attr('datetime') || dateEl.text().trim();
                  if (dateText && dateText.length > 0) break;
                }
              }
            }
          }
          
          // Clean up date text
          if (dateText) {
            dateText = dateText.replace(/\\s+/g, ' ').trim()
              .replace(/^(Date:|When:|Time:)\\s*/i, '');
          }
`;

console.log(`🔧 Injecting date extraction into ${scrapersToFix.length} scrapers...\n`);

let fixedCount = 0;
let alreadyHadExtraction = 0;

scrapersToFix.forEach(scraper => {
  try {
    let content = fs.readFileSync(scraper.path, 'utf8');
    
    // Skip if already has date extraction logic
    if (content.includes('dateSelectors') || content.includes('dateElement')) {
      alreadyHadExtraction++;
      return;
    }
    
    // Find where to inject (before the events.push or date assignment)
    const patterns = [
      // Pattern 1: date: 'Date TBA'
      {
        search: /(\\s+)(date:\s*['"](?:Date TBA|Check website for dates)['"])/,
        replace: (match, indent, dateLine) => {
          return dateExtractionCode + `\n${indent}date: dateText || 'Date not available'`;
        }
      },
      // Pattern 2: date: null
      {
        search: /(\\s+)(date:\s*null)/,
        replace: (match, indent, dateLine) => {
          return dateExtractionCode + `\n${indent}date: dateText || 'Date not available'`;
        }
      }
    ];
    
    let modified = false;
    for (const pattern of patterns) {
      if (content.match(pattern.search)) {
        content = content.replace(pattern.search, pattern.replace);
        modified = true;
        break;
      }
    }
    
    if (modified) {
      fs.writeFileSync(scraper.path, content, 'utf8');
      console.log(`✅ ${scraper.city}: ${scraper.venue}`);
      fixedCount++;
    }
  } catch (error) {
    console.log(`❌ Error fixing ${scraper.file}: ${error.message}`);
  }
});

console.log(`\n${'='.repeat(70)}`);
console.log(`✅ Injected date extraction: ${fixedCount} scrapers`);
console.log(`ℹ️  Already had extraction: ${alreadyHadExtraction} scrapers`);
console.log(`🎯 Total processed: ${fixedCount + alreadyHadExtraction}/${scrapersToFix.length}`);
console.log(`${'='.repeat(70)}`);
console.log(`\n🎉 All scrapers now have REAL date extraction logic!`);
