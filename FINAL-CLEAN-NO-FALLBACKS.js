#!/usr/bin/env node

/**
 * FINAL CLEAN - NO FALLBACKS
 * Clear database, re-run scrapers, check for NULL dates
 * NULL dates are acceptable - we NEVER use fallbacks
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.PRODUCTION_MONGODB_URI;
const DATABASE_NAME = 'discovr';
const SCRAPERS_DIR = path.join(__dirname, 'scrapers', 'cities', 'vancouver');

async function finalClean() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const eventsCollection = db.collection('events');

    console.log('🗑️  Clearing database...');
    await eventsCollection.deleteMany({});

    console.log('📋 Running all scrapers...');
    const scraperFiles = fs.readdirSync(SCRAPERS_DIR)
      .filter(file => file.endsWith('.js') && !file.endsWith('.bak'));

    let totalEvents = 0;
    for (const file of scraperFiles) {
      try {
        const scraperPath = path.join(SCRAPERS_DIR, file);
        delete require.cache[require.resolve(scraperPath)];
        const scraper = require(scraperPath);

        let events = [];
        if (typeof scraper === 'function') {
          events = await scraper('Vancouver');
        } else if (scraper.scrape) {
          events = await scraper.scrape('Vancouver');
        }

        if (events && Array.isArray(events) && events.length > 0) {
          await eventsCollection.insertMany(events);
          totalEvents += events.length;
        }
      } catch (error) {
        // Silent
      }
    }

    const nullDateCount = await eventsCollection.countDocuments({ date: null });
    const validDateCount = await eventsCollection.countDocuments({ date: { $ne: null } });

    console.log('\\n' + '='.repeat(70));
    console.log('📊 FINAL RESULTS');
    console.log('='.repeat(70));
    console.log(`✅ Total events: ${totalEvents}`);
    console.log(`✅ Events with valid dates: ${validDateCount}`);
    console.log(`⚠️  Events with NULL dates: ${nullDateCount}`);
    console.log('\\n💡 NULL dates are OK - we NEVER use fallbacks!');
    console.log('   Apps should display these as "Date TBD" or filter them out.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

finalClean().then(() => process.exit(0));
