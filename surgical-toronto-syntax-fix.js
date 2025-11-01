const fs = require('fs');
const path = require('path');

const TORONTO_DIR = './scrapers/cities/Toronto';

function surgicalTorontoSyntaxFix() {
  console.log('🔧 Surgical Toronto syntax fix for "Unexpected token" errors...');
  
  const files = fs.readdirSync(TORONTO_DIR).filter(file => 
    file.endsWith('.js') && 
    !file.includes('backup') &&
    !file.includes('working') &&
    !file.includes('test') &&
    !file.includes('fix-') &&
    !file.includes('mass-repair') &&
    !file.includes('template') &&
    !file.includes('validate') &&
    !file.includes('simple-')
  );
  
  let fixedCount = 0;
  let errorCount = 0;
  
  for (const file of files) {
    const filePath = path.join(TORONTO_DIR, file);
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;
      
      // Test if file has syntax errors
      try {
        eval(`(function() { ${content} })`);
        continue; // Skip files that are already valid
      } catch (syntaxError) {
        // File has syntax errors, let's fix them
      }
      
      // Fix common "Unexpected token" issues
      
      // 1. Fix malformed object literals in function calls
      content = content.replace(/const venue = getGardinerVenue\(city\);\s*\{\s*name:/g, 'const venue = { name:');
      
      // 2. Fix orphaned object properties after function calls
      content = content.replace(/\}\);\s*\{\s*name:/g, '}, { name:');
      
      // 3. Fix broken return statements with object literals
      content = content.replace(/return\s*\{\s*([^}]+)\s*\}\s*;?\s*\{/g, 'return { $1 };');
      
      // 4. Fix malformed arrow functions and object destructuring
      content = content.replace(/=>\s*\{\s*([^}]+)\s*\}\s*:/g, '=> { return { $1 }; }:');
      
      // 5. Fix broken object method syntax
      content = content.replace(/(\w+)\s*:\s*\{\s*([^}]+)\s*\}\s*,?\s*\{/g, '$1: { $2 }, {');
      
      // 6. Remove duplicated helper function definitions
      const helperPattern = /\n\s*\/\/ Helper functions[\s\S]*?const safeTrim = \(str\) => \{[\s\S]*?\};\s*/g;
      const matches = content.match(helperPattern);
      if (matches && matches.length > 1) {
        // Keep only the first occurrence
        content = content.replace(helperPattern, '');
        content = content.replace(/const axios = require\('axios'\);/, `const axios = require('axios');

// Helper functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const safeStartsWith = (str, prefix) => {
  return str && typeof str === "string" && str.startsWith(prefix);
};

const safeIncludes = (str, substr) => {
  return str && typeof str === "string" && str.includes(substr);
};

const safeTrim = (str) => {
  return str && typeof str === "string" ? str.trim() : '';
};`);
      }
      
      // 7. Fix malformed template literals
      content = content.replace(/\$\{[^}]*\$\{/g, '${');
      content = content.replace(/\}\$\{[^}]*\}/g, '}');
      
      // 8. Clean up broken function syntax
      content = content.replace(/async function scrapeEvents\(\) \{\s*\{/g, 'async function scrapeEvents() {');
      
      // Only write if content changed
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed: ${file}`);
        fixedCount++;
      }
      
    } catch (error) {
      console.log(`❌ Error fixing ${file}: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 SURGICAL TORONTO SYNTAX FIX SUMMARY:`);
  console.log(`✅ Fixed: ${fixedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📁 Total files: ${files.length}`);
}

surgicalTorontoSyntaxFix();
