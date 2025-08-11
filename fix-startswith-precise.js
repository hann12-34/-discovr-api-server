/**
 * PRECISE FIX: Clean startsWith Error Fix
 * 
 * Fixes malformed duplicate conditions and ensures proper undefined URL handling
 * in all Toronto scrapers with clean, readable code
 */

const fs = require('fs');
const path = require('path');

const TORONTO_DIR = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';

async function fixStartsWithPrecise() {
  console.log('🎯 PRECISE FIX: Clean startsWith Error Handling');
  console.log('='.repeat(50));
  
  // Focus on the most critical scrapers first
  const priorityScrapers = [
    'scrape-ago-events-clean.js',
    'scrape-rom-events-clean.js', 
    'scrape-cn-tower-events-clean.js',
    'scrape-moca-events.js',
    'scrape-casa-loma-events-clean.js'
  ];
  
  let fixed = 0;
  let failed = 0;
  
  for (const filename of priorityScrapers) {
    try {
      const filePath = path.join(TORONTO_DIR, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ ${filename}: File not found, skipping`);
        continue;
      }
      
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      console.log(`\n🔧 Fixing ${filename}:`);
      
      // Fix malformed duplicate conditions like:
      // (eventUrl && typeof eventUrl === "string" && (eventUrl && typeof eventUrl === "string" && eventUrl.startsWith("http")))
      content = content.replace(
        /\((\w+) && typeof \1 === "string" && \(\1 && typeof \1 === "string" && \1\.startsWith\("http"\)\)\)/g,
        '($1 && typeof $1 === "string" && $1.startsWith("http"))'
      );
      
      // Clean up the eventUrl/imageUrl assignment patterns
      // Pattern: eventUrl: (condition) ? eventUrl : (eventUrl ? `${BASE_URL}${eventUrl}` : fallback)
      content = content.replace(
        /eventUrl:\s*\([^)]+\)\s*\?\s*eventUrl\s*:\s*\(eventUrl\s*\?\s*`[^`]*`\s*:\s*([^,\n]+)\)/g,
        'eventUrl: (eventUrl && typeof eventUrl === "string" && eventUrl.startsWith("http")) ? eventUrl : (eventUrl ? `${BASE_URL}${eventUrl}` : $1)'
      );
      
      content = content.replace(
        /imageUrl:\s*\([^)]+\)\s*\?\s*imageUrl\s*:\s*\(imageUrl\s*\?\s*`[^`]*`\s*:\s*([^,\n]+)\)/g,
        'imageUrl: (imageUrl && typeof imageUrl === "string" && imageUrl.startsWith("http")) ? imageUrl : (imageUrl ? `${BASE_URL}${imageUrl}` : $1)'
      );
      
      // Add helper function if missing and needed
      if (content.includes('.startsWith(') && !content.includes('const safeUrl = ')) {
        const helperCode = `
// Safe URL helper to prevent undefined errors
const safeUrl = (url, baseUrl, fallback = null) => {
  if (!url) return fallback;
  if (typeof url === 'string' && url.startsWith('http')) return url;
  if (typeof url === 'string') return \`\${baseUrl}\${url}\`;
  return fallback;
};

`;
        
        // Insert after imports
        const lastRequireIndex = content.lastIndexOf('require(');
        if (lastRequireIndex !== -1) {
          const nextNewlineIndex = content.indexOf('\n', lastRequireIndex);
          if (nextNewlineIndex !== -1) {
            content = content.slice(0, nextNewlineIndex + 1) + helperCode + content.slice(nextNewlineIndex + 1);
          }
        }
        
        // Update the assignments to use the helper
        content = content.replace(
          /eventUrl:\s*\([^)]+eventUrl[^)]+\)\s*\?\s*eventUrl\s*:\s*\([^)]+\)/g,
          'eventUrl: safeUrl(eventUrl, BASE_URL, workingUrl)'
        );
        
        content = content.replace(
          /imageUrl:\s*\([^)]+imageUrl[^)]+\)\s*\?\s*imageUrl\s*:\s*\([^)]+\)/g,
          'imageUrl: safeUrl(imageUrl, BASE_URL)'
        );
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        fixed++;
        console.log(`✅ Fixed malformed conditions and URL handling`);
      } else {
        console.log(`⚠️ No changes needed`);
      }
      
    } catch (error) {
      failed++;
      console.error(`❌ ${filename}: Fix failed - ${error.message}`);
    }
  }
  
  console.log('\n📊 PRECISE STARTSWITH FIX RESULTS:');
  console.log(`✅ Successfully fixed: ${fixed}`);
  console.log(`❌ Failed to fix: ${failed}`);
  
  if (fixed >= 3) {
    console.log('\n🎉 SUCCESS! Priority scrapers should now run cleanly!');
    console.log('🧪 Ready for venue diversity testing!');
  } else {
    console.log('\n⚠️ Limited success - may need manual inspection');
  }
  
  return { fixed, failed };
}

// Run the precise fix
fixStartsWithPrecise().catch(console.error);
