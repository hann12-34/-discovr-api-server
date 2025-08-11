#!/usr/bin/env node

/**
 * 🚨 ADVANCED TORONTO SCRAPERS SYNTAX FIXER
 * 
 * Purpose: Target specific syntax patterns revealed by validation
 * Addresses: Invalid regex flags, unterminated groups, unexpected tokens, constructor issues
 */

const fs = require('fs');
const path = require('path');

class AdvancedTorontoFixer {
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
    console.log('🚨 ADVANCED TORONTO SCRAPERS SYNTAX FIXER');
    console.log('==========================================');
    
    const files = fs.readdirSync(this.torontoDir)
      .filter(file => file.endsWith('.js') && !file.includes('backup') && !file.includes('test') && !file.includes('emergency') && !file.includes('advanced'))
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
      
      // Apply targeted fixes for specific error patterns
      content = this.fixRegexFlags(content, filename);
      content = this.fixUnterminatedGroups(content, filename);
      content = this.fixUnexpectedTokens(content, filename);
      content = this.fixConstructorIssues(content, filename);
      content = this.fixTemplateExpressions(content, filename);
      content = this.ensureValidSyntax(content, filename);
      
      // Save if changed
      if (content !== originalContent) {
        // Create backup
        fs.writeFileSync(`${filepath}.advanced-fix-backup`, originalContent);
        
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

  fixRegexFlags(content, filename) {
    let fixed = content;
    
    // Fix "Invalid regular expression flags" by removing duplicate flags
    fixed = fixed.replace(/\/([^\/]+)\/([gimuy]*)\1+/g, '/$1/$2');
    
    // Fix common regex flag issues
    fixed = fixed.replace(/\/([^\/]+)\/gm([gimuy]+)/g, '/$1/gm');
    fixed = fixed.replace(/\/([^\/]+)\/gi([gimuy]+)/g, '/$1/gi');
    fixed = fixed.replace(/\/([^\/]+)\/g([gimuy]*g[gimuy]*)/g, '/$1/g');
    
    return fixed;
  }

  fixUnterminatedGroups(content, filename) {
    let fixed = content;
    
    // Fix specific unterminated group patterns found in validation
    const fixes = [
      // Price patterns
      { from: /\/\\?\$\\?d\+\(\\?\.\\\?d\{2\}\?/g, to: '/\\$\\d+(?:\\.\\d{2})?/g' },
      { from: /\/\\?\$\(\\?d\+\(\\?\.\\\?d\{2\}\?\)/g, to: '/\\$(\\d+(?:\\.\\d{2})?)/g' },
      
      // Date patterns
      { from: /\/\(\[A-Za-z\]\{3\}\\s\+\(\\d\{1,2\}/g, to: '/([A-Za-z]{3}\\s+(\\d{1,2}))/g' },
      { from: /\/\(\[A-Za-z\]\{3\}\\s\+\(\\d\{1,2\},\\s\+\(\\d\{4\}/g, to: '/([A-Za-z]{3}\\s+(\\d{1,2}),\\s+(\\d{4}))/g' },
      
      // Time patterns
      { from: /\/\(\\d\{1,2\}:?\(\\d\{2\}\?\\s\*\(AM\|PM\|am\|p\)/g, to: '/(\\d{1,2}:?(\\d{2})?\\s*(AM|PM|am|pm)?)/gi' },
      { from: /\/\(\\d\{1,2\}\(\?\::?\(\\d\{2\}\?/g, to: '/(\\d{1,2}(?::(\\d{2}))?)/g' },
      
      // General unterminated groups
      { from: /\/\(([^)]+)$/gm, to: (match, group) => `/$(${group})/g` }
    ];

    fixes.forEach(fix => {
      if (fixed.match(fix.from)) {
        console.log(`   🔍 Fixing unterminated group in ${filename}`);
        fixed = fixed.replace(fix.from, fix.to);
      }
    });

    return fixed;
  }

  fixUnexpectedTokens(content, filename) {
    let fixed = content;
    
    // Fix "Unexpected token '{'" - usually from malformed objects
    fixed = fixed.replace(/{\s*([^}]*)\s*{\s*/g, '{ $1 ');
    
    // Fix "Unexpected token ')'" - usually from extra parentheses
    fixed = fixed.replace(/\)\s*\)/g, ')');
    
    // Fix "Unexpected token '}'" - usually from malformed object syntax
    fixed = fixed.replace(/}\s*}/g, '}');
    
    // Remove stray tokens
    fixed = fixed.replace(/\*\s*[;}]/g, ';');
    fixed = fixed.replace(/{\s*[;}]/g, '');
    
    return fixed;
  }

  fixConstructorIssues(content, filename) {
    let fixed = content;
    
    // Fix "scraperModule is not a constructor" by ensuring proper exports
    if (fixed.includes('scraperModule is not a constructor') || 
        !fixed.includes('module.exports') || 
        fixed.includes('module.exports = scraperModule')) {
      
      // Add proper exports structure
      const exportPattern = /module\.exports\s*=.*$/m;
      if (exportPattern.test(fixed)) {
        fixed = fixed.replace(exportPattern, 'module.exports = { scrape: scrapeEvents };');
      } else {
        fixed += '\n\nmodule.exports = { scrape: scrapeEvents };\n';
      }
      
      console.log(`   🔧 Fixed constructor exports in ${filename}`);
    }
    
    return fixed;
  }

  fixTemplateExpressions(content, filename) {
    let fixed = content;
    
    // Fix "Missing } in template expression"
    const templateFixes = [
      { from: /\$\{([^}]+)(?!\})/g, to: '${$1}' },
      { from: /\$\{([^}]*)\{/g, to: '${$1}' }
    ];

    templateFixes.forEach(fix => {
      fixed = fixed.replace(fix.from, fix.to);
    });

    return fixed;
  }

  ensureValidSyntax(content, filename) {
    let fixed = content;
    
    // Ensure balanced braces, brackets, and parentheses
    const lines = fixed.split('\n');
    const fixedLines = lines.map((line, index) => {
      let fixedLine = line;
      
      // Count and balance parentheses
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      
      if (openParens > closeParens) {
        fixedLine += ')'.repeat(openParens - closeParens);
      }
      
      // Remove excess closing parentheses
      if (closeParens > openParens) {
        const excess = closeParens - openParens;
        for (let i = 0; i < excess; i++) {
          fixedLine = fixedLine.replace(/\)/, '');
        }
      }
      
      // Fix common syntax patterns
      fixedLine = fixedLine
        .replace(/,\s*,/g, ',')           // Remove double commas
        .replace(/;\s*;/g, ';')           // Remove double semicolons
        .replace(/\+\s*\+/g, '+')         // Remove double plus
        .replace(/\|\s*\|/g, '|');        // Remove double pipes
      
      return fixedLine;
    });
    
    return fixedLines.join('\n');
  }

  printSummary() {
    console.log('\n🎯 ADVANCED FIXING COMPLETE');
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
  const fixer = new AdvancedTorontoFixer();
  fixer.fixAllScrapers().catch(console.error);
}

module.exports = AdvancedTorontoFixer;
