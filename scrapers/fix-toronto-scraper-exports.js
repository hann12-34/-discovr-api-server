#!/usr/bin/env node

/**
 * Batch fix script for Toronto scraper exports
 * Based on proven New York scraper methodology
 * 
 * Converts class exports to function exports for runner compatibility
 */

const fs = require('fs');
const path = require('path');

class TorontoScraperExportFixer {
    constructor() {
        this.fixedCount = 0;
        this.skippedCount = 0;
        this.errorCount = 0;
        this.fixedFiles = [];
    }

    /**
     * Check if file has class export pattern
     */
    hasClassExport(content) {
        // Look for class export patterns
        const classExportPatterns = [
            /class\s+\w+[\s\S]*?module\.exports\s*=\s*\w+/,
            /module\.exports\s*=\s*class\s+\w+/,
            /module\.exports\s*=\s*\w+;?\s*$.*class\s+\w+/s
        ];
        
        return classExportPatterns.some(pattern => pattern.test(content));
    }

    /**
     * Extract class name from content
     */
    extractClassName(content) {
        const classMatch = content.match(/class\s+(\w+)/);
        return classMatch ? classMatch[1] : null;
    }

    /**
     * Convert class export to function export
     */
    convertToFunctionExport(content) {
        const className = this.extractClassName(content);
        if (!className) return content;

        // Check if already has function export wrapper
        if (content.includes('module.exports = async (city)') || 
            content.includes('module.exports = (city)')) {
            return content; // Already converted
        }

        // Add function export wrapper at the end
        const functionWrapper = `

// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new ${className}();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.${className} = ${className};
`;

        // Remove existing module.exports if it exports the class directly
        let updatedContent = content.replace(/module\.exports\s*=\s*\w+;?\s*$/gm, '');
        
        // Add the function wrapper
        updatedContent += functionWrapper;
        
        return updatedContent;
    }

    /**
     * Fix a single scraper file
     */
    async fixScraperFile(filePath, fileName) {
        try {
            console.log(`📄 Processing: ${fileName}`);
            
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check if this file needs fixing
            if (!this.hasClassExport(content)) {
                console.log(`   ⏭️  Skipped: No class export found`);
                this.skippedCount++;
                return;
            }

            // Create backup
            const backupPath = `${filePath}.backup`;
            if (!fs.existsSync(backupPath)) {
                fs.writeFileSync(backupPath, content);
            }

            // Convert the export
            const fixedContent = this.convertToFunctionExport(content);
            const className = this.extractClassName(content);
            
            if (fixedContent !== content) {
                fs.writeFileSync(filePath, fixedContent);
                console.log(`   ✅ Fixed: Converted class ${className} to function export`);
                this.fixedCount++;
                this.fixedFiles.push(`${fileName} (${className})`);
            } else {
                console.log(`   ⏭️  Skipped: Already has proper export structure`);
                this.skippedCount++;
            }

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            this.errorCount++;
        }
    }

    /**
     * Run batch fix on all Toronto scrapers
     */
    async runBatchFix() {
        console.log(`🍁 TORONTO SCRAPER EXPORT BATCH FIX`);
        console.log(`==================================`);
        console.log(`Converting class exports to function exports for runner compatibility`);
        console.log(`Based on proven New York scraper methodology\n`);

        const torontoDir = path.join(__dirname, 'cities', 'Toronto');
        
        if (!fs.existsSync(torontoDir)) {
            console.error(`❌ Toronto directory not found: ${torontoDir}`);
            return;
        }

        // Get all Toronto scraper files
        const files = fs.readdirSync(torontoDir)
            .filter(file => file.endsWith('.js'))
            .filter(file => file.startsWith('scrape-') || ['massey-hall.js', 'meridian-hall.js', 'roy-thomson-hall.js'].includes(file))
            .filter(file => !file.includes('.backup'))
            .filter(file => !file.includes('test-'))
            .filter(file => !file.includes('template'))
            .sort();

        console.log(`Found ${files.length} scraper files to process\n`);

        // Process each file
        for (const fileName of files) {
            const filePath = path.join(torontoDir, fileName);
            await this.fixScraperFile(filePath, fileName);
        }

        // Print summary
        this.printSummary();
    }

    /**
     * Print fix summary
     */
    printSummary() {
        console.log(`\n📊 BATCH FIX SUMMARY`);
        console.log(`===================`);
        console.log(`Total files processed: ${this.fixedCount + this.skippedCount + this.errorCount}`);
        console.log(`✅ Fixed: ${this.fixedCount}`);
        console.log(`⏭️  Skipped: ${this.skippedCount}`);
        console.log(`❌ Errors: ${this.errorCount}`);

        if (this.fixedCount > 0) {
            console.log(`\n✅ FIXED FILES:`);
            this.fixedFiles.forEach(file => {
                console.log(`   ${file}`);
            });
        }

        console.log(`\n✅ BATCH FIX COMPLETE`);
        console.log(`🎉 Run the validation script again to test the fixes!`);
        console.log(`💡 Backup files (.backup) were created for safety.`);
    }
}

// Run batch fix if called directly
if (require.main === module) {
    const fixer = new TorontoScraperExportFixer();
    fixer.runBatchFix()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Batch fix failed:', error);
            process.exit(1);
        });
}

module.exports = TorontoScraperExportFixer;
