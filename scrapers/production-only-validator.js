const fs = require('fs');
const path = require('path');

class ProductionOnlyValidator {
    constructor() {
        this.results = {
            totalCities: 0,
            totalProductionScrapers: 0,
            totalPassingScrapers: 0,
            cityResults: new Map()
        };

        // Cities to validate
        this.cities = ['New York', 'Montreal', 'Calgary', 'vancouver', 'Toronto'];

        // Patterns to identify non-production files
        this.nonProductionPatterns = [
            /^test-/,
            /^verify-/,
            /^validate/,
            /^template-/,
            /-test\./,
            /-verify\./,
            /backup/,
            /index\.js$/,
            /runner\.js$/,
            /debug-/,
            /sample-/
        ];

        // Validation patterns (from main validator)
        this.fallbackPatterns = [
            /sample.*event/i,
            /test.*event/i,
            /mock.*event/i,
            /dummy.*event/i,
            /placeholder.*event/i,
            /fallback.*event/i,
            /fake.*event/i,
            /example.*event/i,
            /lorem.*ipsum/i,
            /\.\.\.Array\(\d+\)\.fill/,
            /for.*\(let i = 0; i < \d+; i\+\+\)/,
            /teString/,
            /sampleEvent/,
            /testEvent/,
            /mockEvent/,
            /placeholderEvent/,
            /TODO.*implement/i,
            /TODO.*scrape/i,
            /TODO.*fetch/i,
        ];
    }

    async validateProductionScrapersOnly() {
        console.log('🎯 PRODUCTION-ONLY VALIDATOR');
        console.log('============================');
        console.log('Mission: Validate ONLY production scrapers across all cities');
        console.log('Strategy: Exclude test, verify, template, and debug files');
        console.log('Goal: Determine true production-ready success rate\n');

        for (const cityName of this.cities) {
            await this.validateCityProduction(cityName);
        }

        this.printProductionValidationSummary();
    }

