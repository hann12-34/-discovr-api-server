#!/usr/bin/env node

/**
 * MEGA DATE FIX
 * Apply super comprehensive date extraction to ALL scrapers with simple patterns
 */

const fs = require('fs');
const path = require('path');

const SUPER_COMPREHENSIVE_DATE_EXTRACTION = `
            // SUPER COMPREHENSIVE date extraction
            let eventDate = null;
            
            // Strategy 1: datetime attributes
            const datetimeAttr = $event.find('[datetime]').first().attr('datetime');
            if (datetimeAttr) eventDate = datetimeAttr;
            
            // Strategy 2: extensive selectors
            if (!eventDate) {
              const selectors = ['.date', '.event-date', '.show-date', 'time', '[class*="date"]', 
                               '[data-date]', '.datetime', '.when', '[itemprop="startDate"]',
                               '.performance-date', '[data-start-date]'];
              for (const sel of selectors) {
                const text = $event.find(sel).first().text().trim();
                if (text && text.length >= 5 && text.length <= 100) {
                  eventDate = text;
                  break;
                }
              }
            }
            
            // Strategy 3: URL pattern
            if (!eventDate && url) {
              const urlMatch = url.match(/\\/(\\\d{4})-(\\d{2})-(\\d{2})|\\/(\\\d{4})\\/(\\d{2})\\/(\\d{2})/);
              if (urlMatch) {
                eventDate = urlMatch[1] ? \`\${urlMatch[1]}-\${urlMatch[2]}-\${urlMatch[3]}\` : \`\${urlMatch[4]}-\${urlMatch[5]}-\${urlMatch[6]}\`;
              }
            }
            
            // Strategy 4: text pattern
            if (!eventDate) {
              const text = $event.text() + ' ' + $event.parent().text();
              const dateMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}(?:,\\s*\\d{4})?/i);
              if (dateMatch) eventDate = dateMatch[0];
            }`;

async function megaDateFix() {
  console.log('🚀 MEGA DATE FIX - Applying to ALL scrapers with simple date extraction\n');
  console.log('='.repeat(70));

  const cityDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
  const files = fs.readdirSync(cityDir)
    .filter(f => f.endsWith('.js') && !f.endsWith('.bak'));

  let fixed = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(cityDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if already has SUPER COMPREHENSIVE
    if (content.includes('SUPER COMPREHENSIVE date extraction')) {
      skipped++;
      continue;
    }

    // Pattern to match simple date extraction
    const simplePattern = /(\s+)\/\/ Extract date information\s+let eventDate = null;\s+const dateText = \$event\.find\([^)]+\)\.first\(\)\.text\(\)\.trim\(\);\s+if \(dateText\) \{\s+eventDate = dateText;\s+\}/;

    if (simplePattern.test(content)) {
      const indent = content.match(simplePattern)[1];
      content = content.replace(simplePattern, indent + SUPER_COMPREHENSIVE_DATE_EXTRACTION);
      fs.writeFileSync(filePath, content);
      console.log(`✅ ${file}`);
      fixed++;
    } else {
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Fixed: ${fixed} scrapers`);
  console.log(`⏭️  Skipped: ${skipped} scrapers`);
  console.log(`🎯 Total: ${files.length} scrapers processed`);
}

megaDateFix().then(() => {
  console.log('\n✅ MEGA DATE FIX COMPLETE!');
  console.log('📋 Run test to see improvements');
  process.exit(0);
});
