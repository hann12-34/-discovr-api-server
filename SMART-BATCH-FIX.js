#!/usr/bin/env node

/**
 * SMART BATCH FIX
 * Intelligently fix date extraction in scrapers
 */

const fs = require('fs');
const path = require('path');

const FIXES = {
  // Fix 1: Add filterEvents import if missing
  addFilterEventsImport: (content) => {
    if (content.includes('filterEvents')) return { changed: false, content };
    
    const importLine = "const { filterEvents } = require('../../utils/eventFilter');";
    const uuidLine = "const { v4: uuidv4 } = require('uuid');";
    
    if (content.includes(uuidLine)) {
      content = content.replace(uuidLine, uuidLine + '\n' + importLine);
      return { changed: true, content };
    }
    return { changed: false, content };
  },

  // Fix 2: Use filterEvents on return
  useFilterEvents: (content) => {
    const patterns = [
      { old: /return events;$/m, new: 'return filterEvents(events);' },
      { old: /return events\.length > 0 \? events : \[\];/g, new: 'return filterEvents(events);' }
    ];

    let changed = false;
    for (const { old, new: replacement } of patterns) {
      if (old.test(content)) {
        content = content.replace(old, replacement);
        changed = true;
      }
    }
    return { changed, content };
  },

  // Fix 3: Enhance simple date extraction
  enhanceDateExtraction: (content) => {
    // Pattern: Simple date selector that's too basic
    const simplePattern = /const dateText = \$event\.find\('\.date'\)\.first\(\)\.text\(\)\.trim\(\);/;
    
    if (simplePattern.test(content)) {
      const enhanced = `// Enhanced date extraction
          const dateSelectors = [
            'time[datetime]', '[datetime]', '.date', '.event-date',
            '[class*="date"]', 'time', '[data-date]'
          ];
          
          let dateText = null;
          for (const selector of dateSelectors) {
            const dateEl = $event.find(selector).first();
            if (dateEl.length > 0) {
              dateText = dateEl.attr('datetime') || dateEl.attr('content') || dateEl.text().trim();
              if (dateText && dateText.length >= 5 && dateText.length <= 100) break;
            }
          }`;
      
      content = content.replace(simplePattern, enhanced);
      return { changed: true, content };
    }
    return { changed: false, content };
  }
};

async function smartBatchFix() {
  console.log('🎯 SMART BATCH FIX - Applying intelligent fixes\n');
  console.log('='.repeat(70));

  const cityDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
  const files = fs.readdirSync(cityDir)
    .filter(f => f.endsWith('.js') && !f.endsWith('.bak'));

  const stats = {
    addedFilterImport: 0,
    usedFilterEvents: 0,
    enhancedDateExtraction: 0,
    noChanges: 0
  };

  for (const file of files) {
    const filePath = path.join(cityDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Apply fixes in order
    const fix1 = FIXES.addFilterEventsImport(content);
    if (fix1.changed) {
      content = fix1.content;
      stats.addedFilterImport++;
      changed = true;
    }

    const fix2 = FIXES.useFilterEvents(content);
    if (fix2.changed) {
      content = fix2.content;
      stats.usedFilterEvents++;
      changed = true;
    }

    const fix3 = FIXES.enhanceDateExtraction(content);
    if (fix3.changed) {
      content = fix3.content;
      stats.enhancedDateExtraction++;
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ ${file}`);
    } else {
      stats.noChanges++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 FIXES APPLIED:');
  console.log(`  Added filterEvents import: ${stats.addedFilterImport}`);
  console.log(`  Used filterEvents on return: ${stats.usedFilterEvents}`);
  console.log(`  Enhanced date extraction: ${stats.enhancedDateExtraction}`);
  console.log(`  No changes needed: ${stats.noChanges}`);
  console.log(`\n🎯 Total files processed: ${files.length}`);
}

smartBatchFix().then(() => {
  console.log('\n✅ SMART BATCH FIX COMPLETE!');
  console.log('📋 Now run test to see improvements');
  process.exit(0);
});
