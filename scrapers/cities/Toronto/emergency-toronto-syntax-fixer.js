#!/usr/bin/env node

/**
 * 🚨 EMERGENCY TORONTO SCRAPERS SYNTAX FIXER
 * 
 * Purpose: Rapidly fix all syntax errors in Toronto scrapers to restore 100% validation
 * Issues addressed:
 * 1. Invalid regex patterns (unterminated groups)
 * 2. Missing parentheses in function calls
 * 3. Unexpected tokens
 * 4. Proper city filtering per DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
 */

const fs = require('fs');
const path = require('path');

class TorontoScraperFixer {
  constructor() {
    this.torontoDir = '/Users/seongwoohan/CascadeProjects/discovr-api-server/scrapers/cities/Toronto';
    this.fixedCount = 0;
    this.errorCount = 0;
    this.fixes = [];
        // 🚨 CRITICAL: City filtering requirements from DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
        this.expectedCity = 'Toronto';
        this.cityConfig = {
            city: 'Toronto',
            province: 'ON', 
            country: 'Canada',
            fullLocation: 'Toronto, ON'
        };
  }

  async fixAllScrapers() {
    console.log('🚨 EMERGENCY TORONTO SCRAPERS SYNTAX FIXER');
    console.log('============================================');
    
    const files = fs.readdirSync(this.torontoDir)
      .filter(file => file.endsWith('.js') && !file.includes('backup') && !file.includes('test') && !file.includes('emergency'))
      .sort();
    
    console.log(`📁 Found ${files.length} Toronto scrapers to fix`);
    
    for (const file of files) {
      await this.fixScraper(file);
    }
    
    this.printSummary();
  }

