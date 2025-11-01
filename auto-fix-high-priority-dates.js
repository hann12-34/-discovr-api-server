/**
 * AUTO-FIX HIGH PRIORITY SCRAPERS
 * Add comprehensive date extraction logic to 18 most important venues
 */

const fs = require('fs');
const path = require('path');

const priority = JSON.parse(fs.readFileSync('scraper-fix-priority.json', 'utf8'));
const highPriority = priority.high;

console.log(`🔧 AUTO-FIXING ${highPriority.length} HIGH PRIORITY SCRAPERS...\n`);

// Comprehensive date extraction code that works with most websites
const comprehensiveDateExtraction = `
          // COMPREHENSIVE DATE EXTRACTION - Works with most event websites
          let dateText = null;
          
          // Try multiple strategies to find the date
          const dateSelectors = [
            'time[datetime]',
            '[datetime]',
            '.date',
            '.event-date', 
            '.show-date',
            '[class*="date"]',
            'time',
            '.datetime',
            '.when',
            '[itemprop="startDate"]',
            '[data-date]',
            '.day',
            '.event-time',
            '.schedule',
            'meta[property="event:start_time"]'
          ];
          
          // Strategy 1: Look in the event element itself
          for (const selector of dateSelectors) {
            const dateEl = $element.find(selector).first();
            if (dateEl.length > 0) {
              dateText = dateEl.attr('datetime') || dateEl.attr('content') || dateEl.text().trim();
              if (dateText && dateText.length > 0 && dateText.length < 100) {
                console.log(\`✓ Found date with \${selector}: \${dateText}\`);
                break;
              }
            }
          }
          
          // Strategy 2: Check parent containers if not found
          if (!dateText) {
            const $parent = $element.closest('.event, .event-item, .show, article, [class*="event"], .card, .listing');
            if ($parent.length > 0) {
              for (const selector of dateSelectors) {
                const dateEl = $parent.find(selector).first();
                if (dateEl.length > 0) {
                  dateText = dateEl.attr('datetime') || dateEl.attr('content') || dateEl.text().trim();
                  if (dateText && dateText.length > 0 && dateText.length < 100) {
                    console.log(\`✓ Found date in parent with \${selector}: \${dateText}\`);
                    break;
                  }
                }
              }
            }
          }
          
          // Strategy 3: Look for common date patterns in nearby text
          if (!dateText) {
            const nearbyText = $element.parent().text();
            // Match patterns like "Nov 4", "November 4", "11/04/2025", etc.
            const datePatterns = [
              /\\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}(,?\\s+\\d{4})?/i,
              /\\b\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4}/,
              /\\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}/i
            ];
            
            for (const pattern of datePatterns) {
              const match = nearbyText.match(pattern);
              if (match) {
                dateText = match[0].trim();
                console.log(\`✓ Found date via pattern matching: \${dateText}\`);
                break;
              }
            }
          }
          
          // Clean up the date text
          if (dateText) {
            dateText = dateText.replace(/\\s+/g, ' ').trim();
            // Remove common prefixes
            dateText = dateText.replace(/^(Date:|When:|Time:)\\s*/i, '');
            // Validate it's not garbage
            if (dateText.length < 5 || dateText.length > 100) {
              console.log(\`⚠️  Invalid date text (too short/long): \${dateText}\`);
              dateText = null;
            }
          }
`;

let fixedCount = 0;

highPriority.forEach((scraper, index) => {
  const filePath = `scrapers/cities/${scraper.city}/${scraper.file}`;
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has comprehensive date extraction
  if (content.includes('COMPREHENSIVE DATE EXTRACTION')) {
    console.log(`✓ [${index + 1}/${highPriority.length}] ${scraper.city}/${scraper.file} - Already fixed`);
    return;
  }
  
  // Find where to inject (before events.push)
  const patterns = [
    // Pattern 1: Before events.push with seenUrls.add
    /(seenUrls\.add\([^)]+\);?\s*(?:\/\/[^\n]*\n)?)\s*(events\.push\(\{)/,
    // Pattern 2: Before events.push without seenUrls
    /(if \([^)]+\) return;?\s*\n)\s*(events\.push\(\{)/,
    // Pattern 3: Just before events.push
    /(\n\s+)(events\.push\(\{)/
  ];
  
  let modified = false;
  
  for (const pattern of patterns) {
    if (content.match(pattern)) {
      content = content.replace(pattern, `$1${comprehensiveDateExtraction}\n          $2`);
      
      // Now update the date field in events.push
      // Replace date: null with date: dateText || null
      content = content.replace(/date:\s*null(?=\s*[,}])/g, 'date: dateText || null');
      
      modified = true;
      break;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ [${index + 1}/${highPriority.length}] ${scraper.city}/${scraper.file}`);
    fixedCount++;
  } else {
    console.log(`⚠️  [${index + 1}/${highPriority.length}] ${scraper.city}/${scraper.file} - Could not auto-fix (manual review needed)`);
  }
});

console.log(`\n${'='.repeat(80)}`);
console.log(`✅ Auto-fixed ${fixedCount} out of ${highPriority.length} high-priority scrapers!`);
console.log(`${'='.repeat(80)}`);

if (fixedCount < highPriority.length) {
  console.log(`\n⚠️  ${highPriority.length - fixedCount} scrapers need manual review`);
}
