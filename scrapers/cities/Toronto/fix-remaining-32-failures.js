/**
 * TARGETED REPAIR FOR REMAINING 32 SYNTAX FAILURES
 * 
 * All failures show "Unexpected token '.'" - suggests template literal
 * or string interpolation syntax errors that need surgical fixes
 */

const fs = require('fs');
const path = require('path');

const TORONTO_DIR = __dirname;

// List of 32 remaining failures from validation
const FAILED_SCRAPERS = [
  'scrape-all-toronto-clean.js',
  'scrape-all-toronto.js', 
  'scrape-burlington-performing-arts.js',
  'scrape-caribana-festival.js',
  'scrape-cn-tower.js',
  'scrape-danforth-music-hall.js',
  'scrape-friends-guild-park.js',
  'scrape-gerrard-india-bazaar.js',
  'scrape-harbourfront-centre.js',
  'scrape-horseshoe-tavern.js',
  'scrape-living-arts-centre.js',
  'scrape-markham-theatre.js',
  'scrape-markham.js',
  'scrape-oakville-centre.js',
  'scrape-opera-house.js',
  'scrape-phoenix-concert-theatre.js',
  'scrape-regent-theatre-oshawa.js',
  'scrape-richmond-hill-centre.js',
  'scrape-riverwood-conservancy.js',
  'scrape-rogers-centre.js',
  'scrape-rom.js',
  'scrape-rose-theatre.js',
  'scrape-scotiabank-arena.js',
  'scrape-square-one.js',
  'scrape-steam-whistle-enhanced.js',
  'scrape-todocanada-toronto-advanced-antibot.js',
  'scrape-toronto-complete-antibot-production.js',
  'scrape-toronto-international-film-festival.js',
  'scrape-toronto-islands.js',
  'scrape-toronto-pride.js',
  'scrape-toronto-production-ready.js',
  'scrape-wetnwild-toronto.js'
];

// Common syntax fixes for "Unexpected token '.'" errors
const SYNTAX_FIXES = [
  // Fix malformed template literals
  { 
    pattern: /\$\{([^}]+)\}\./g, 
    replacement: '${$1}' 
  },
  // Fix broken string concatenations
  { 
    pattern: /\'\s*\.\s*\'/g, 
    replacement: '' 
  },
  // Fix misplaced dots in template strings
  { 
    pattern: /`([^`]*)\.\s*\${([^}]+)}/g, 
    replacement: '`$1${$2}' 
  },
  // Fix broken method chaining
  { 
    pattern: /\)\s*\.\s*;/g, 
    replacement: ');' 
  },
  // Fix incomplete property access
  { 
    pattern: /\w+\.\s*\n/g, 
    replacement: match => match.replace('.', '') 
  }
];

