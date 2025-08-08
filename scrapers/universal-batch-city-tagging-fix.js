const fs = require('fs');
const path = require('path');

class UniversalCityTaggingFixer {
    constructor() {
        this.cities = ['New York', 'Montreal', 'Calgary', 'vancouver', 'Toronto'];
        this.results = {
            totalFiles: 0,
            totalFixed: 0,
            cityResults: {}
        };

        // City tagging violations to fix
        this.cityTaggingIssues = [
            // getCityFromArgs() usage (should use passed city parameter)
            {
                pattern: /getCityFromArgs\(\)/g,
                replacement: 'city',
                description: 'Replace getCityFromArgs() with city parameter'
            },
            
            // Hardcoded city values
            {
                pattern: /city:\s*['"]Toronto['"],?/g,
                replacement: 'city: city,',
                description: 'Replace hardcoded Toronto with city parameter'
            },
            {
                pattern: /city:\s*['"]New York['"],?/g,
                replacement: 'city: city,',
                description: 'Replace hardcoded New York with city parameter'
            },
            {
                pattern: /city:\s*['"]Montreal['"],?/g,
                replacement: 'city: city,',
                description: 'Replace hardcoded Montreal with city parameter'
            },
            {
                pattern: /city:\s*['"]Calgary['"],?/g,
                replacement: 'city: city,',
                description: 'Replace hardcoded Calgary with city parameter'
            },
            {
                pattern: /city:\s*['"]Vancouver['"],?/g,
                replacement: 'city: city,',
                description: 'Replace hardcoded Vancouver with city parameter'
            },
            {
                pattern: /city:\s*['"]vancouver['"],?/g,
                replacement: 'city: city,',
                description: 'Replace hardcoded vancouver with city parameter'
            },
            
            // venue.name assignments that should use folder-based city
            {
                pattern: /venue:\s*{\s*name:\s*['"]([^'"]*)['"]\s*},?\s*city:\s*getCityFromArgs\(\)/g,
                replacement: (match, venueName) => `venue: { name: "${venueName}" }, city: city`,
                description: 'Fix venue.name with getCityFromArgs() to use city parameter'
            }
        ];

        // Additional patterns for city normalization
        this.cityNormalizationFixes = [
            // Ensure city parameter is used consistently
            {
                pattern: /const\s+city\s*=\s*getCityFromArgs\(\);?/g,
                replacement: '// City parameter passed from runner',
                description: 'Remove getCityFromArgs() variable assignment'
            },
            
            // Fix venue name using city incorrectly
            {
                pattern: /venue:\s*{\s*name:\s*city\s*}/g,
                replacement: 'venue: { name: getVenueName() }',
                description: 'Fix venue.name incorrectly using city'
            }
        ];
    }

    async fixAllCityTagging() {
        console.log('🏷️ UNIVERSAL CITY TAGGING FIX');
        console.log('==============================');
        console.log('Enforcing folder-based city authority');
        console.log('Replacing getCityFromArgs() with city parameter');
        console.log('Removing hardcoded city values\n');

        for (const city of this.cities) {
            await this.fixCityTagging(city);
        }

        this.printSummary();
    }

    async fixCityTagging(city) {
        console.log(`\n🏙️  Processing ${city} scrapers...`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const cityDir = path.join('cities', city);
        if (!fs.existsSync(cityDir)) {
            console.log(`❌ City directory not found: ${cityDir}`);
            return;
        }

        const scraperFiles = fs.readdirSync(cityDir)
            .filter(file => file.endsWith('.js') && !file.includes('test-') && !file.includes('index') && !file.includes('template'))
            .sort();

        const cityResults = {
            total: scraperFiles.length,
            fixed: 0,
            skipped: 0,
            errors: 0
        };

        console.log(`Found ${scraperFiles.length} scrapers to check\n`);

        for (const file of scraperFiles) {
            const result = await this.fixCityTaggingInFile(city, file);
            if (result === 'fixed') {
                cityResults.fixed++;
            } else if (result === 'skipped') {
                cityResults.skipped++;
            } else if (result === 'error') {
                cityResults.errors++;
            }
        }

        this.results.totalFiles += cityResults.total;
        this.results.totalFixed += cityResults.fixed;
        this.results.cityResults[city] = cityResults;

        console.log(`\n📊 ${city} City Tagging Fix Results:`);
        console.log(`✅ Fixed: ${cityResults.fixed}`);
        console.log(`⏭️  Skipped: ${cityResults.skipped}`);
        console.log(`❌ Errors: ${cityResults.errors}`);
    }

    async fixCityTaggingInFile(city, fileName) {
        const filePath = path.join('cities', city, fileName);
        
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            let originalContent = content;
            let changesCount = 0;

            // Check if file has city tagging issues
            let hasCityTaggingIssues = false;
            for (const issue of this.cityTaggingIssues) {
                if (issue.pattern.test(content)) {
                    hasCityTaggingIssues = true;
                    break;
                }
            }

            // Check normalization issues
            for (const fix of this.cityNormalizationFixes) {
                if (fix.pattern.test(content)) {
                    hasCityTaggingIssues = true;
                    break;
                }
            }

            if (!hasCityTaggingIssues) {
                console.log(`⏭️  ${fileName}: No city tagging issues found`);
                return 'skipped';
            }

            // Create backup before making changes
            fs.writeFileSync(`${filePath}.city-tagging-backup`, originalContent);

            // Apply city tagging fixes
            for (const issue of this.cityTaggingIssues) {
                const beforeLength = content.length;
                if (typeof issue.replacement === 'function') {
                    content = content.replace(issue.pattern, issue.replacement);
                } else {
                    content = content.replace(issue.pattern, issue.replacement);
                }
                if (content.length !== beforeLength) {
                    changesCount++;
                }
            }

            // Apply normalization fixes
            for (const fix of this.cityNormalizationFixes) {
                const beforeLength = content.length;
                content = content.replace(fix.pattern, fix.replacement);
                if (content.length !== beforeLength) {
                    changesCount++;
                }
            }

            // Ensure scrape function accepts city parameter
            if (!content.includes('async scrape(city)') && !content.includes('scrape: async (city)')) {
                // Fix scrape function signature if needed
                content = content.replace(
                    /async\s+scrape\s*\(\s*\)/g, 
                    'async scrape(city)'
                );
                content = content.replace(
                    /scrape:\s*async\s*\(\s*\)/g, 
                    'scrape: async (city)'
                );
            }

            if (changesCount > 0) {
                fs.writeFileSync(filePath, content);
                console.log(`✅ ${fileName}: Fixed ${changesCount} city tagging issues`);
                return 'fixed';
            } else {
                console.log(`⏭️  ${fileName}: No changes needed`);
                return 'skipped';
            }

        } catch (error) {
            console.log(`❌ ${fileName}: Error - ${error.message}`);
            return 'error';
        }
    }

    printSummary() {
        console.log('\n\n🎯 UNIVERSAL CITY TAGGING FIX SUMMARY');
        console.log('======================================');
        console.log(`Total Files Processed: ${this.results.totalFiles}`);
        console.log(`✅ Total Fixed: ${this.results.totalFixed}`);

        console.log('\n📊 PER-CITY RESULTS:');
        Object.entries(this.results.cityResults).forEach(([city, results]) => {
            console.log(`   ${city}: ${results.fixed}/${results.total} fixed`);
        });

        console.log('\n🚀 FINAL VALIDATION:');
        console.log('1. Re-run universal validation script');
        console.log('2. Compare before/after success rates');
        console.log('3. Target any remaining per-file issues');
        console.log('4. Document production-ready scrapers');
        
        console.log('\n🏷️ CITY TAGGING ENFORCED:');
        console.log('- Folder-based city authority implemented');
        console.log('- getCityFromArgs() eliminated');
        console.log('- Hardcoded city values removed');
        console.log('- City parameter consistency enforced');
        console.log('\n💡 Backup files (.city-tagging-backup) created for safety');
    }
}

// Run the universal city tagging fixer
if (require.main === module) {
    const fixer = new UniversalCityTaggingFixer();
    fixer.fixAllCityTagging().catch(console.error);
}

module.exports = UniversalCityTaggingFixer;
