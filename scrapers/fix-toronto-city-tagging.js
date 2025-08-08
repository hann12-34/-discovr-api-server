#!/usr/bin/env node

/**
 * Batch city tagging fix script for Toronto scrapers
 * Based on proven New York scraper methodology
 * 
 * Ensures all events are tagged with the correct city based on folder-based authority
 */

const fs = require('fs');
const path = require('path');

class TorontoCityTaggingFixer {
    constructor() {
        this.fixedCount = 0;
        this.skippedCount = 0;
        this.errorCount = 0;
        this.fixedFiles = [];
    }

    /**
     * Check for city tagging violations in code
     */
    hasCityTaggingViolations(content) {
        const violations = [
            // Hardcoded city values
            /venue\.name\s*:\s*["'][^"']*["']/g,
            /venue\.city\s*:\s*["'][^"']*["']/g,
            /city\s*:\s*["'][^"']*["']/g,
            // getCityFromArgs usage (should use passed city parameter)
            /getCityFromArgs\s*\(\s*\)/g,
            // Hardcoded venue names that should be city
            /venue\.name\s*:\s*venue\.name/g
        ];
        
        return violations.some(pattern => pattern.test(content));
    }

    /**
     * Fix city tagging violations
     */
    fixCityTagging(content) {
        let fixedContent = content;
        const appliedFixes = [];

        // 1. Replace getCityFromArgs() with the passed city parameter
        if (fixedContent.includes('getCityFromArgs()')) {
            fixedContent = fixedContent.replace(/getCityFromArgs\s*\(\s*\)/g, 'city');
            appliedFixes.push('Replaced getCityFromArgs() with city parameter');
        }

        // 2. Fix hardcoded venue.name assignments to use city
        const venueNameMatches = fixedContent.match(/venue\.name\s*:\s*["'][^"']*["']/g);
        if (venueNameMatches) {
            venueNameMatches.forEach(match => {
                const venueNameValue = match.match(/["']([^"']*)["']/)[1];
                // If it's not already the city parameter, replace it
                if (!match.includes('city') && venueNameValue !== 'Toronto') {
                    fixedContent = fixedContent.replace(match, 'venue.name: city');
                    appliedFixes.push(`Fixed hardcoded venue.name "${venueNameValue}" to use city parameter`);
                }
            });
        }

        // 3. Fix hardcoded venue.city assignments to use city
        const venueCityMatches = fixedContent.match(/venue\.city\s*:\s*["'][^"']*["']/g);
        if (venueCityMatches) {
            venueCityMatches.forEach(match => {
                const venueCityValue = match.match(/["']([^"']*)["']/)[1];
                if (!match.includes('city') && venueCityValue !== 'Toronto') {
                    fixedContent = fixedContent.replace(match, 'venue.city: city');
                    appliedFixes.push(`Fixed hardcoded venue.city "${venueCityValue}" to use city parameter`);
                }
            });
        }

        // 4. Fix hardcoded city field assignments
        const cityMatches = fixedContent.match(/city\s*:\s*["'][^"']*["']/g);
        if (cityMatches) {
            cityMatches.forEach(match => {
                const cityValue = match.match(/["']([^"']*)["']/)[1];
                if (!match.includes('city') && cityValue !== 'Toronto') {
                    fixedContent = fixedContent.replace(match, 'city: city');
                    appliedFixes.push(`Fixed hardcoded city "${cityValue}" to use city parameter`);
                }
            });
        }

        // 5. Ensure venue.name is set to city for all events (common pattern)
        if (fixedContent.includes('venue: {') && !fixedContent.includes('venue.name: city')) {
            // Look for venue object patterns and ensure venue.name is set to city
            fixedContent = fixedContent.replace(
                /venue:\s*\{([^}]*)\}/g,
                (match, venueContent) => {
                    if (!venueContent.includes('name:')) {
                        return `venue: {\n                name: city,${venueContent}\n            }`;
                    } else if (!venueContent.includes('name: city')) {
                        // Replace existing hardcoded name with city parameter
                        const updatedVenueContent = venueContent.replace(
                            /name:\s*["'][^"']*["']/g,
                            'name: city'
                        ).replace(
                            /name:\s*[^,}]+/g,
                            'name: city'
                        );
                        return `venue: {${updatedVenueContent}}`;
                    }
                    return match;
                }
            );
            
            if (fixedContent !== content) {
                appliedFixes.push('Updated venue.name to use city parameter in venue objects');
            }
        }

        // 6. Add city parameter to function if missing
        if (!fixedContent.includes('async (city)') && !fixedContent.includes('function(city)') && 
            !fixedContent.includes('scrape(city)') && appliedFixes.length > 0) {
            
            // Make sure the function accepts the city parameter
            if (fixedContent.includes('module.exports = async ()')) {
                fixedContent = fixedContent.replace('module.exports = async ()', 'module.exports = async (city)');
                appliedFixes.push('Added city parameter to async function');
            } else if (fixedContent.includes('async scrape()')) {
                fixedContent = fixedContent.replace('async scrape()', 'async scrape(city)');
                appliedFixes.push('Added city parameter to scrape method');
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
            if (!this.hasCityTaggingViolations(content)) {
                console.log(`   ⏭️  Skipped: No city tagging violations found`);
                this.skippedCount++;
                return;
            }

            // Create backup
            const backupPath = `${filePath}.city-backup`;
            if (!fs.existsSync(backupPath)) {
                fs.writeFileSync(backupPath, content);
            }

            // Fix city tagging
            const { fixedContent, appliedFixes } = this.fixCityTagging(content);
            
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
     * Run batch city tagging fix on Toronto scrapers
     */
    async runBatchCityTaggingFix() {
        console.log(`🍁 TORONTO SCRAPER CITY TAGGING FIX`);
        console.log(`==================================`);
        console.log(`Fixing city tagging to use folder-based city authority`);
        console.log(`Based on proven New York scraper methodology\n`);

        const torontoDir = path.join(__dirname, 'cities', 'Toronto');
        
        if (!fs.existsSync(torontoDir)) {
            console.error(`❌ Toronto directory not found: ${torontoDir}`);
            return;
        }

        // Focus on files that commonly have city tagging issues
        const priorityFiles = [
            'scrape-cn-tower.js', // Known to have venue.name as "CN Tower" instead of city
            'scrape-todocanada-toronto-events.js', // Multi-city logic
            'scrape-toronto-ca-events.js'
        ];

        // Get all Toronto scraper files
        const allFiles = fs.readdirSync(torontoDir)
            .filter(file => file.endsWith('.js'))
            .filter(file => !file.includes('.backup'))
            .filter(file => !file.includes('test-'))
            .filter(file => !file.includes('template'))
            .filter(file => file.startsWith('scrape-') || ['massey-hall.js', 'meridian-hall.js', 'roy-thomson-hall.js'].includes(file));

        const files = [
            ...priorityFiles.filter(file => allFiles.includes(file)),
            ...allFiles.filter(file => !priorityFiles.includes(file))
        ].slice(0, 40); // Process first 40 to avoid timeout

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
        console.log(`\n📊 CITY TAGGING FIX SUMMARY`);
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

        console.log(`\n✅ CITY TAGGING FIX COMPLETE`);
        console.log(`🎉 Run the validation script again to test the fixes!`);
        console.log(`💡 Backup files (.city-backup) were created for safety.`);
    }
}

// Run city tagging fix if called directly
if (require.main === module) {
    const fixer = new TorontoCityTaggingFixer();
    fixer.runBatchCityTaggingFix()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ City tagging fix failed:', error);
            process.exit(1);
        });
}

module.exports = TorontoCityTaggingFixer;
