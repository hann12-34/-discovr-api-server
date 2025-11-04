#!/usr/bin/env node

/**
 * BATCH FIX HIGH-VALUE SCRAPERS
 * Systematically add improved date extraction to major venues
 */

const fs = require('fs');
const path = require('path');

const HIGH_PRIORITY = [
  'artsClubTheatre.js', 'balletBC.js', 'biltmoreCabaret.js',
  'centennialTheatre.js', 'firehallArtsCentre.js', 'gatewayTheatre.js',
  'granvilleIsland.js', 'mediaClub.js', 'michaelJFoxTheatre.js',
  'pacificTheatre.js', 'pushFestival.js', 'queerArtsFestival.js',
  'redRobinsonTheatre.js', 'rickshawTheatre.js', 'riverRockTheatre.js',
  'royalTheatreVictoria.js', 'studioTheatre.js', 'surreyCivicTheatres.js',
  'theCommodore.js', 'theCultch.js', 'theVenue.js',
  'vancouverOpera.js', 'vogueTheatre.js', 'waterfrontTheatre.js'
];

const GENERIC_DATE_EXTRACTION = `
          // Generic date extraction
          let dateText = null;
          const dateSelectors = [
            'time[datetime]', '[datetime]', '.date', '.event-date',
            '[class*="date"]', 'time', '[data-date]', '[itemprop="startDate"]'
          ];
          
          for (const selector of dateSelectors) {
            const dateEl = $element.find(selector).first();
            if (dateEl.length > 0) {
              dateText = dateEl.attr('datetime') || dateEl.attr('content') || dateEl.text().trim();
              if (dateText && dateText.length > 4 && dateText.length < 100) break;
            }
          }
          
          if (!dateText) {
            const $parent = $element.closest('.event, article');
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
          
          if (dateText) {
            dateText = dateText.replace(/\\s+/g, ' ').trim();
          }
`;

async function batchFix() {
  console.log('🔧 BATCH FIXING HIGH-VALUE SCRAPERS\n');
  
  const cityDir = path.join(__dirname, 'scrapers', 'cities', 'vancouver');
  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of HIGH_PRIORITY) {
    const filePath = path.join(cityDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${file}: Not found`);
      failed++;
      continue;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');

      // Skip if already has generic or improved date extraction
      if (content.includes('Generic date extraction') || 
          content.includes('IMPROVED DATE EXTRACTION')) {
        console.log(`⏭️  ${file}: Already has date extraction`);
        skipped++;
        continue;
      }

      // Look for simple date extraction that needs improvement
      const simplePattern = /let dateText = null;\s+const dateSelectors = \[[^\]]+\];[\s\S]{0,300}?if \(dateText\)/;
      
      if (simplePattern.test(content)) {
        content = content.replace(simplePattern, GENERIC_DATE_EXTRACTION + '\n          if (dateText)');
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${file}: Enhanced date extraction`);
        fixed++;
      } else {
        console.log(`⚠️  ${file}: No simple date pattern found`);
        skipped++;
      }

    } catch (error) {
      console.log(`❌ ${file}: ${error.message.substring(0, 50)}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
}

batchFix().then(() => {
  console.log('\n✅ BATCH FIX COMPLETE!');
  process.exit(0);
});
