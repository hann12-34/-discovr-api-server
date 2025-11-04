#!/usr/bin/env node

/**
 * MASS FIX EMPTY SCRAPERS
 * Add comprehensive date extraction to all scrapers returning 0 events
 */

const fs = require('fs');
const path = require('path');

const ULTRA_COMPREHENSIVE_DATE_EXTRACTION = `
          // Ultra-comprehensive date extraction
          let dateText = null;
          
          const dateSelectors = [
            // Datetime attributes
            'time[datetime]', '[datetime]', '[data-date]', '[data-datetime]',
            '[data-start-date]', '[data-event-date]', '[itemprop="startDate"]',
            'meta[property="event:start_time"]', 'meta[itemprop="startDate"]',
            
            // Common classes
            '.date', '.event-date', '.show-date', '.concert-date', '.performance-date',
            '.datetime', '.when', '.event-time', '.show-time', '.time',
            '.schedule', '.day', '.month', '.year', '.event-day',
            
            // Event platform specific
            '.eec_event_date', '.tribe-events-start-date', '.eventlist-datetag-startdate',
            '.event-meta-date', '.wc-time', '.fc-time',
            
            // Generic patterns
            '[class*="date"]', '[class*="time"]', '[class*="datetime"]',
            '[id*="date"]', '[id*="time"]',
            
            // Backup
            'time', '.calendar', '.timestamp', '.posted'
          ];
          
          // Strategy 1: Direct search in element
          for (const selector of dateSelectors) {
            const dateEl = $event.find(selector).first();
            if (dateEl.length > 0) {
              const extracted = dateEl.attr('datetime') || dateEl.attr('content') ||
                              dateEl.attr('data-date') || dateEl.attr('data-datetime') ||
                              dateEl.text().trim();
              if (extracted && extracted.length >= 5 && extracted.length <= 100) {
                dateText = extracted;
                break;
              }
            }
          }
          
          // Strategy 2: Parent container
          if (!dateText) {
            const $parent = $event.closest('.event, .show, article, [class*="event"], .listing, .card');
            if ($parent.length > 0) {
              for (const selector of dateSelectors) {
                const dateEl = $parent.find(selector).first();
                if (dateEl.length > 0) {
                  const extracted = dateEl.attr('datetime') || dateEl.attr('content') ||
                                  dateEl.text().trim();
                  if (extracted && extracted.length >= 5 && extracted.length <= 100) {
                    dateText = extracted;
                    break;
                  }
                }
              }
            }
          }
          
          // Strategy 3: URL pattern (e.g., /events/2025-01-15 or /show/2025/01/15)
          if (!dateText && url) {
            const urlDatePatterns = [
              /\\/(\\d{4})-(\\d{2})-(\\d{2})/,  // /2025-01-15
              /\\/(\\d{4})\\/(\\d{2})\\/(\\d{2})/,  // /2025/01/15
              /-(\\d{4})(\\d{2})(\\d{2})/,  // -20250115
            ];
            
            for (const pattern of urlDatePatterns) {
              const match = url.match(pattern);
              if (match) {
                dateText = \`\${match[1]}-\${match[2]}-\${match[3]}\`;
                console.log(\`✓ Extracted date from URL for "\${title}": \${dateText}\`);
                break;
              }
            }
          }
          
          // Strategy 4: Regex patterns from text
          if (!dateText) {
            const searchText = ($event.text() + ' ' + $event.parent().text()).substring(0, 500);
            const datePatterns = [
              // "January 15, 2025" or "Jan 15, 2025"
              /\\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[,\\s]+\\d{1,2}(?:st|nd|rd|th)?[,\\s]+\\d{4}/i,
              // "15 January 2025"
              /\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[,\\s]+\\d{4}/i,
              // "Jan 15" or "January 15" (will add current year)
              /\\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}(?:st|nd|rd|th)?\\b/i,
              // "2025-01-15" ISO format
              /\\b\\d{4}-\\d{2}-\\d{2}\\b/,
              // "01/15/2025" or "1/15/25"
              /\\b\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}\\b/
            ];
            
            for (const pattern of datePatterns) {
              const match = searchText.match(pattern);
              if (match) {
                dateText = match[0].trim();
                // Add current year if missing
                if (!/\\d{4}/.test(dateText)) {
                  dateText += \`, \${new Date().getFullYear()}\`;
                }
                break;
              }
            }
          }
          
          // Clean up
          if (dateText) {
            dateText = dateText.replace(/\\s+/g, ' ').trim();
            dateText = dateText.replace(/^(Date:|When:|Time:|On:|Posted:|Published:)\\s*/i, '');
            // Remove ordinal suffixes
            dateText = dateText.replace(/(\\d+)(st|nd|rd|th)/g, '$1');
            if (dateText.length < 5 || dateText.length > 100) dateText = null;
          }
`;

async function massFix() {
  console.log('🚀 MASS FIX - Adding comprehensive date extraction to ALL scrapers\n');
  console.log('='.repeat(70));

  const cityDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
  const files = fs.readdirSync(cityDir)
    .filter(f => f.endsWith('.js') && !f.endsWith('.bak'));

  let fixed = 0;
  let skipped = 0;
  let alreadyGood = 0;

  for (const file of files) {
    const filePath = path.join(cityDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if already has ultra-comprehensive
    if (content.includes('Ultra-comprehensive date extraction')) {
      alreadyGood++;
      continue;
    }

    // Pattern: Find any simple date extraction
    const patterns = [
      // Pattern 1: let dateText = ... with simple logic
      /let dateText = null;[\s\S]{50,1500}?if \(dateText\)/,
      // Pattern 2: const dateText = direct assignment
      /const dateText = \$[^;]{20,200};/,
      // Pattern 3: Date extraction comment followed by code
      /\/\/ (?:Extract|Get|Find) date[\s\S]{50,1000}?(?:const|let) dateText/i,
      // Pattern 4: Enhanced date extraction (from previous fixes)
      /\/\/ Enhanced (?:multi-strategy )?date extraction[\s\S]{50,2000}?if \(dateText\)/i
    ];

    let replaced = false;
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, ULTRA_COMPREHENSIVE_DATE_EXTRACTION + '\n          if (dateText)');
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${file}`);
        fixed++;
        replaced = true;
        break;
      }
    }

    if (!replaced) {
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Enhanced: ${fixed} scrapers`);
  console.log(`⏭️  Already good: ${alreadyGood} scrapers`);
  console.log(`⚠️  Skipped (no date extraction found): ${skipped} scrapers`);
  console.log(`\n🎯 Total: ${files.length} scrapers processed`);
}

massFix().then(() => {
  console.log('\n✅ MASS FIX COMPLETE!');
  console.log('📋 Run test to see improvement');
  process.exit(0);
});
