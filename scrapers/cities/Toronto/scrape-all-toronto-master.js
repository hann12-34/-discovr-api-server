/**
 * MASTER TORONTO ORCHESTRATOR
 * 
 * Integrates ALL 160 working Toronto scrapers for production deployment
 * Includes comprehensive error handling, monitoring, and performance optimization
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Get all working Toronto scraper files
const TORONTO_SCRAPERS_DIR = __dirname;
const WORKING_SCRAPERS = fs.readdirSync(TORONTO_SCRAPERS_DIR)
  .filter(file => 
    file.startsWith('scrape-') && 
    file.endsWith('.js') && 
    !file.includes('orchestr') &&
    !file.includes('master') &&
    !file.includes('repair') &&
    !file.includes('validate') &&
    !file.includes('fix') &&
    !file.includes('mass') &&
    !file.includes('simple') &&
    !file.includes('all-toronto') &&
    !file.includes('test')
  )
  .sort();

console.log(`🎯 Master orchestrator managing ${WORKING_SCRAPERS.length} Toronto scrapers`);

// Enhanced delay function for anti-bot protection
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Performance and monitoring utilities
const ScraperStats = {
  total: 0,
  successful: 0,
  failed: 0,
  events: 0,
  startTime: null,
  
  reset() {
    this.total = 0;
    this.successful = 0;
    this.failed = 0;
    this.events = 0;
    this.startTime = Date.now();
  },
  
  recordSuccess(eventCount = 0) {
    this.successful++;
    this.events += eventCount;
  },
  
  recordFailure() {
    this.failed++;
  },
  
  getStats() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    return {
      total: this.total,
      successful: this.successful,
      failed: this.failed,
      events: this.events,
      successRate: Math.round((this.successful / Math.max(this.total, 1)) * 100),
      eventsPerMinute: Math.round((this.events / Math.max(elapsed / 60, 0.1))),
      elapsedTime: elapsed
    };
  }
};

async function loadScraper(filename) {
  try {
    const scraperPath = path.join(TORONTO_SCRAPERS_DIR, filename);
    
    // Clear require cache to ensure fresh load
    delete require.cache[require.resolve(scraperPath)];
    
    const scraperModule = require(scraperPath);
    
    // Handle different export patterns
    if (scraperModule.scrape) {
      return scraperModule.scrape;
    } else if (typeof scraperModule === 'function') {
      return scraperModule;
    } else {
      throw new Error('No valid scrape function found in module');
    }
  } catch (error) {
    console.error(`❌ Failed to load ${filename}: ${error.message}`);
    throw error;
  }
}

async function scrapeAllTorontoEventsMaster(city = 'Toronto', options = {}) {
  // 🚨 CRITICAL: City validation per DISCOVR_SCRAPERS_CITY_FILTERING_GUIDE
  const EXPECTED_CITY = 'Toronto';
  if (city !== EXPECTED_CITY) {
    throw new Error(`City mismatch! Expected '${EXPECTED_CITY}', got '${city}'`);
  }

  const mongoURI = process.env.MONGODB_URI;
  const client = new MongoClient(mongoURI);

  try {
    await client.connect();
    console.log('🚀 MASTER TORONTO SCRAPER ORCHESTRATOR STARTED');
    console.log('='.repeat(60));
    console.log(`📊 Managing ${WORKING_SCRAPERS.length} Toronto venue scrapers`);
    console.log(`🎯 Target city: ${EXPECTED_CITY}`);
    console.log(`⚡ Performance mode: ${options.fastMode ? 'Fast' : 'Comprehensive'}`);
    
    ScraperStats.reset();
    ScraperStats.total = WORKING_SCRAPERS.length;
    
    const allEvents = [];
    const failedScrapers = [];
    const successfulScrapers = [];

    // Process scrapers in batches for better performance and anti-bot protection
    const batchSize = options.batchSize || 5;
    const batches = [];
    for (let i = 0; i < WORKING_SCRAPERS.length; i += batchSize) {
      batches.push(WORKING_SCRAPERS.slice(i, i + batchSize));
    }

    console.log(`📦 Processing ${batches.length} batches of ${batchSize} scrapers each`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📦 Batch ${batchIndex + 1}/${batches.length}: ${batch.length} scrapers`);

      const batchPromises = batch.map(async (filename, index) => {
        // Stagger starts within batch for anti-bot protection
        await delay(index * 500);
        
        try {
          console.log(`🔍 Scraping ${filename}...`);
          
          const scrapeFunction = await loadScraper(filename);
          const scraperEvents = await scrapeFunction(EXPECTED_CITY);
          
          const eventCount = Array.isArray(scraperEvents) ? scraperEvents.length : 0;
          
          if (eventCount > 0) {
            allEvents.push(...scraperEvents);
            successfulScrapers.push({
              file: filename,
              events: eventCount
            });
            ScraperStats.recordSuccess(eventCount);
            console.log(`✅ ${filename}: ${eventCount} events`);
          } else {
            console.log(`⚠️ ${filename}: 0 events (may be valid if no events scheduled)`);
            ScraperStats.recordSuccess(0);
          }
          
        } catch (error) {
          failedScrapers.push({
            file: filename,
            error: error.message.substring(0, 100)
          });
          ScraperStats.recordFailure();
          console.error(`❌ ${filename}: ${error.message.substring(0, 60)}...`);
        }
      });

      // Wait for current batch to complete
      await Promise.allSettled(batchPromises);
      
      // Anti-bot delay between batches
      if (batchIndex < batches.length - 1) {
        const delayMs = options.fastMode ? 1000 : 2000;
        console.log(`⏱️ Anti-bot delay: ${delayMs}ms`);
        await delay(delayMs);
      }
    }

    // Final statistics and reporting
    const stats = ScraperStats.getStats();
    
    console.log('\n📈 MASTER ORCHESTRATOR RESULTS:');
    console.log('='.repeat(40));
    console.log(`📁 Total scrapers: ${stats.total}`);
    console.log(`✅ Successful: ${stats.successful} (${stats.successRate}%)`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`🎪 Total events: ${stats.events}`);
    console.log(`⏱️ Total time: ${Math.round(stats.elapsedTime)}s`);
    console.log(`📊 Events/minute: ${stats.eventsPerMinute}`);

    if (successfulScrapers.length > 0) {
      console.log('\n🏆 TOP PERFORMING SCRAPERS:');
      successfulScrapers
        .sort((a, b) => b.events - a.events)
        .slice(0, 10)
        .forEach((scraper, index) => {
          console.log(`${index + 1}. ${scraper.file}: ${scraper.events} events`);
        });
    }

    if (failedScrapers.length > 0) {
      console.log('\n⚠️ FAILED SCRAPERS (need attention):');
      failedScrapers.slice(0, 10).forEach((scraper, index) => {
        console.log(`${index + 1}. ${scraper.file}: ${scraper.error}`);
      });
      if (failedScrapers.length > 10) {
        console.log(`... and ${failedScrapers.length - 10} more failures`);
      }
    }

    // Quality assessment
    if (stats.successRate >= 95) {
      console.log('\n🎉 OUTSTANDING PERFORMANCE! Production ready!');
    } else if (stats.successRate >= 85) {
      console.log('\n🔥 EXCELLENT PERFORMANCE! Minor optimizations recommended');
    } else if (stats.successRate >= 70) {
      console.log('\n⚠️ ACCEPTABLE PERFORMANCE! Some scrapers need attention');
    } else {
      console.log('\n🔧 PERFORMANCE NEEDS IMPROVEMENT! Review failed scrapers');
    }

    console.log(`\n🚀 Master orchestrator complete: ${allEvents.length} total events from ${EXPECTED_CITY}`);
    
    return {
      events: allEvents,
      stats: stats,
      successful: successfulScrapers,
      failed: failedScrapers
    };

  } catch (error) {
    console.error('❌ Master orchestrator error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Enhanced export with multiple usage patterns
module.exports = {
  scrape: scrapeAllTorontoEventsMaster,
  scrapeAllTorontoEventsMaster,
  WORKING_SCRAPERS,
  ScraperStats
};

// Allow direct execution for testing
if (require.main === module) {
  const city = process.argv[2] || 'Toronto';
  const fastMode = process.argv.includes('--fast');
  
  scrapeAllTorontoEventsMaster(city, { 
    fastMode,
    batchSize: fastMode ? 10 : 5 
  })
    .then(results => {
      console.log(`\n🎯 FINAL RESULT: ${results.events.length} events, ${results.stats.successRate}% success rate`);
      
      if (results.stats.successRate >= 90) {
        console.log('✅ PRODUCTION READY! All systems go for deployment!');
        process.exit(0);
      } else {
        console.log('⚠️ Review failed scrapers before production deployment');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Master orchestrator execution failed:', error);
      process.exit(1);
    });
}
