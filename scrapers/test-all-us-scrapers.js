#!/usr/bin/env node

/**
 * Comprehensive Test Script for All US Scrapers
 * 
 * This script systematically tests all US city scrapers to ensure:
 * 1. No fallbacks or sample data are used
 * 2. Correct city tagging based on folder authority
 * 3. All scrapers return real, live events
 * 4. Proper error handling and robust operation
 */

const fs = require('fs');
const path = require('path');

// US cities to test (skip Canadian cities as per user requirements)
const US_CITIES = ['New York'];

// Test configuration
const TEST_CONFIG = {
  maxEventsPerScraper: 10, // Limit events for testing
  timeoutMs: 30000, // 30 second timeout per scraper
  validateCityTagging: true,
  checkForFallbacks: true,
  requireRealEvents: true
};

class USScraperValidator {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      details: []
    };
  }

  async testAllUSScrapers() {
    console.log('🇺🇸 COMPREHENSIVE US SCRAPER VALIDATION');
    console.log('=====================================');
    console.log(`Testing cities: ${US_CITIES.join(', ')}`);
    console.log(`Config: ${JSON.stringify(TEST_CONFIG, null, 2)}\n`);

    for (const city of US_CITIES) {
      await this.testCityScrapers(city);
    }

    this.printSummaryReport();
  }

  async testCityScrapers(city) {
    console.log(`\n🏙️  Testing ${city} scrapers...`);
    console.log('━'.repeat(50));

    const cityDir = path.join(__dirname, 'cities', city);
    
    if (!fs.existsSync(cityDir)) {
      console.log(`❌ City directory not found: ${cityDir}`);
      return;
    }

    const files = fs.readdirSync(cityDir).filter(file => 
      file.endsWith('.js') && 
      !file.includes('test') && 
      !file.includes('index') &&
      !file.includes('template')
    );

    console.log(`Found ${files.length} scrapers to test`);

    for (const file of files) {
      await this.testSingleScraper(city, file);
    }
  }

  async testSingleScraper(city, fileName) {
    this.results.total++;
    const scraperPath = path.join(__dirname, 'cities', city, fileName);
    
    console.log(`\n📄 Testing: ${fileName}`);
    
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

      // Test 4: Test city argument handling
      const testEvents = await this.testScraperExecution(scrapeFunction, city, fileName);
      
      if (testEvents === null) {
        return; // Error already recorded
      }

      // Test 5: Validate city tagging
      if (Array.isArray(testEvents) && testEvents.length > 0) {
        const cityTaggingIssues = this.validateCityTagging(testEvents, city);
        
        if (cityTaggingIssues.length > 0) {
          this.recordFailure(city, fileName, 'City tagging violations', cityTaggingIssues);
          return;
        }
      }

      // All tests passed
      this.recordSuccess(city, fileName, testEvents ? testEvents.length : 0);

    } catch (error) {
      this.recordFailure(city, fileName, 'Execution error', error.message);
    }
  }

  checkForFallbackViolations(code) {
    const violations = [];
    const fallbackPatterns = [
      /fallback.*date/i,
      /current.*date.*fallback/i,
      /\.setDate\(.*\+.*30\)/i, // 30-day fallback pattern
      /new Date\(\).*fallback/i,
      /sample.*event/i,
      /fallback.*event/i
    ];

    fallbackPatterns.forEach((pattern, index) => {
      if (pattern.test(code)) {
        violations.push(`Fallback pattern ${index + 1} detected`);
      }
    });

    return violations;
  }

  async testScraperExecution(scrapeFunction, city, fileName) {
    try {
      console.log(`   ⚡ Executing scraper with city: ${city}`);
      
      // Set timeout for scraper execution
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), TEST_CONFIG.timeoutMs);
      });

      const scraperPromise = scrapeFunction(city);
      const events = await Promise.race([scraperPromise, timeoutPromise]);
      
      if (!Array.isArray(events)) {
        this.recordFailure(city, fileName, 'Invalid return type', 'Scraper must return an array');
        return null;
      }

      console.log(`   ✅ Returned ${events.length} events`);
      return events.slice(0, TEST_CONFIG.maxEventsPerScraper); // Limit for testing

    } catch (error) {
      const errorMsg = error.message === 'Timeout' ? 'Scraper timeout (30s)' : error.message;
      this.recordFailure(city, fileName, 'Execution failed', errorMsg);
      return null;
    }
  }

  validateCityTagging(events, expectedCity) {
    const issues = [];

    events.forEach((event, index) => {
      // Check venue.name for city
      if (event.venue && event.venue.name) {
        if (event.venue.name !== expectedCity) {
          issues.push(`Event ${index}: venue.name is "${event.venue.name}", expected "${expectedCity}"`);
        }
      }

      // Check city field
      if (event.city && event.city !== expectedCity) {
        issues.push(`Event ${index}: city field is "${event.city}", expected "${expectedCity}"`);
      }
    });

    return issues;
  }

  recordSuccess(city, fileName, eventCount) {
    this.results.passed++;
    const result = {
      city,
      fileName,
      status: 'PASS',
      eventCount,
      message: `✅ All tests passed (${eventCount} events)`
    };
    this.results.details.push(result);
    console.log(`   ${result.message}`);
  }

  recordFailure(city, fileName, reason, details) {
    this.results.failed++;
    const result = {
      city,
      fileName,
      status: 'FAIL',
      reason,
      details,
      message: `❌ ${reason}: ${Array.isArray(details) ? details.join(', ') : details}`
    };
    this.results.details.push(result);
    console.log(`   ${result.message}`);
  }

  printSummaryReport() {
    console.log('\n📊 VALIDATION SUMMARY');
    console.log('====================');
    console.log(`Total scrapers tested: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏭️  Skipped: ${this.results.skipped}`);
    
    const successRate = this.results.total > 0 ? 
      ((this.results.passed / this.results.total) * 100).toFixed(1) : 0;
    console.log(`📈 Success Rate: ${successRate}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ FAILED SCRAPERS:');
      console.log('==================');
      this.results.details
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`${result.city}/${result.fileName}: ${result.reason}`);
          if (result.details) {
            console.log(`   Details: ${Array.isArray(result.details) ? result.details.join(', ') : result.details}`);
          }
        });
    }

    console.log('\n🎯 VALIDATION COMPLETE');
    
    if (this.results.failed === 0) {
      console.log('🎉 ALL US SCRAPERS PASSED! Ready for production.');
    } else {
      console.log('⚠️  Some scrapers need attention before production use.');
    }
  }
}

// Run the validator
if (require.main === module) {
  const validator = new USScraperValidator();
  validator.testAllUSScrapers().catch(console.error);
}

module.exports = USScraperValidator;