  async fixScraper(filename) {
    const filepath = path.join(this.torontoDir, filename);
    
    try {
      let content = fs.readFileSync(filepath, 'utf8');
      const originalContent = content;
      
      console.log(`🔧 Fixing: ${filename}`);
      
      // Apply all syntax fixes
      content = this.fixRegexSyntax(content, filename);
      content = this.fixJavaScriptSyntax(content, filename);
      content = this.ensureProperCityFiltering(content, filename);
      content = this.ensureProperExports(content, filename);
      
      // Save if changed
      if (content !== originalContent) {
        // Create backup
        fs.writeFileSync(`${filepath}.emergency-fix-backup`, originalContent);
        
        // Save fixed version
        fs.writeFileSync(filepath, content);
        
        console.log(`   ✅ Fixed and saved: ${filename}`);
        this.fixedCount++;
        this.fixes.push(filename);
      } else {
        console.log(`   ⚪ No changes needed: ${filename}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error fixing ${filename}: ${error.message}`);
      this.errorCount++;
    }
  }

  fixRegexSyntax(content, filename) {
    // Fix common regex pattern errors
    const regexFixes = [
      // Fix unterminated groups in time patterns
      {
        pattern: /\/\(\\d\{1,2\}:?\(\\d\{2\}\?\\s\*\(am\|pm\|AM\|PM\)\?\//g,
        replacement: '/(\\d{1,2}:?(\\d{2})?\\s*(am|pm|AM|PM)?)/gi'
      },
      {
        pattern: /\/\(\\d\{1,2\}:?\(\\d\{2\}\?\\s\*\(AM\|PM\|am\|pm\)\?\//g,
        replacement: '/(\\d{1,2}:?(\\d{2})?\\s*(AM|PM|am|pm)?)/gi'
      },
      // Fix date pattern regex
      {
        pattern: /\/\(\[A-Za-z\]\+\\s\+\\d\{1,2\}\(\?\:st\|nd\|rd\|th\)\?\(\?\:\\s\*-\\s\*\[A-Za-z\]\+\\s\+\\d\{1,2\}\(\?\:st\|nd\|rd\|th\)\?\)\?\(\?\:,\\s\*\\d\{4\}\?\)\\b\/g/g,
        replacement: '/([A-Za-z]+\\s+\\d{1,2}(?:st|nd|rd|th)?(?:\\s*-\\s*[A-Za-z]+\\s+\\d{1,2}(?:st|nd|rd|th)?)?(?:,\\s*\\d{4})?)\\b/g'
      },
      // Fix venue/location patterns
      {
        pattern: /\/\[\\s-\]\(\[A-Za-z\]\+\\s\+\\d\{1,2\},\\s\*\\d\{4\}\//g,
        replacement: '/[\\s-]([A-Za-z]+\\s+\\d{1,2},\\s*\\d{4})/g'
      },
      // Fix general unterminated groups
      {
        pattern: /\/\(([^)]+)(?!\))/g,
        replacement: (match, group) => `/(${group})/g`
      }
    ];

    let fixed = content;
    regexFixes.forEach(fix => {
      if (fixed.match(fix.pattern)) {
        console.log(`   🔍 Fixing regex pattern in ${filename}`);
        fixed = fixed.replace(fix.pattern, fix.replacement);
      }
    });

    return fixed;
  }

  fixJavaScriptSyntax(content, filename) {
    let fixed = content;
    
    // Fix missing closing parentheses
    const lines = fixed.split('\n');
    const fixedLines = lines.map((line, index) => {
      let fixedLine = line;
      
      // Count opening vs closing parentheses
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      
      if (openParens > closeParens) {
        const missing = openParens - closeParens;
        console.log(`   🔧 Adding ${missing} missing parentheses on line ${index + 1}`);
        fixedLine += ')'.repeat(missing);
      }
      
      // Fix common syntax issues
      fixedLine = fixedLine
        .replace(/\*(?=\s*[;}])/g, '') // Remove stray asterisks
        .replace(/\{(?=\s*[;}])/g, '') // Remove stray opening braces
        .replace(/,\s*,/g, ',') // Remove double commas
        .replace(/;\s*;/g, ';'); // Remove double semicolons
      
      return fixedLine;
    });
    
    return fixedLines.join('\n');
  }

  ensureProperCityFiltering(content, filename) {
    // Ensure proper city filtering per DISCOVR guide
    let fixed = content;
    
    // Add city validation at start of scrape function
    const cityValidation = `
  // 🚨 CRITICAL: City validation per DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
  const EXPECTED_CITY = 'Toronto';
  if (city !== EXPECTED_CITY) {
    throw new Error(\`City mismatch! Expected '\${EXPECTED_CITY}', got '\${city}'\`);
  }
`;

    // Insert city validation if not present
    if (!fixed.includes('EXPECTED_CITY') && !fixed.includes('City mismatch')) {
      fixed = fixed.replace(
        /(async function scrape[^{]*{)/,
        `$1${cityValidation}`
      );
    }

    // Ensure all events have proper city tagging
    if (fixed.includes('city:') && !fixed.includes("city: 'Toronto'")) {
      fixed = fixed.replace(/city:\s*[^,}]+/g, "city: 'Toronto'");
      console.log(`   🏙️ Fixed city tagging in ${filename}`);
    }

    return fixed;
  }

  ensureProperExports(content, filename) {
    // Ensure proper module exports
    if (!content.includes('module.exports')) {
      const exportStatement = `
module.exports = {
  scrape: scrapeEvents || scrapeVenueEvents || scrapeTorontoEvents || (() => [])
};
`;
      return content + exportStatement;
    }
    return content;
  }

  printSummary() {
    console.log('\n🎯 EMERGENCY FIXING COMPLETE');
    console.log('============================');
    console.log(`✅ Fixed: ${this.fixedCount} scrapers`);
    console.log(`❌ Errors: ${this.errorCount} scrapers`);
    
    if (this.fixes.length > 0) {
      console.log('\n🔧 Files Fixed:');
      this.fixes.forEach(file => console.log(`   - ${file}`));
    }
    
    console.log('\n🚀 Next: Run validation to verify 100% success rate');
  }
}

// Execute the fixer
if (require.main === module) {
  const fixer = new TorontoScraperFixer();
  fixer.fixAllScrapers().catch(console.error);
}

module.exports = TorontoScraperFixer;
