/**
 * FIX: Undefined URL startsWith Errors
 * 
 * Fixes all Toronto scrapers to safely handle undefined eventUrl/imageUrl
 * before calling .startsWith() to prevent runtime errors
 */

const fs = require('fs');
const path = require('path');

const TORONTO_DIR = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';

async function fixUndefinedUrlErrors() {
  console.log('🔧 FIXING UNDEFINED URL STARTSWITH ERRORS');
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
      
      // Check if file has the problematic startsWith patterns
      const hasUrlStartsWith = content.includes('.startsWith(\'http\')') || 
                              content.includes('.startsWith("http")');
      
      if (!hasUrlStartsWith) {
        console.log(`⏭️ ${filename}: No startsWith patterns found`);
        skipped++;
        continue;
      }
      
      const originalContent = content;
      
      // Fix Pattern 1: eventUrl ? (eventUrl.startsWith('http') ? ... 
      // Replace with safer version that checks for string type
      content = content.replace(
        /(\w+)\s*\?\s*\(\1\.startsWith\('http'\)\s*\?\s*\1\s*:\s*`([^`]+)`\)\s*:\s*([^,\n]+)/g,
        '($1 && typeof $1 === "string" && $1.startsWith("http")) ? $1 : ($1 ? `$2` : $3)'
      );
      
      content = content.replace(
        /(\w+)\s*\?\s*\(\1\.startsWith\("http"\)\s*\?\s*\1\s*:\s*`([^`]+)`\)\s*:\s*([^,\n]+)/g,
        '($1 && typeof $1 === "string" && $1.startsWith("http")) ? $1 : ($1 ? `$2` : $3)'
      );
      
      // Fix Pattern 2: More complex cases with different structures
      content = content.replace(
        /eventUrl:\s*eventUrl\s*\?\s*\(eventUrl\.startsWith\('http'\)\s*\?\s*eventUrl\s*:\s*`([^`]+)`\)\s*:\s*([^,\n]+)/g,
        'eventUrl: (eventUrl && typeof eventUrl === "string" && eventUrl.startsWith("http")) ? eventUrl : (eventUrl ? `$1` : $2)'
      );
      
      content = content.replace(
        /imageUrl:\s*imageUrl\s*\?\s*\(imageUrl\.startsWith\('http'\)\s*\?\s*imageUrl\s*:\s*`([^`]+)`\)\s*:\s*([^,\n]+)/g,
        'imageUrl: (imageUrl && typeof imageUrl === "string" && imageUrl.startsWith("http")) ? imageUrl : (imageUrl ? `$1` : $2)'
      );
      
      // Fix Pattern 3: Generic safety wrapper for any remaining startsWith calls
      content = content.replace(
        /(\w+)\.startsWith\((['"])http\2\)/g,
        '($1 && typeof $1 === "string" && $1.startsWith($2http$2))'
      );
      
      // Add helper function at the top if not present
      if (!content.includes('safeStartsWith')) {
        const helperFunction = `
// Safe helper to prevent undefined startsWith errors
const safeStartsWith = (str, prefix) => {
  return str && typeof str === 'string' && str.startsWith(prefix);
};

`;
        
        // Insert after the imports but before other code
        const importEndIndex = content.lastIndexOf('require(');
        if (importEndIndex !== -1) {
          const nextNewline = content.indexOf('\n', importEndIndex);
          if (nextNewline !== -1) {
            content = content.slice(0, nextNewline + 1) + helperFunction + content.slice(nextNewline + 1);
          }
        }
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        fixed++;
        console.log(`✅ ${filename}: Fixed undefined URL errors`);
      } else {
        console.log(`⚠️ ${filename}: No patterns matched for fixing`);
        skipped++;
      }
      
    } catch (error) {
      failed++;
      console.error(`❌ ${filename}: Fix failed - ${error.message}`);
    }
  }
  
  console.log('\n📊 UNDEFINED URL ERROR FIX RESULTS:');
  console.log(`✅ Successfully fixed: ${fixed}`);
  console.log(`⏭️ Skipped (no issues): ${skipped}`);
  console.log(`❌ Failed to fix: ${failed}`);
  console.log(`📈 Fix success rate: ${Math.round((fixed/(fixed+failed))*100)}%`);
  
  if (fixed > 50) {
    console.log('\n🎉 MASSIVE SUCCESS! Most scrapers should now run without startsWith errors!');
    console.log('🧪 Ready for venue diversity testing!');
  } else if (fixed > 20) {
    console.log('\n⚡ GOOD PROGRESS! Many scrapers fixed, continue testing');
  } else {
    console.log('\n⚠️ LIMITED SUCCESS! May need manual inspection of specific cases');
  }
  
  return { fixed, failed, skipped, total: files.length };
}

// Run the fix  
fixUndefinedUrlErrors().catch(console.error);
