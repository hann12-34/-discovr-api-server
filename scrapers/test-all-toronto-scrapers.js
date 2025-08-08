#!/usr/bin/env node

/**
 * Comprehensive Toronto Scraper Validation Script
 * Based on proven New York scraper methodology
 * 
 * Tests for:
 * 1. Module export structure (function/object exports)
 * 2. Fallback/sample code violations
 * 3. City tagging compliance
 * 4. Basic scraper execution
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
    maxEventsPerScraper: 10,
    timeoutMs: 30000,
    validateCityTagging: true,
    checkForFallbacks: true,
    requireRealEvents: true
};

class TorontoScraperValidator {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            failures: [],
            successes: []
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

    /**
     * Check for fallback/sample code violations
     */
    checkForFallbackViolations(code) {
        const violations = [];
        
        for (const pattern of this.fallbackPatterns) {
            const matches = code.match(new RegExp(pattern.source, 'gi'));
            if (matches) {
                violations.push(`Fallback pattern found: ${matches[0]}`);
            }
        }
        
        return violations;
    }

    /**
     * Record a failure with details
     */
    recordFailure(city, fileName, reason, details) {
        this.results.failed++;
        this.results.failures.push({
            city,
            fileName,
            reason,
            details: Array.isArray(details) ? details : [details]
        });
        console.log(`   ❌ ${reason}: ${Array.isArray(details) ? details.join(', ') : details}`);
    }

    /**
     * Record a success
     */
    recordSuccess(city, fileName, eventCount) {
        this.results.passed++;
        this.results.successes.push({
            city,
            fileName,
            eventCount
        });
        console.log(`   ✅ All tests passed (${eventCount} events)`);
    }

    /**
     * Test scraper execution with timeout
     */
    async testScraperExecution(scrapeFunction, city, fileName) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.recordFailure(city, fileName, 'Execution timeout', `Scraper took longer than ${TEST_CONFIG.timeoutMs}ms`);
                resolve(null);
            }, TEST_CONFIG.timeoutMs);

            Promise.resolve(scrapeFunction(city))
                .then(events => {
                    clearTimeout(timeoutId);
                    resolve(events || []);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    this.recordFailure(city, fileName, 'Execution failed', error.message);
                    resolve(null);
                });
        });
    }

    /**
     * Validate city tagging for events
     */
    validateCityTagging(events, expectedCity) {
        const violations = [];
        
        if (!Array.isArray(events)) return violations;
        
        events.forEach((event, index) => {
            // Check city field
            if (event.city && event.city !== expectedCity) {
                violations.push(`Event ${index}: city field is "${event.city}", expected "${expectedCity}"`);
            }
            
            // Check venue.name field (should match city for folder-based authority)
            if (event.venue && event.venue.name && event.venue.name !== expectedCity) {
                violations.push(`Event ${index}: venue.name is "${event.venue.name}", expected "${expectedCity}"`);
            }
            
            // Check venue.city field
            if (event.venue && event.venue.city && event.venue.city !== expectedCity) {
                violations.push(`Event ${index}: venue.city is "${event.venue.city}", expected "${expectedCity}"`);
            }
        });
        
        return violations;
    }

    /**
     * Test a single scraper
     */
    async testScraper(city, fileName, scraperPath) {
        console.log(`\n📄 Testing: ${fileName}`);
        console.log(`   ⚡ Executing scraper with city: ${city}`);

        try {
            // Test 1: Check for fallback/sample code violations
            const codeContent = fs.readFileSync(scraperPath, 'utf8');
            const fallbackViolations = this.checkForFallbackViolations(codeContent);
            
            if (fallbackViolations.length > 0) {
                this.recordFailure(city, fileName, 'Fallback violations found', fallbackViolations);
                return;
            }

            // Test 2: Load and validate scraper module
            delete require.cache[require.resolve(scraperPath)];
            const scraperModule = require(scraperPath);
            
            if (!scraperModule || (typeof scraperModule !== 'object' && typeof scraperModule !== 'function')) {
                this.recordFailure(city, fileName, 'Invalid module export', 'Module must export an object or function');
                return;
            }

            // Test 3: Check for scrape function
            let scrapeFunction = null;
            if (typeof scraperModule === 'function') {
                scrapeFunction = scraperModule;
            } else if (typeof scraperModule.scrape === 'function') {
                scrapeFunction = scraperModule.scrape;
            } else if (typeof scraperModule.scrapeEvents === 'function') {
                scrapeFunction = scraperModule.scrapeEvents;
            }

            if (!scrapeFunction) {
                this.recordFailure(city, fileName, 'No scrape function found', 'Scraper must export a scrape function');
                return;
            }

            // Test 4: Test scraper execution
            const testEvents = await this.testScraperExecution(scrapeFunction, city, fileName);
            
            if (testEvents === null) {
                return; // Error already recorded
            }

            console.log(`   ✅ Returned ${testEvents.length} events`);

            // Test 5: Validate city tagging
            if (TEST_CONFIG.validateCityTagging && Array.isArray(testEvents) && testEvents.length > 0) {
                const cityViolations = this.validateCityTagging(
                    testEvents.slice(0, TEST_CONFIG.maxEventsPerScraper), 
                    city
                );
                
                if (cityViolations.length > 0) {
                    this.recordFailure(city, fileName, 'City tagging violations', cityViolations);
                    return;
                }
            }

            // All tests passed!
            this.recordSuccess(city, fileName, testEvents.length);

        } catch (error) {
            this.recordFailure(city, fileName, 'Unexpected error', error.message);
        }
    }

    /**
     * Run comprehensive validation
     */
    async runValidation() {
        console.log(`🍁 COMPREHENSIVE TORONTO SCRAPER VALIDATION`);
        console.log(`=========================================`);
        console.log(`Testing city: Toronto`);
        console.log(`Config: ${JSON.stringify(TEST_CONFIG, null, 2)}`);
        console.log(`\n`);

        const city = 'Toronto';
        const cityDir = path.join(__dirname, 'cities', 'Toronto');
        
        if (!fs.existsSync(cityDir)) {
            console.error(`❌ City directory not found: ${cityDir}`);
            return;
        }

        // Get all scraper files
        const files = fs.readdirSync(cityDir)
            .filter(file => file.endsWith('.js'))
            .filter(file => !file.startsWith('test-'))
            .filter(file => !file.includes('template'))
            .filter(file => !file.includes('index'))
            .sort();

        console.log(`🏙️  Testing Toronto scrapers...`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Found ${files.length} scrapers to test`);

        // Test each scraper
        for (const fileName of files) {
            const scraperPath = path.join(cityDir, fileName);
            await this.testScraper(city, fileName, scraperPath);
        }

        // Print final summary
        this.printSummary();
    }

    /**
     * Print validation summary
     */
    printSummary() {
        console.log(`\n🎯 VALIDATION COMPLETE`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📊 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

        if (this.results.failed > 0) {
            console.log(`\n❌ FAILURES BY CATEGORY:`);
            
            const failuresByReason = {};
            this.results.failures.forEach(failure => {
                failuresByReason[failure.reason] = failuresByReason[failure.reason] || [];
                failuresByReason[failure.reason].push(failure.fileName);
            });

            Object.entries(failuresByReason).forEach(([reason, files]) => {
                console.log(`\n${reason} (${files.length} files):`);
                files.forEach(file => console.log(`  - ${file}`));
            });

            console.log(`\n⚠️  Some scrapers need attention before production use.`);
        } else {
            console.log(`\n🎉 ALL SCRAPERS PASSED VALIDATION!`);
        }
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new TorontoScraperValidator();
    validator.runValidation()
        .then(() => {
            process.exit(validator.results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('❌ Validation failed:', error);
            process.exit(1);
        });
}

module.exports = TorontoScraperValidator;
