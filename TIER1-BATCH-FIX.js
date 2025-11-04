#!/usr/bin/env node

/**
 * TIER 1 BATCH FIX
 * Enhance all Tier 1 venues with improved scraping
 */

const fs = require('fs');
const path = require('path');

const TIER1_VENUES = [
  'rickshawTheatre.js',
  'biltmoreCabaret.js',
  'foxCabaret.js',
  'granvilleIsland.js',
  'mediaClub.js',
  'theCultch.js',
  'queenElizabethTheatre.js',
  'sidWilliamsTheatre.js',
  'pacificTheatre.js',
  'studioTheatre.js'
];

const COMPREHENSIVE_DATE_SELECTORS = `[
  // Datetime attributes
  'time[datetime]', '[datetime]', '[data-date]', '[data-datetime]',
  '[itemprop="startDate"]', 'meta[property="event:start_time"]',
  
  // Common date classes
  '.date', '.event-date', '.show-date', '.concert-date',
  '.performance-date', '.datetime', '.when', '.event-time',
  '.schedule', '.day', '.month', '.year',
  
  // Event-specific
  '.eec_event_date', '.tribe-events-start-date',
  '[class*="date"]', '[class*="time"]',
  
  // Generic
  'time', '.calendar', '.timestamp'
]`;

const ENHANCED_DATE_EXTRACTION = `
          // Enhanced multi-strategy date extraction
          let dateText = null;
          
          const dateSelectors = ${COMPREHENSIVE_DATE_SELECTORS};
          
          // Strategy 1: Direct element search
          for (const selector of dateSelectors) {
            const dateEl = $event.find(selector).first();
            if (dateEl.length > 0) {
              dateText = dateEl.attr('datetime') || dateEl.attr('content') || 
                        dateEl.attr('data-date') || dateEl.text().trim();
              if (dateText && dateText.length > 4 && dateText.length < 100) break;
            }
          }
          
          // Strategy 2: Parent container search
          if (!dateText) {
            const $parent = $event.closest('.event, .show, article, [class*="event"]');
            if ($parent.length > 0) {
              for (const selector of dateSelectors) {
                const dateEl = $parent.find(selector).first();
                if (dateEl.length > 0) {
                  dateText = dateEl.attr('datetime') || dateEl.text().trim();
                  if (dateText && dateText.length > 4 && dateText.length < 100) break;
                }
              }
            }
          }
          
          // Strategy 3: Regex patterns from nearby text
          if (!dateText) {
            const nearbyText = $event.text() + ' ' + $event.parent().text();
            const datePatterns = [
              // "Jan 15, 2025" or "January 15, 2025"
              /\\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}(?:,\\s*\\d{4})?/i,
              // "15 Jan 2025"
              /\\b\\d{1,2}\\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\\s+\\d{4})?/i,
              // "2025-01-15" ISO format
              /\\b\\d{4}-\\d{2}-\\d{2}/,
              // "01/15/2025" or "1/15/25"
              /\\b\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}/
            ];
            
            for (const pattern of datePatterns) {
              const match = nearbyText.match(pattern);
              if (match) {
                dateText = match[0].trim();
                break;
              }
            }
          }
          
          // Clean up
          if (dateText) {
            dateText = dateText.replace(/\\s+/g, ' ').trim();
            dateText = dateText.replace(/^(Date:|When:|Time:|On:)\\s*/i, '');
            if (dateText.length < 5 || dateText.length > 100) dateText = null;
          }
`;

async function batchFix() {
  console.log('🔧 TIER 1 BATCH FIX - Enhancing 10 key venues\n');
  console.log('='.repeat(70));

  let fixed = 0;
  let skipped = 0;

  for (const file of TIER1_VENUES) {
    const filePath = path.join(__dirname, 'scrapers', 'cities', 'vancouver', file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${file}: Not found`);
      continue;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');

      // Skip if already has enhanced date extraction
      if (content.includes('Enhanced multi-strategy date extraction')) {
        console.log(`⏭️  ${file}: Already enhanced`);
        skipped++;
        continue;
      }

      // Pattern 1: Simple date extraction
      const pattern1 = /\/\/ Extract date[\s\S]{50,800}?const dateText = [^;]+;/;
      
      // Pattern 2: Date extraction with let
      const pattern2 = /let dateText = null;[\s\S]{50,800}?if \(dateText\)/;
      
      // Pattern 3: Direct date assignment
      const pattern3 = /const dateText = \$event\.find\([^)]+\)[^;]+;/;

      let replaced = false;
      
      if (pattern1.test(content)) {
        content = content.replace(pattern1, ENHANCED_DATE_EXTRACTION);
        replaced = true;
      } else if (pattern2.test(content)) {
        content = content.replace(pattern2, ENHANCED_DATE_EXTRACTION + '\n          if (dateText)');
        replaced = true;
      } else if (pattern3.test(content)) {
        content = content.replace(pattern3, ENHANCED_DATE_EXTRACTION.trim());
        replaced = true;
      }

      if (replaced) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${file}: Enhanced date extraction`);
        fixed++;
      } else {
        console.log(`⚠️  ${file}: No date extraction pattern found`);
        skipped++;
      }

    } catch (error) {
      console.log(`❌ ${file}: ${error.message.substring(0, 50)}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Fixed: ${fixed}/10`);
  console.log(`⏭️  Skipped: ${skipped}/10`);
  console.log(`\n🎯 Target: ${fixed + skipped}/10 venues processed`);
}

batchFix().then(() => {
  console.log('\n✅ TIER 1 BATCH FIX COMPLETE!');
  console.log('\n📋 Next: Run test to see how many are now working');
  process.exit(0);
});
