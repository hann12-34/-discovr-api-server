#!/usr/bin/env node

/**
 * Batch Export Structure Fix Script for New York Scrapers
 * 
 * This script systematically converts class exports to function exports
 * to make scrapers compatible with the runner/validator system.
 * 
 * Converts: module.exports = ClassName;
 * To: module.exports = async (city) => { const scraper = new ClassName(); return await scraper.scrape(city); };
 */

const fs = require('fs');
const path = require('path');

class NYScraperExportFixer {
  constructor() {
    this.nyDir = path.join(__dirname, 'cities', 'New York');
    this.results = {
      total: 0,
      fixed: 0,
      skipped: 0,
      errors: 0,
      details: []
    };
  }

  async fixAllNYScrapers() {
    console.log('🔧 BATCH FIXING NEW YORK SCRAPER EXPORTS');
    console.log('=========================================');
    console.log(`Target directory: ${this.nyDir}\n`);

    if (!fs.existsSync(this.nyDir)) {
      console.log('❌ New York directory not found');
      return;
    }

    const files = fs.readdirSync(this.nyDir).filter(file => 
      file.endsWith('.js') && 
      !file.includes('test') && 
      !file.includes('index') &&
      !file.includes('template') &&
      !file.includes('fixed') // Skip already fixed files
    );

    console.log(`Found ${files.length} scrapers to process\n`);

    for (const file of files) {
      await this.processFile(file);
    }

    this.printSummary();
  }

  async processFile(fileName) {
    this.results.total++;
    const filePath = path.join(this.nyDir, fileName);
    
    try {
      console.log(`📄 Processing: ${fileName}`);
      
      const originalContent = fs.readFileSync(filePath, 'utf8');
      const analysis = this.analyzeFile(originalContent);
      
      if (analysis.needsFix) {
        const fixedContent = this.generateFixedContent(originalContent, analysis);
        
        // Create backup
        const backupPath = filePath + '.backup';
        if (!fs.existsSync(backupPath)) {
          fs.writeFileSync(backupPath, originalContent);
        }
        
        // Write fixed version
        fs.writeFileSync(filePath, fixedContent);
        
        this.recordSuccess(fileName, analysis.className);
      } else {
        this.recordSkipped(fileName, analysis.reason);
      }
      
    } catch (error) {
      this.recordError(fileName, error.message);
    }
  }

  analyzeFile(content) {
    const analysis = {
      needsFix: false,
      className: null,
      hasClassExport: false,
      hasClass: false,
      hasScrapeMethod: false,
      reason: null
    };

    // Check for class export pattern
    const classExportMatch = content.match(/module\.exports\s*=\s*([A-Z][A-Za-z0-9_]*)\s*;/);
    if (classExportMatch) {
      analysis.hasClassExport = true;
      analysis.className = classExportMatch[1];
    }

    // Check if the exported name is actually a class
    if (analysis.className) {
      const classPattern = new RegExp(`class\\s+${analysis.className}\\s*{`, 'i');
      analysis.hasClass = classPattern.test(content);
    }

    // Check for scrape method in class
    if (analysis.hasClass) {
      const scrapeMethodPattern = /async\s+scrape\s*\(|scrape\s*\(/;
      analysis.hasScrapeMethod = scrapeMethodPattern.test(content);
    }

    // Check if already has function export
    const functionExportPattern = /module\.exports\s*=\s*(async\s*)?\([^)]*\)\s*=>/;
    const hasDirectFunctionExport = functionExportPattern.test(content);

    // Check if already exports object with scrape method
    const objectExportPattern = /module\.exports\s*=\s*{\s*scrape/;
    const hasObjectScrapeExport = objectExportPattern.test(content);

    // Determine if fix is needed
    if (analysis.hasClassExport && analysis.hasClass && analysis.hasScrapeMethod) {
      analysis.needsFix = true;
    } else if (hasDirectFunctionExport) {
      analysis.reason = 'Already exports function';
    } else if (hasObjectScrapeExport) {
      analysis.reason = 'Already exports object with scrape method';
    } else if (!analysis.hasClass) {
      analysis.reason = 'No class found or not a class export';
    } else if (!analysis.hasScrapeMethod) {
      analysis.reason = 'No scrape method found in class';
    } else {
      analysis.reason = 'Unknown structure';
    }

    return analysis;
  }

  generateFixedContent(originalContent, analysis) {
    const { className } = analysis;
    
    // Replace the module.exports line
    const newExport = `
// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new ${className}();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.${className} = ${className};`;

    // Replace the old export
    const exportPattern = new RegExp(`module\\.exports\\s*=\\s*${className}\\s*;`, 'g');
    const fixedContent = originalContent.replace(exportPattern, newExport);

    return fixedContent;
  }

  recordSuccess(fileName, className) {
    this.results.fixed++;
    console.log(`   ✅ Fixed: Converted class ${className} to function export`);
    this.results.details.push({
      file: fileName,
      status: 'FIXED',
      className
    });
  }

  recordSkipped(fileName, reason) {
    this.results.skipped++;
    console.log(`   ⏭️  Skipped: ${reason}`);
    this.results.details.push({
      file: fileName,
      status: 'SKIPPED',
      reason
    });
  }

  recordError(fileName, error) {
    this.results.errors++;
    console.log(`   ❌ Error: ${error}`);
    this.results.details.push({
      file: fileName,
      status: 'ERROR',
      error
    });
  }

  printSummary() {
    console.log('\n📊 BATCH FIX SUMMARY');
    console.log('===================');
    console.log(`Total files processed: ${this.results.total}`);
    console.log(`✅ Fixed: ${this.results.fixed}`);
    console.log(`⏭️  Skipped: ${this.results.skipped}`);
    console.log(`❌ Errors: ${this.results.errors}`);

    if (this.results.fixed > 0) {
      console.log('\n✅ FIXED FILES:');
      this.results.details
        .filter(r => r.status === 'FIXED')
        .forEach(result => {
          console.log(`   ${result.file} (${result.className})`);
        });
    }

    if (this.results.errors > 0) {
      console.log('\n❌ ERRORS:');
      this.results.details
        .filter(r => r.status === 'ERROR')
        .forEach(result => {
          console.log(`   ${result.file}: ${result.error}`);
        });
    }

    console.log('\n🎯 BATCH FIX COMPLETE');
    
    if (this.results.fixed > 0) {
      console.log('🎉 Run the validation script again to test the fixes!');
      console.log('💡 Backup files (.backup) were created for safety.');
    }
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new NYScraperExportFixer();
  fixer.fixAllNYScrapers().catch(console.error);
}

module.exports = NYScraperExportFixer;