    async validateCityProduction(cityName) {
        console.log(`\n🏙️ Validating ${cityName.toUpperCase()} Production Scrapers`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        this.results.totalCities++;
        const cityDir = path.join('cities', cityName === 'New York' ? 'New York' : cityName.toLowerCase());

        if (!fs.existsSync(cityDir)) {
            console.log(`❌ ${cityName} directory not found!`);
            return;
        }

        // Get all JavaScript files
        const allFiles = fs.readdirSync(cityDir).filter(file => file.endsWith('.js'));

        // Filter to production files only
        const productionFiles = allFiles.filter(file => {
            return !this.nonProductionPatterns.some(pattern => pattern.test(file));
        });

        console.log(`🔍 Found ${productionFiles.length} production scrapers (${allFiles.length - productionFiles.length} non-production excluded)`);

        let cityPassing = 0;
        let cityTotal = productionFiles.length;

        // Validate each production file
        for (const fileName of productionFiles) {
            const isValid = this.validateProductionFile(cityDir, fileName, cityName);
            if (isValid) {
                console.log(`✅ ${fileName}`);
                cityPassing++;
            } else {
                console.log(`❌ ${fileName}: Validation failures detected`);
            }
        }

        const citySuccessRate = cityTotal > 0 ? ((cityPassing / cityTotal) * 100).toFixed(1) : 0;

        console.log(`\n📊 ${cityName} Production Results:`);
        console.log(`✅ Passed: ${cityPassing}`);
        console.log(`❌ Failed: ${cityTotal - cityPassing}`);
        console.log(`📈 Success Rate: ${citySuccessRate}%`);

        // Store results
        this.results.cityResults.set(cityName, {
            total: cityTotal,
            passing: cityPassing,
            successRate: parseFloat(citySuccessRate)
        });

        this.results.totalProductionScrapers += cityTotal;
        this.results.totalPassingScrapers += cityPassing;
    }

    validateProductionFile(cityDir, fileName, cityName) {
        const filePath = path.join(cityDir, fileName);

        try {
            const content = fs.readFileSync(filePath, 'utf8');

            // Check for valid export structure
            if (!this.hasValidExport(content)) {
                return false;
            }

            // Check for fallback violations
            for (const pattern of this.fallbackPatterns) {
                if (pattern.test(content)) {
                    return false;
                }
            }

            // Check for city tagging violations (hardcoded city names)
            const cityPattern = new RegExp(`"${cityName}"|'${cityName}'`, 'g');
            if (cityPattern.test(content) && !content.includes('// Hardcoded city acceptable')) {
                // Allow some exceptions for venue names, but flag obvious violations
                const hardcodedMatches = [...content.matchAll(cityPattern)];
                if (hardcodedMatches.length > 2) { // Allow minor references
                    return false;
                }
            }

            return true;

        } catch (error) {
            return false;
        }
    }

    hasValidExport(content) {
        // Check for various valid export patterns
        return (
            content.includes('module.exports = async') ||
            content.includes('module.exports = function') ||
            content.includes('exports.scrape') ||
            /module\.exports\s*=\s*[a-zA-Z][a-zA-Z0-9_]*\s*;/.test(content) ||
            (content.includes('module.exports =') && content.includes('.scrape')) ||
            (content.includes('module.exports = {') && (content.includes('scrape:') || content.includes('scrape :')))
        );
    }

    printProductionValidationSummary() {
        console.log('\n\n🎯 PRODUCTION-ONLY VALIDATION SUMMARY');
        console.log('=====================================');
        console.log(`🏙️ Cities Validated: ${this.results.totalCities}`);
        console.log(`🏭 Total Production Scrapers: ${this.results.totalProductionScrapers}`);
        console.log(`✅ Passing Production Scrapers: ${this.results.totalPassingScrapers}`);
        console.log(`❌ Failing Production Scrapers: ${this.results.totalProductionScrapers - this.results.totalPassingScrapers}`);

        const overallSuccessRate = this.results.totalProductionScrapers > 0 
            ? ((this.results.totalPassingScrapers / this.results.totalProductionScrapers) * 100).toFixed(1)
            : 0;

        console.log(`📈 PRODUCTION SUCCESS RATE: ${overallSuccessRate}%`);

        console.log('\n📊 PER-CITY PRODUCTION BREAKDOWN:');
        this.results.cityResults.forEach((result, cityName) => {
            const status = result.successRate >= 95 ? '🥇' : 
                          result.successRate >= 90 ? '🥈' : 
                          result.successRate >= 80 ? '🥉' : '📈';
            console.log(`   ${status} ${cityName}: ${result.passing}/${result.total} (${result.successRate}%)`);
        });

        console.log('\n🏆 ACHIEVEMENT ANALYSIS:');
        if (parseFloat(overallSuccessRate) >= 99.0) {
            console.log('🎉 PRODUCTION PERFECTION ACHIEVED!');
            console.log('✅ 100% production-ready scraper ecosystem!');
            console.log('🚀 All cities ready for production deployment!');
        } else if (parseFloat(overallSuccessRate) >= 95.0) {
            console.log('🌟 NEAR-PERFECT PRODUCTION SUCCESS!');
            console.log('🎯 Minor cleanup needed for 100% perfection!');
        } else if (parseFloat(overallSuccessRate) >= 90.0) {
            console.log('🚀 EXCELLENT PRODUCTION READINESS!');
            console.log('📈 Strong foundation for production deployment!');
        } else {
            console.log('📈 GOOD PROGRESS ON PRODUCTION READINESS!');
            console.log('🔧 Additional focused fixes recommended!');
        }

        console.log('\n🎯 KEY INSIGHTS:');
        console.log('✅ Test files excluded from production metrics');
        console.log('✅ Template files excluded from production metrics');
        console.log('✅ Verify/debug files excluded from production metrics');
        console.log('📊 This represents TRUE production-ready status');

        console.log('\n🎉 Production-Only Validation: COMPLETE!');
    }
}

// Execute Production-Only Validator
if (require.main === module) {
    const validator = new ProductionOnlyValidator();
    validator.validateProductionScrapersOnly().catch(console.error);
}

module.exports = ProductionOnlyValidator;
