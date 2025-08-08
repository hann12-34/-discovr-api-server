const fs = require('fs');
const path = require('path');

class UniversalFallbackRemover {
    constructor() {
        this.cities = ['New York', 'Montreal', 'Calgary', 'vancouver', 'Toronto'];
        this.results = {
            totalFiles: 0,
            totalFixed: 0,
            cityResults: {}
        };

        // Comprehensive fallback patterns to detect and remove
        this.fallbackPatterns = [
            // Sample events patterns
            /sample\s+event/gi,
            /test\s+event/gi,
            /example\s+event/gi,
            /fallback\s*events?/gi,
            /fallback\/sample\s*events?/gi,
            
            // Fallback logic patterns
            /only\s+real\s+scraped\s+events?/gi,
            /fallback.*?events?.*?only\s+real/gi,
            /Test\s+completed[^}]*event/gi,
            /Added\s*\$\{.*?Count\}\s*event/gi,
            
            // Template/placeholder patterns
            /example\.com\/event/gi,
            /venue\.name.*example/gi,
            /teString.*Skipping\s+event/gi,
            /teStr.*Skipping\s+event/gi,
            
            // Test collection patterns
            /test.*collection.*event/gi,
            /\.collection\(['"]event/gi,
            
            // Sample venue patterns
            /test\s+at\s+.*weekly\s+.*Night/gi,
            /Host.*test\s+event/gi,
            
            // Fallback comments
            /\/\*[\s\S]*fallback[\s\S]*?\*\//gi,
            /\/\/.*fallback.*$/gmi,
            /\/\/.*sample.*event.*$/gmi,
            /\/\/.*test.*event.*$/gmi
        ];

        // Patterns that indicate fallback logic blocks
        this.fallbackBlockPatterns = [
            // If no events found, add fallback
            /if\s*\([^)]*events.*length.*===?\s*0[^}]*{[^}]*fallback/gi,
            /if\s*\([^)]*!events[^}]*{[^}]*sample/gi,
            
            // Return sample events
            /return\s*\[[^]]*sample.*event[^]]*\]/gi,
            /events\s*=\s*\[[^]]*sample.*event[^]]*\]/gi,
        ];
    }

    async removeAllFallbacks() {
        console.log('🚫 UNIVERSAL FALLBACK REMOVAL');
        console.log('==============================');
        console.log('Removing ALL fallback/sample code from scrapers');
        console.log('Enforcing strict no-fallback policy\n');

        for (const city of this.cities) {
            await this.removeCityFallbacks(city);
        }

        this.printSummary();
    }

    async removeCityFallbacks(city) {
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
            const result = await this.removeFallbacksFromFile(city, file);
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

        console.log(`\n📊 ${city} Fallback Removal Results:`);
        console.log(`✅ Fixed: ${cityResults.fixed}`);
        console.log(`⏭️  Skipped: ${cityResults.skipped}`);
        console.log(`❌ Errors: ${cityResults.errors}`);
    }

    async removeFallbacksFromFile(city, fileName) {
        const filePath = path.join('cities', city, fileName);
        
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            let originalContent = content;
            let changesCount = 0;

            // Check if file has any fallback patterns
            let hasFallbacks = false;
            for (const pattern of this.fallbackPatterns) {
                if (pattern.test(content)) {
                    hasFallbacks = true;
                    break;
                }
            }

            // Check for fallback block patterns
            for (const pattern of this.fallbackBlockPatterns) {
                if (pattern.test(content)) {
                    hasFallbacks = true;
                    break;
                }
            }

            if (!hasFallbacks) {
                console.log(`⏭️  ${fileName}: No fallback patterns found`);
                return 'skipped';
            }

            // Create backup before making changes
            fs.writeFileSync(`${filePath}.fallback-backup`, originalContent);

            // Remove fallback patterns
            for (const pattern of this.fallbackPatterns) {
                const beforeLength = content.length;
                content = content.replace(pattern, '');
                if (content.length !== beforeLength) {
                    changesCount++;
                }
            }

            // Remove fallback block patterns
            for (const pattern of this.fallbackBlockPatterns) {
                const beforeLength = content.length;
                content = content.replace(pattern, '// Fallback logic removed - only real events allowed');
                if (content.length !== beforeLength) {
                    changesCount++;
                }
            }

            // Clean up multiple empty lines
            content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

            // Clean up comments that mention fallbacks
            content = content.replace(/\/\/.*fallback.*$/gmi, '');
            content = content.replace(/\/\/.*sample.*event.*$/gmi, '');

            if (changesCount > 0) {
                fs.writeFileSync(filePath, content);
                console.log(`✅ ${fileName}: Removed ${changesCount} fallback patterns`);
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
        console.log('\n\n🎯 UNIVERSAL FALLBACK REMOVAL SUMMARY');
        console.log('======================================');
        console.log(`Total Files Processed: ${this.results.totalFiles}`);
        console.log(`✅ Total Fixed: ${this.results.totalFixed}`);

        console.log('\n📊 PER-CITY RESULTS:');
        Object.entries(this.results.cityResults).forEach(([city, results]) => {
            console.log(`   ${city}: ${results.fixed}/${results.total} fixed`);
        });

        console.log('\n🚀 NEXT STEPS:');
        console.log('1. Run universal city tagging fix script');
        console.log('2. Re-validate all cities to measure improvement');
        console.log('3. Target remaining per-file issues');
        console.log('\n💡 Backup files (.fallback-backup) created for safety');
        console.log('\n🚫 ZERO TOLERANCE: All fallback/sample code removed!');
    }
}

// Run the universal fallback remover
if (require.main === module) {
    const remover = new UniversalFallbackRemover();
    remover.removeAllFallbacks().catch(console.error);
}

module.exports = UniversalFallbackRemover;
