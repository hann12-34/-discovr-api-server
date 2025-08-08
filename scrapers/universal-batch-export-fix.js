const fs = require('fs');
const path = require('path');

class UniversalExportFixer {
    constructor() {
        this.cities = ['New York', 'Montreal', 'Calgary', 'vancouver', 'Toronto'];
        this.results = {
            totalFiles: 0,
            totalFixed: 0,
            cityResults: {}
        };
    }

    async fixAllCities() {
        console.log('🌎 UNIVERSAL EXPORT STRUCTURE FIX');
        console.log('===================================');
        console.log('Applying proven export fixes to ALL cities');
        console.log('Converting class exports to function exports\n');

        for (const city of this.cities) {
            await this.fixCityExports(city);
        }

        this.printSummary();
    }

    async fixCityExports(city) {
        console.log(`\n🏙️  Processing ${city} scrapers...`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const cityDir = path.join('cities', city);
        if (!fs.existsSync(cityDir)) {
            console.log(`❌ City directory not found: ${cityDir}`);
            return;
        }

        const scraperFiles = fs.readdirSync(cityDir)
            .filter(file => file.endsWith('.js') && !file.includes('test-') && !file.includes('index'))
            .sort();

        const cityResults = {
            total: scraperFiles.length,
            fixed: 0,
            skipped: 0,
            errors: 0
        };

        console.log(`Found ${scraperFiles.length} scrapers to check\n`);

        for (const file of scraperFiles) {
            const result = await this.fixScraperExport(city, file);
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

        console.log(`\n📊 ${city} Export Fix Results:`);
        console.log(`✅ Fixed: ${cityResults.fixed}`);
        console.log(`⏭️  Skipped: ${cityResults.skipped}`);
        console.log(`❌ Errors: ${cityResults.errors}`);
    }

    async fixScraperExport(city, fileName) {
        const filePath = path.join('cities', city, fileName);
        
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Check if already has function export
            if (content.includes('module.exports = async') || 
                content.includes('exports.scrape')) {
                console.log(`⏭️  ${fileName}: Already has function export`);
                return 'skipped';
            }

            // Check for class export pattern
            const classExportMatch = content.match(/class\s+(\w+)\s*{[\s\S]*?scrape\s*\([^)]*\)\s*{/);
            if (!classExportMatch) {
                console.log(`⏭️  ${fileName}: No class export found`);
                return 'skipped';
            }

            const className = classExportMatch[1];
            
            // Create backup
            fs.writeFileSync(`${filePath}.export-backup`, content);

            // Add function export at end of file
            const functionExport = `\n\n// Function export for compatibility with runner/validator
module.exports = async (city) => {
  const scraper = new ${className}();
  return await scraper.scrape(city);
};

// Also export the class for backward compatibility
module.exports.${className} = ${className};
`;

            content += functionExport;
            fs.writeFileSync(filePath, content);

            console.log(`✅ ${fileName}: Converted class ${className} to function export`);
            return 'fixed';

        } catch (error) {
            console.log(`❌ ${fileName}: Error - ${error.message}`);
            return 'error';
        }
    }

    printSummary() {
        console.log('\n\n🎯 UNIVERSAL EXPORT FIX SUMMARY');
        console.log('=================================');
        console.log(`Total Files Processed: ${this.results.totalFiles}`);
        console.log(`✅ Total Fixed: ${this.results.totalFixed}`);

        console.log('\n📊 PER-CITY RESULTS:');
        Object.entries(this.results.cityResults).forEach(([city, results]) => {
            console.log(`   ${city}: ${results.fixed}/${results.total} fixed`);
        });

        console.log('\n🚀 NEXT STEPS:');
        console.log('1. Run universal fallback removal script');
        console.log('2. Run universal city tagging fix script');
        console.log('3. Re-validate all cities to measure improvement');
        console.log('\n💡 Backup files (.export-backup) created for safety');
    }
}

// Run the universal export fixer
if (require.main === module) {
    const fixer = new UniversalExportFixer();
    fixer.fixAllCities().catch(console.error);
}

module.exports = UniversalExportFixer;
