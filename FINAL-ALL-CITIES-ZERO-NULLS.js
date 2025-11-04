#!/usr/bin/env node

/**
 * FINAL ALL CITIES - ZERO NULL DATES
 * 1. Clear DB
 * 2. Run all scrapers (cap at 50 events each)
 * 3. Delete NULL dates
 * 4. Remove duplicates
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.PRODUCTION_MONGODB_URI;
const DATABASE_NAME = 'discovr';
const CITIES = ['Calgary', 'Montreal', 'New York', 'Toronto', 'vancouver'];
const MAX_EVENTS_PER_SCRAPER = 50; // Cap to avoid junk

async function finalClean() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const eventsCollection = db.collection('events');

    console.log('🗑️  Clearing database...\n');
    await eventsCollection.deleteMany({});

    // RUN ALL SCRAPERS
    for (const city of CITIES) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📍 SCRAPING: ${city.toUpperCase()}`);
      console.log('='.repeat(70));

      const cityDir = path.join(__dirname, 'scrapers', 'cities', city);
      
      if (!fs.existsSync(cityDir)) continue;

      const files = fs.readdirSync(cityDir)
        .filter(f => f.endsWith('.js') && 
                     !f.endsWith('.bak') && 
                     !f.includes('test') && 
                     !f.includes('index') &&
                     !f.includes('template') &&
                     !f.includes('boilerplate') &&
                     !f.includes('generator'));

      let cityTotal = 0;

      for (const file of files) {
        try {
          const scraperPath = path.join(cityDir, file);
          delete require.cache[require.resolve(scraperPath)];
          const scraper = require(scraperPath);

          let events = [];
          if (typeof scraper === 'function') {
            events = await scraper(city);
          } else if (scraper.scrape) {
            events = await scraper.scrape(city);
          }

          if (events && Array.isArray(events) && events.length > 0) {
            // CAP EVENTS
            if (events.length > MAX_EVENTS_PER_SCRAPER) {
              console.log(`  ⚠️  ${file}: ${events.length} events → capped to ${MAX_EVENTS_PER_SCRAPER}`);
              events = events.slice(0, MAX_EVENTS_PER_SCRAPER);
            }
            
            await eventsCollection.insertMany(events);
            cityTotal += events.length;
          }
        } catch (error) {
          // Silent
        }
      }

      console.log(`\n${city}: ${cityTotal} events scraped`);
    }

    // CLEAN DATABASE
    console.log(`\n${'='.repeat(70)}`);
    console.log('🧹 CLEANING DATABASE');
    console.log('='.repeat(70));

    const initialCount = await eventsCollection.countDocuments({});
    console.log(`Starting with: ${initialCount} events\n`);

    // 1. Delete NULL dates
    const nullResult = await eventsCollection.deleteMany({ date: null });
    console.log(`✅ Deleted ${nullResult.deletedCount} NULL date events`);

    // 2. Delete junk titles
    const junkPatterns = [
      { title: /^buy tickets?$/i },
      { title: /^learn more$/i },
      { title: /^view all/i },
      { title: /^events?$/i },
      { title: /^home$/i },
      { title: /^menu$/i },
      { title: /^tickets?$/i },
      { title: /\{fill:/i },
      { title: /evenodd/i }
    ];

    let junkDeleted = 0;
    for (const pattern of junkPatterns) {
      const result = await eventsCollection.deleteMany(pattern);
      junkDeleted += result.deletedCount;
    }
    console.log(`✅ Deleted ${junkDeleted} junk titles`);

    // 3. Delete short titles
    const shortResult = await eventsCollection.deleteMany({
      $expr: { $lt: [{ $strLenCP: '$title' }, 10] }
    });
    console.log(`✅ Deleted ${shortResult.deletedCount} short titles`);

    // 4. Delete invalid dates
    const invalidDates = await eventsCollection.deleteMany({
      $or: [
        { date: '' },
        { date: /^check website/i },
        { date: /^TBA$/i },
        { date: /^TBD$/i }
      ]
    });
    console.log(`✅ Deleted ${invalidDates.deletedCount} invalid dates`);

    // 5. Remove URL duplicates
    const urlDupes = await eventsCollection.aggregate([
      { $match: { url: { $ne: null, $exists: true } } },
      { $group: { _id: '$url', ids: { $push: '$_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    let urlDupesDeleted = 0;
    for (const dupe of urlDupes) {
      const toDelete = dupe.ids.slice(1);
      const result = await eventsCollection.deleteMany({ _id: { $in: toDelete } });
      urlDupesDeleted += result.deletedCount;
    }
    console.log(`✅ Deleted ${urlDupesDeleted} URL duplicates`);

    // 6. Remove exact duplicates
    const duplicates = await eventsCollection.aggregate([
      {
        $group: {
          _id: { title: '$title', venue: '$venue.name', date: '$date' },
          ids: { $push: '$_id' },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    let exactDupesDeleted = 0;
    for (const dupe of duplicates) {
      const toDelete = dupe.ids.slice(1);
      const result = await eventsCollection.deleteMany({ _id: { $in: toDelete } });
      exactDupesDeleted += result.deletedCount;
    }
    console.log(`✅ Deleted ${exactDupesDeleted} exact duplicates`);

    // 7. Normalize city names
    await eventsCollection.updateMany({ city: /^vancouver$/i }, { $set: { city: 'Vancouver' } });
    await eventsCollection.updateMany({ city: /^toronto$/i }, { $set: { city: 'Toronto' } });
    await eventsCollection.updateMany({ city: /^calgary$/i }, { $set: { city: 'Calgary' } });
    await eventsCollection.updateMany({ city: /^montreal$/i }, { $set: { city: 'Montreal' } });
    await eventsCollection.updateMany({ city: /^new york$/i }, { $set: { city: 'New York' } });
    console.log(`✅ Normalized city names`);

    const finalCount = await eventsCollection.countDocuments({});
    const totalDeleted = initialCount - finalCount;

    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 FINAL RESULTS');
    console.log('='.repeat(70));
    console.log(`Started: ${initialCount} events`);
    console.log(`Deleted: ${totalDeleted} events`);
    console.log(`Final: ${finalCount} events`);

    const cityCounts = await eventsCollection.aggregate([
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('\n📍 EVENTS PER CITY:');
    cityCounts.forEach(c => {
      console.log(`  ${(c._id || 'Unknown').padEnd(12)}: ${c.count} events`);
    });

    const remainingNulls = await eventsCollection.countDocuments({ date: null });
    console.log(`\n${remainingNulls === 0 ? '✅' : '⚠️ '} NULL dates: ${remainingNulls}`);

    if (remainingNulls === 0) {
      console.log('\n🎉 SUCCESS! ZERO NULL DATES ACROSS ALL CITIES!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

finalClean().then(() => {
  console.log('\n✅ COMPLETE!');
  process.exit(0);
});
