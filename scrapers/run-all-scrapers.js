// Master script to run all venue scrapers
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const vancouverScrapers = require('./cities/vancouver');

// Add other city importers as we expand
// const torontoScrapers = require('./cities/toronto');
// const montrealScrapers = require('./cities/montreal');

console.log('🔄 Running all venue scrapers...');

async function runAllScrapers() {
  // Connect to MongoDB
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Import Event model
    const Event = require('../models/Event');

    // Store results for reporting
    const results = {
      totalScrapers: 0,
      completedScrapers: 0,
      failedScrapers: 0,
      newEvents: 0,
      skippedEvents: 0,
      errors: []
    };

    // Run all Vancouver scrapers
    console.log('\n🏙️ Running Vancouver scrapers...');
    results.totalScrapers += vancouverScrapers.scrapers.length;

    for (const scraper of vancouverScrapers.scrapers) {
      try {
        console.log(`\n⚙️ Running ${scraper.name} scraper...`);
        const events = await scraper.scrape();
        console.log(`✅ Found ${events.length} events for ${scraper.name}`);

        // Save to database, skipping duplicates
        const newEvents = [];
        const skippedEvents = [];

        for (const event of events) {
          const sourceURL = event.sourceURL || event.officialWebsite;
          
          // Skip if we have no URL to check duplicates against
          if (!sourceURL) continue;
          
          const existingEvent = await Event.findOne({ sourceURL });
          
          if (!existingEvent) {
            newEvents.push(event);
          } else {
            skippedEvents.push({
              title: event.title,
              id: existingEvent.id
            });
          }
        }

        if (newEvents.length > 0) {
          await Event.insertMany(newEvents);
          console.log(`✅ Saved ${newEvents.length} new events from ${scraper.name}`);
          results.newEvents += newEvents.length;
        } else {
          console.log(`ℹ️ No new events to save from ${scraper.name}`);
        }

        if (skippedEvents.length > 0) {
          console.log(`ℹ️ Skipped ${skippedEvents.length} existing events from ${scraper.name}`);
          results.skippedEvents += skippedEvents.length;
        }

        results.completedScrapers++;
      } catch (error) {
        console.error(`❌ Error running ${scraper.name} scraper:`, error);
        results.failedScrapers++;
        results.errors.push({
          scraper: scraper.name,
          error: error.message
        });
      }
    }

    // Run other city scrapers as we expand
    // Add Toronto/Montreal/etc. scrapers here following the same pattern

    // Print summary
    console.log('\n📊 SCRAPER SUMMARY');
    console.log('===================');
    console.log(`Total scrapers: ${results.totalScrapers}`);
    console.log(`Completed successfully: ${results.completedScrapers}`);
    console.log(`Failed: ${results.failedScrapers}`);
    console.log(`New events added: ${results.newEvents}`);
    console.log(`Skipped existing events: ${results.skippedEvents}`);

    if (results.errors.length > 0) {
      console.log('\n❌ ERRORS');
      console.log('==========');
      results.errors.forEach((err, i) => {
        console.log(`${i+1}. ${err.scraper}: ${err.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

runAllScrapers().catch(console.error);
