/**
 * FIX: Scraper Export Structure
 * 
 * Fixes all Toronto scrapers to export { scrapeEvents: functionName }
 * instead of { scrape: functionName } for orchestrator compatibility
 */

const fs = require('fs');
const path = require('path');

const TORONTO_DIR = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';

async function fixScraperExports() {
  console.log('🔧 FIXING SCRAPER EXPORT STRUCTURE');
  console.log('='.repeat(50));
  
  // Get all Toronto scraper files
  const files = fs.readdirSync(TORONTO_DIR)
    .filter(file => file.startsWith('scrape-') && file.endsWith('.js') && 
            !file.includes('repair') && !file.includes('fix') && 
            !file.includes('validate') && !file.includes('debug') &&
            !file.includes('all-toronto'))
    .sort();
    
  console.log(`🔍 Found ${files.length} scrapers to fix`);
  
  let fixed = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const filename of files) {
    try {
      const filePath = path.join(TORONTO_DIR, filename);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Check current export structure
      const hasIncorrectExport = content.includes('module.exports = { scrape:') || 
                                 content.includes('module.exports = {scrape:') ||
                                 content.includes('module.exports = { scrape :');
      
      const hasCorrectExport = content.includes('module.exports = { scrapeEvents:') ||
                              content.includes('module.exports = {scrapeEvents:') ||
                              content.includes('module.exports = { scrapeEvents :');
      
      if (hasCorrectExport) {
        console.log(`⏭️ ${filename}: Already has correct export structure`);
        skipped++;
        continue;
      }
      
      if (!hasIncorrectExport) {
        console.log(`⚠️ ${filename}: No standard export found, skipping`);
        skipped++;
        continue;
      }
      
      const originalContent = content;
      
      // Fix the export structure
      content = content.replace(
        /module\.exports\s*=\s*{\s*scrape\s*:\s*([^}]+)\s*}/g,
        'module.exports = { scrapeEvents: $1 }'
      );
      
      // Also fix any variations
      content = content.replace(
        /module\.exports\s*=\s*{\s*scrape:\s*([^}]+)\s*}/g,
        'module.exports = { scrapeEvents: $1 }'
      );
      
      content = content.replace(
        /module\.exports\s*=\s*{scrape\s*:\s*([^}]+)\s*}/g,
        'module.exports = { scrapeEvents: $1 }'
      );
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        fixed++;
        console.log(`✅ ${filename}: Fixed export structure`);
      } else {
        console.log(`⚠️ ${filename}: No changes needed`);
        skipped++;
      }
      
    } catch (error) {
      failed++;
      console.error(`❌ ${filename}: Fix failed - ${error.message}`);
    }
  }
  
  console.log('\n📊 EXPORT STRUCTURE FIX RESULTS:');
  console.log(`✅ Successfully fixed: ${fixed}`);
  console.log(`⏭️ Already correct/skipped: ${skipped}`);
  console.log(`❌ Failed to fix: ${failed}`);
  console.log(`📈 Fix success rate: ${Math.round((fixed/(fixed+failed))*100)}%`);
  
  if (fixed > 50) {
    console.log('\n🎉 MASSIVE SUCCESS! Most scrapers now have correct exports!');
    console.log('🔧 Orchestrator should now be able to load these scrapers!');
  } else if (fixed > 20) {
    console.log('\n⚡ GOOD PROGRESS! Many scrapers fixed, continue with remaining ones');
  } else {
    console.log('\n⚠️ LIMITED SUCCESS! May need different fix approach');
  }
  
  return { fixed, failed, skipped, total: files.length };
}

// Run the fix  
fixScraperExports().catch(console.error);
