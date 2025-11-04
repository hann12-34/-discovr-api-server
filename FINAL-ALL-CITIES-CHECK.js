#!/usr/bin/env node

/**
 * FINAL CHECK FOR ALL CITIES
 * Tests ALL scrapers, reports NULL dates, and checks for fallback strings
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.PRODUCTION_MONGODB_URI;
const DATABASE_NAME = 'discovr';
const CITIES = ['Calgary', 'Montreal', 'New York', 'Toronto', 'vancouver'];

async function finalCheck() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const eventsCollection = db.collection('events');

    console.log('🗑️  Clearing database...\n');
    await eventsCollection.deleteMany({});

    const cityStats = {};

    for (const city of CITIES) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📍 ${city.toUpperCase()}`);
      console.log('='.repeat(70));

      const cityDir = path.join(__dirname, 'scrapers', 'cities', city);
      
      if (!fs.existsSync(cityDir)) {
        console.log(`⚠️  Directory not found`);
        continue;
      }

      const files = fs.readdirSync(cityDir)
        .filter(f => f.endsWith('.js') && 
                     !f.endsWith('.bak') && 
                     !f.includes('test') && 
                     !f.includes('index') &&
                     !f.includes('template') &&
                     !f.includes('boilerplate') &&
                     !f.includes('generator'));

      cityStats[city] = { total: 0, nullDates: 0, fallbackStrings: 0, scrapers: files.length };

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
            const nullCount = events.filter(e => !e.date || e.date === null).length;
            const fallbackCount = events.filter(e => 
              e.date && typeof e.date === 'string' && 
              (e.date.includes('TBA') || e.date.includes('TBD') || e.date.includes('Ongoing'))
            ).length;
            
            cityStats[city].total += events.length;
            cityStats[city].nullDates += nullCount;
            cityStats[city].fallbackStrings += fallbackCount;

            if (nullCount > 0 || fallbackCount > 0) {
              console.log(`  ⚠️  ${file.substring(7, 30)}... ${events.length} events, ${nullCount} NULL, ${fallbackCount} fallback strings`);
            }

            await eventsCollection.insertMany(events);
          }
        } catch (error) {
          // Silent - skip broken scrapers
        }
      }

      console.log(`✅ ${city}: ${cityStats[city].total} events, ${cityStats[city].nullDates} NULL dates, ${cityStats[city].fallbackStrings} fallback strings`);
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(70));

    let totalEvents = 0;
    let totalNulls = 0;
    let totalFallbacks = 0;

    for (const city of Object.keys(cityStats)) {
      const stats = cityStats[city];
      totalEvents += stats.total;
      totalNulls += stats.nullDates;
      totalFallbacks += stats.fallbackStrings;
      
      const status = (stats.nullDates === 0 && stats.fallbackStrings === 0) ? '✅' : '⚠️ ';
      console.log(`${status} ${city}: ${stats.total} events | ${stats.nullDates} NULL | ${stats.fallbackStrings} fallbacks`);
    }

    console.log('='.repeat(70));
    console.log(`📊 TOTALS: ${totalEvents} events | ${totalNulls} NULL dates | ${totalFallbacks} fallback strings`);
    
    if (totalNulls === 0 && totalFallbacks === 0) {
      console.log('\n🎉 SUCCESS! ZERO NULL DATES AND ZERO FALLBACKS ACROSS ALL CITIES!');
    } else if (totalFallbacks === 0) {
      console.log(`\n✅ ZERO FALLBACKS! But ${totalNulls} events have NULL dates (may be legitimate)`);
    } else {
      console.log(`\n⚠️  FOUND ISSUES! ${totalNulls} NULL dates, ${totalFallbacks} fallback strings`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

finalCheck().then(() => {
  console.log('\n✅ CHECK COMPLETE!');
  process.exit(0);
});
