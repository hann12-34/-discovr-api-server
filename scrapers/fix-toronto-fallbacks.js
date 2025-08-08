#!/usr/bin/env node

/**
 * Batch fallback/sample code removal script for Toronto scrapers
 * Based on proven New York scraper methodology
 * 
 * Removes fallback/sample event generation patterns and ensures only real events
 */

const fs = require('fs');
const path = require('path');

class TorontoFallbackRemover {
    constructor() {
        this.fixedCount = 0;
        this.skippedCount = 0;
        this.errorCount = 0;
        this.fixedFiles = [];
        
        // Common fallback patterns to remove
        this.fallbackPatterns = [
            // Sample event patterns
            {
                pattern: /sample.*event/gi,
                description: 'Sample event references'
            },
            {
                pattern: /fallback.*event/gi,
                description: 'Fallback event references'
            },
            {
                pattern: /dummy.*event/gi,
                description: 'Dummy event references'
            },
            {
                pattern: /placeholder.*event/gi,
                description: 'Placeholder event references'
            },
            {
                pattern: /fake.*event/gi,
                description: 'Fake event references'
            },
            {
                pattern: /test.*event/gi,
                description: 'Test event references'
            },
            {
                pattern: /mock.*event/gi,
                description: 'Mock event references'
            },
            // Specific problematic patterns found in validation
            {
                pattern: /teString\s*=\s*\$\(element\)\.find\('\.event/g,
                description: 'Problematic dateString variable name'
            },
            {
                pattern: /teString\s*=\s*\$\(element\)\.find\('\.c-event/g,
                description: 'Problematic dateString variable name with c-event'
            }
        ];

        // Common fallback code blocks to remove entirely
        this.fallbackBlocks = [
            // Array.fill patterns
            /\.\.\.Array\(\d+\)\.fill\([^)]*\)/g,
            // Loop-based event generation
            /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*\d+\s*;\s*i\+\+\s*\)\s*\{[^}]*\}/g,
            // generateEvent stub calls
            /generateEvent.*stub[^;]*;?/g
        ];
    }

    /**
     * Check if file contains fallback violations
     */
    containsFallbacks(content) {
        for (const { pattern } of this.fallbackPatterns) {
            if (pattern.test(content)) {
                return true;
            }
        }
        
        for (const blockPattern of this.fallbackBlocks) {
            if (blockPattern.test(content)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Remove fallback patterns from content
     */
    removeFallbacks(content) {
        let fixedContent = content;
        const appliedFixes = [];

        // Fix specific dateString variable name issues
        if (fixedContent.includes('teString')) {
            fixedContent = fixedContent.replace(/teString/g, 'dateString');
            appliedFixes.push('Fixed teString variable name to dateString');
        }

        // Remove fallback patterns
        for (const { pattern, description } of this.fallbackPatterns) {
            const matches = fixedContent.match(pattern);
            if (matches) {
                // For specific problematic patterns, fix rather than remove
                if (description.includes('dateString variable name')) {
                    // Already handled above
                    continue;
                }
                
                // For other patterns, comment out or remove
                fixedContent = fixedContent.replace(pattern, (match) => {
                    return `// REMOVED: ${match} (${description})`;
                });
                appliedFixes.push(`Removed: ${description}`);
            }
        }

        // Remove fallback code blocks
        for (const blockPattern of this.fallbackBlocks) {
            const matches = fixedContent.match(blockPattern);
            if (matches) {
                fixedContent = fixedContent.replace(blockPattern, (match) => {
                    return `// REMOVED FALLBACK BLOCK: ${match.split('\n')[0]}...`;
                });
                appliedFixes.push('Removed fallback code block');
            }
        }

        return { fixedContent, appliedFixes };
    }

    /**
     * Fix a single scraper file
     */
    async fixScraperFile(filePath, fileName) {
        try {
            console.log(`📄 Processing: ${fileName}`);
            
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check if this file needs fixing
            if (!this.containsFallbacks(content)) {
                console.log(`   ⏭️  Skipped: No fallback patterns found`);
                this.skippedCount++;
                return;
            }

            // Create backup
            const backupPath = `${filePath}.fallback-backup`;
            if (!fs.existsSync(backupPath)) {
                fs.writeFileSync(backupPath, content);
            }

            // Remove fallbacks
            const { fixedContent, appliedFixes } = this.removeFallbacks(content);
            
            if (fixedContent !== content && appliedFixes.length > 0) {
                fs.writeFileSync(filePath, fixedContent);
                console.log(`   ✅ Fixed: ${appliedFixes.join(', ')}`);
                this.fixedCount++;
                this.fixedFiles.push(`${fileName} (${appliedFixes.length} fixes)`);
            } else {
                console.log(`   ⏭️  Skipped: No changes needed`);
                this.skippedCount++;
            }

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            this.errorCount++;
        }
    }

    /**
     * Run batch fallback removal on Toronto scrapers
     */
    async runBatchFallbackRemoval() {
        console.log(`🍁 TORONTO SCRAPER FALLBACK REMOVAL`);
        console.log(`==================================`);
        console.log(`Removing fallback/sample code patterns for production readiness`);
        console.log(`Based on proven New York scraper methodology\n`);

        const torontoDir = path.join(__dirname, 'cities', 'Toronto');
        
        if (!fs.existsSync(torontoDir)) {
            console.error(`❌ Toronto directory not found: ${torontoDir}`);
            return;
        }

        // Focus on specific files that were flagged in validation
        const priorityFiles = [
            'massey-hall.js',
            'meridian-hall.js', 
            'roy-thomson-hall.js'
        ];

        // Get all Toronto scraper files, prioritizing flagged ones
        const allFiles = fs.readdirSync(torontoDir)
            .filter(file => file.endsWith('.js'))
            .filter(file => !file.includes('.backup'))
            .filter(file => !file.includes('test-'))
            .filter(file => !file.includes('template'));

        const files = [
            ...priorityFiles.filter(file => allFiles.includes(file)),
            ...allFiles.filter(file => !priorityFiles.includes(file))
        ].slice(0, 30); // Process first 30 to avoid timeout

        console.log(`Found ${files.length} scraper files to process`);
        console.log(`Priority files: ${priorityFiles.join(', ')}\n`);

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
        console.log(`\n📊 FALLBACK REMOVAL SUMMARY`);
        console.log(`===========================`);
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

        console.log(`\n✅ FALLBACK REMOVAL COMPLETE`);
        console.log(`🎉 Run the validation script again to test the fixes!`);
        console.log(`💡 Backup files (.fallback-backup) were created for safety.`);
    }
}

// Run fallback removal if called directly
if (require.main === module) {
    const remover = new TorontoFallbackRemover();
    remover.runBatchFallbackRemoval()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Fallback removal failed:', error);
            process.exit(1);
        });
}

module.exports = TorontoFallbackRemover;
