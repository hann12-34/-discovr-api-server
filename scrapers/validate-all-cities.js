const fs = require('fs');
const path = require('path');

class UniversalCityValidator {
    constructor() {
        this.cities = ['New York', 'Montreal', 'Calgary', 'vancouver', 'Toronto'];
        this.results = {
            totalCities: 0,
            totalScrapers: 0,
            totalPassed: 0,
            totalFailed: 0,
            cityResults: {}
        };
        
        this.fallbackPatterns = [
            /sample.*event/i,
            /fallback.*event/i,
            /dummy.*event/i,
            /placeholder.*event/i,
            /fake.*event/i,
            /test.*event/i,
            /mock.*event/i,
            /example.*event/i,
            /generateEvent.*stub/i,
            /\.\.\.Array\(\d+\)\.fill/i,
            /for.*\(let i = 0; i < \d+; i\+\+\)/,
            /title:\s*["'`]Sample/i,
            /title:\s*["'`]Test/i,
            /title:\s*["'`]Mock/i,
            /title:\s*["'`]Demo/i,
        ];
    }

    async validateAllCities() {
        console.log('🌎 UNIVERSAL CITY SCRAPER VALIDATION');
        console.log('=====================================');
        console.log('Applying proven Toronto methodology to ALL cities');
        console.log('');

        for (const city of this.cities) {
            await this.validateCity(city);
        }

        this.printOverallSummary();
    }

    async validateCity(city) {
        console.log(`\n🏙️  Validating ${city} scrapers...`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const cityDir = path.join('cities', city);
        if (!fs.existsSync(cityDir)) {
            console.log(`❌ City directory not found: ${cityDir}`);
            return;
        }

        const scraperFiles = fs.readdirSync(cityDir)
            .filter(file => file.endsWith('.js') && !file.includes('index'))
            .sort();

        const cityResults = {
            total: scraperFiles.length,
            passed: 0,
            failed: 0,
            issues: {
                exportStructure: 0,
                fallbackViolations: 0,
                cityTagging: 0,
                syntaxErrors: 0,
                timeouts: 0
            }
        };

        console.log(`Found ${scraperFiles.length} scrapers to validate\n`);

        for (const file of scraperFiles) {
            const result = await this.validateScraper(city, file);
            if (result.passed) {
                cityResults.passed++;
            } else {
                cityResults.failed++;
                result.issues.forEach(issue => {
                    if (issue.includes('scraper.scrape')) cityResults.issues.exportStructure++;
                    else if (issue.includes('Fallback')) cityResults.issues.fallbackViolations++;
                    else if (issue.includes('city')) cityResults.issues.cityTagging++;
                    else if (issue.includes('Unexpected token')) cityResults.issues.syntaxErrors++;
                    else if (issue.includes('timeout')) cityResults.issues.timeouts++;
                });
            }
        }

        this.results.totalCities++;
        this.results.totalScrapers += cityResults.total;
        this.results.totalPassed += cityResults.passed;
        this.results.totalFailed += cityResults.failed;
        this.results.cityResults[city] = cityResults;

        console.log(`\n📊 ${city} Results:`);
        console.log(`✅ Passed: ${cityResults.passed}`);
        console.log(`❌ Failed: ${cityResults.failed}`);
        console.log(`📈 Success Rate: ${((cityResults.passed / cityResults.total) * 100).toFixed(1)}%`);
        
        if (cityResults.failed > 0) {
            console.log(`\n🔍 ${city} Issue Breakdown:`);
            Object.entries(cityResults.issues).forEach(([issue, count]) => {
                if (count > 0) console.log(`   ${issue}: ${count}`);
            });
        }
    }

    async validateScraper(city, fileName) {
        const filePath = path.join('cities', city, fileName);
        
        try {
            const code = fs.readFileSync(filePath, 'utf8');
            const issues = [];

            // Check fallback violations
            const fallbackViolations = this.checkForFallbackViolations(code);
            if (fallbackViolations.length > 0) {
                issues.push(`Fallback violations: ${fallbackViolations.join(', ')}`);
            }

            // Check export structure
            if (!this.hasValidExport(code)) {
                issues.push('Export structure: No valid scraper export found');
            }

            // Check city tagging
            const cityViolations = this.checkCityTagging(code, city);
            if (cityViolations.length > 0) {
                issues.push(`City tagging: ${cityViolations.join(', ')}`);
            }

            const passed = issues.length === 0;
            
            if (passed) {
                console.log(`✅ ${fileName}`);
            } else {
                console.log(`❌ ${fileName}: ${issues.join(' | ')}`);
            }

            return { passed, issues };

        } catch (error) {
            console.log(`❌ ${fileName}: Syntax error - ${error.message}`);
            return { passed: false, issues: [`Syntax error: ${error.message}`] };
        }
    }

    checkForFallbackViolations(code) {
        const violations = [];
        for (const pattern of this.fallbackPatterns) {
            const matches = code.match(new RegExp(pattern.source, 'gi'));
            if (matches) {
                violations.push(matches[0].substring(0, 50));
            }
        }
        return violations;
    }

    hasValidExport(code) {
        // Check for direct function exports
        if (code.includes('module.exports = async') || 
            code.includes('module.exports = function') ||
            code.includes('exports.scrape')) {
            return true;
        }
        
        // Check for function reference exports (like module.exports = functionName;)
        const functionRefPattern = /module\.exports\s*=\s*[a-zA-Z][a-zA-Z0-9_]*\s*;/;
        if (functionRefPattern.test(code)) {
            return true;
        }
        
        // Check for class export with scrape method
        if (code.includes('module.exports =') && code.includes('.scrape')) {
            return true;
        }
        
        // Check for object exports with function properties
        if (code.includes('module.exports = {') && 
            (code.includes('scrape:') || code.includes('scrape :'))) {
            return true;
        }
        
        return false;
    }

    checkCityTagging(code, expectedCity) {
        const violations = [];
        
        // Check for hardcoded city values that don't match folder
        const hardcodedCities = ['New York', 'Toronto', 'Montreal', 'Calgary', 'Vancouver'];
        hardcodedCities.forEach(city => {
            if (city !== expectedCity && code.includes(`"${city}"`)) {
                violations.push(`Hardcoded ${city} in ${expectedCity} scraper`);
            }
        });

        // Check for getCityFromArgs usage (should use passed city parameter)
        if (code.includes('getCityFromArgs()')) {
            violations.push('Uses getCityFromArgs() instead of city parameter');
        }

        return violations;
    }

    printOverallSummary() {
        console.log('\n\n🎯 UNIVERSAL VALIDATION SUMMARY');
        console.log('===============================');
        console.log(`Total Cities: ${this.results.totalCities}`);
        console.log(`Total Scrapers: ${this.results.totalScrapers}`);
        console.log(`✅ Passed: ${this.results.totalPassed}`);
        console.log(`❌ Failed: ${this.results.totalFailed}`);
        console.log(`📈 Overall Success Rate: ${((this.results.totalPassed / this.results.totalScrapers) * 100).toFixed(1)}%`);

        console.log('\n📊 PER-CITY BREAKDOWN:');
        Object.entries(this.results.cityResults).forEach(([city, results]) => {
            const rate = ((results.passed / results.total) * 100).toFixed(1);
            console.log(`   ${city}: ${results.passed}/${results.total} (${rate}%)`);
        });

        console.log('\n🚀 NEXT STEPS:');
        console.log('1. Apply batch export fixes to cities with export structure issues');
        console.log('2. Run batch fallback removal on cities with fallback violations');  
        console.log('3. Apply batch city tagging fixes to enforce folder-based authority');
        console.log('4. Re-validate all cities until 100% success rate achieved');
    }
}

// Run validation
if (require.main === module) {
    const validator = new UniversalCityValidator();
    validator.validateAllCities().catch(console.error);
}

module.exports = UniversalCityValidator;