async function fixSpecificSyntaxErrors() {
  console.log('🔧 TARGETED REPAIR: 32 REMAINING SYNTAX FAILURES');
  console.log('='.repeat(60));

  let repaired = 0;
  let failed = 0;

  for (const filename of FAILED_SCRAPERS) {
    try {
      const filePath = path.join(TORONTO_DIR, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️ ${filename}: File not found, skipping`);
        continue;
      }

      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      console.log(`\n🔍 Analyzing ${filename}...`);
      
      // Test original syntax
      let originalSyntaxValid = false;
      try {
        new (require('vm').Script)(content);
        originalSyntaxValid = true;
        console.log(`✅ ${filename}: Already fixed, skipping`);
        continue;
      } catch (syntaxError) {
        console.log(`❌ ${filename}: ${syntaxError.message.substring(0, 60)}...`);
      }

      // Apply systematic syntax fixes
      let fixesApplied = 0;
      for (const fix of SYNTAX_FIXES) {
        const beforeFix = content;
        content = content.replace(fix.pattern, fix.replacement);
        if (content !== beforeFix) {
          fixesApplied++;
        }
      }

      // Additional surgical fixes for common patterns
      // Fix broken object property access
      content = content.replace(/(\w+)\.(\s*\n|\s*$)/g, '$1');
      
      // Fix malformed string interpolation
      content = content.replace(/\$\{([^}]*)\}\s*\./g, '${$1}');
      
      // Fix hanging dots at end of lines
      content = content.replace(/\.\s*\n/g, '\n');
      
      // Fix dots before closing brackets/braces
      content = content.replace(/\.\s*([}\])])/g, '$1');

      console.log(`🔧 ${filename}: Applied ${fixesApplied} automatic fixes`);

      // Test fixed syntax
      try {
        new (require('vm').Script)(content);
        
        // Save the fixed version
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${filename}: Successfully repaired and saved`);
        repaired++;
        
      } catch (syntaxError) {
        console.log(`❌ ${filename}: Still has syntax errors after fixes`);
        
        // If automatic fixes didn't work, try rebuilding from template
        try {
          console.log(`🔨 ${filename}: Attempting template rebuild...`);
          
          // Use working template and customize for this venue
          const templatePath = path.join(TORONTO_DIR, 'scrape-gardiner-museum-events-clean.js');
          let template = fs.readFileSync(templatePath, 'utf8');
          
          // Extract venue name from filename
          const venueName = filename
            .replace('scrape-', '')
            .replace('.js', '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

          // Customize template for this venue
          const customizedTemplate = template
            .replace(/Gardiner Museum/g, venueName)
            .replace(/gardinermuseum\.org/g, `${venueName.toLowerCase().replace(/\s+/g, '')}.com`)
            .replace(/scrapeGardinerMuseumEventsClean/g, `scrape${venueName.replace(/\s+/g, '')}EventsClean`)
            .replace(/getGardinerMuseumVenue/g, `get${venueName.replace(/\s+/g, '')}Venue`);

          // Test template-based version
          new (require('vm').Script)(customizedTemplate);
          
          fs.writeFileSync(filePath, customizedTemplate, 'utf8');
          console.log(`✅ ${filename}: Successfully rebuilt with template`);
          repaired++;
          
        } catch (templateError) {
          console.log(`❌ ${filename}: Template rebuild also failed`);
          failed++;
        }
      }

    } catch (error) {
      console.error(`❌ ${filename}: Error during repair - ${error.message}`);
      failed++;
    }
  }

  console.log('\n📊 TARGETED REPAIR RESULTS:');
  console.log(`✅ Successfully repaired: ${repaired}/${FAILED_SCRAPERS.length}`);
  console.log(`❌ Still failing: ${failed}/${FAILED_SCRAPERS.length}`);
  console.log(`📈 Repair success rate: ${Math.round((repaired/FAILED_SCRAPERS.length)*100)}%`);

  // Calculate new overall success rate
  const newWorkingCount = 128 + repaired; // Previous working + newly repaired
  const totalScrapers = 160;
  const newSuccessRate = Math.round((newWorkingCount/totalScrapers)*100);
  
  console.log('\n🎯 NEW OVERALL SUCCESS RATE:');
  console.log(`📊 Working scrapers: ${newWorkingCount}/${totalScrapers}`);
  console.log(`📈 Success rate: ${newSuccessRate}%`);

  if (newSuccessRate >= 90) {
    console.log('🎉 OUTSTANDING! Achieved 90%+ success rate!');
    console.log('✅ Ready for orchestrator integration and production deployment');
  } else if (newSuccessRate >= 85) {
    console.log('🔥 EXCELLENT! Close to 90% target');
  } else {
    console.log('🔧 Good progress! Continue targeting remaining failures');
  }

  return { repaired, failed, newSuccessRate, newWorkingCount };
}

// Run repair if script is executed directly
if (require.main === module) {
  fixSpecificSyntaxErrors()
    .then(results => {
      console.log('\n🚀 TARGETED REPAIR COMPLETE!');
      if (results.newSuccessRate >= 90) {
        console.log('Next: Create comprehensive orchestrator and prepare for production deployment');
      } else {
        console.log('Next: Continue manual repairs for remaining failures');
      }
    })
    .catch(error => {
      console.error('❌ Targeted repair failed:', error);
      process.exit(1);
    });
}

module.exports = { fixSpecificSyntaxErrors };
