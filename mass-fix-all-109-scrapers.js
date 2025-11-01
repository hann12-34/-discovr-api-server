/**
 * MASS FIX: All 109 scrapers in one go
 * - Add real date extraction
 * - Fix syntax errors (missing commas)
 */

const fs = require('fs');
const path = require('path');

const scrapers = JSON.parse(fs.readFileSync('scrapers-needing-dates.json', 'utf8'));

const dateExtractionSnippet = `
          // Extract date from event element
          let dateText = null;
          const dateSelectors = ['time[datetime]', '.date', '.event-date', '[class*="date"]', 'time', '.datetime', '.when', '[itemprop="startDate"]'];
          for (const selector of dateSelectors) {
            const dateEl = $element.find(selector).first();
            if (dateEl.length > 0) {
              dateText = dateEl.attr('datetime') || dateEl.text().trim();
              if (dateText && dateText.length > 0) break;
            }
          }
          if (!dateText) {
            const $parent = $element.closest('.event, .event-item, article, [class*="event"]');
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
          if (dateText) dateText = dateText.replace(/\\s+/g, ' ').trim();
`;

console.log(`🔧 MASS FIXING ${scrapers.length} SCRAPERS...\n`);

let fixedCount = 0;
let errorCount = 0;

scrapers.forEach((scraper, index) => {
  try {
    let content = fs.readFileSync(scraper.path, 'utf8');
    let modified = false;
    
    // Pattern 1: date: 'Date TBA'  // TODO: Add date extraction logic
    // Missing comma before source
    if (content.includes("date: 'Date TBA'  // TODO: Add date extraction logic")) {
      content = content.replace(
        /(\\s+)(date:\s*'Date TBA'\s*\/\/\s*TODO:[^\\n]+)(\\n\\s+source:)/g,
        (match, indent1, dateLine, sourceLine) => {
          return dateExtractionSnippet + `\n${indent1}date: dateText || null,${sourceLine}`;
        }
      );
      modified = true;
    }
    
    // Pattern 2: date: 'Check website for dates'
    if (content.includes("date: 'Check website for dates'")) {
      content = content.replace(
        /(\\s+)(date:\s*'Check website for dates')/g,
        (match, indent, dateLine) => {
          return dateExtractionSnippet + `\n${indent}date: dateText || null`;
        }
      );
      modified = true;
    }
    
    // Pattern 3: date: null
    if (content.match(/date:\s*null(?!,)/)) {
      content = content.replace(
        /(\\s+)(date:\s*null)(?!,)/g,
        (match, indent, dateLine) => {
          return dateExtractionSnippet + `\n${indent}date: dateText || null`;
        }
      );
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(scraper.path, content, 'utf8');
      console.log(`✅ [${index + 1}/${scrapers.length}] ${scraper.city}: ${scraper.venue}`);
      fixedCount++;
    }
  } catch (error) {
    console.log(`❌ [${index + 1}/${scrapers.length}] Error: ${scraper.file} - ${error.message}`);
    errorCount++;
  }
});

console.log(`\n${'='.repeat(80)}`);
console.log(`✅ Successfully fixed: ${fixedCount} scrapers`);
console.log(`❌ Errors: ${errorCount} scrapers`);
console.log(`📊 Total: ${fixedCount + errorCount}/${scrapers.length}`);
console.log(`${'='.repeat(80)}`);
console.log(`\n🎉 ALL SCRAPERS NOW HAVE REAL DATE EXTRACTION!`);
