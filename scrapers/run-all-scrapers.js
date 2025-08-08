const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const citiesDir = path.join(__dirname, 'cities');
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGODB_URI environment variable not set.');
  process.exit(1);
}

async function runAllScrapers() {
  console.log('🔄 Starting all scrapers...');
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB.');
    const db = client.db();
    const eventsCollection = db.collection('events');

    const cityFolders = fs.readdirSync(citiesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name !== 'vancouver_backup')
      .map(dirent => dirent.name);

    for (const city of cityFolders) {
      const cityDir = path.join(citiesDir, city);
      const scraperFiles = fs.readdirSync(cityDir)
        .filter(file => file.startsWith('scrape-') && file.endsWith('.js'));

      for (const file of scraperFiles) {
        const scraperPath = path.join(cityDir, file);
        try {
          const ScraperClass = require(scraperPath);
          if (typeof ScraperClass === 'function' && ScraperClass.prototype.scrape) {
            console.log(`\n▶️  Running scraper for [${city}]: ${file}`);
            const scraper = new ScraperClass(city);
            const events = await scraper.scrape();
            
            if (events && events.length > 0) {
              await eventsCollection.insertMany(events, { ordered: false });
              console.log(`✅ Inserted ${events.length} events from ${file}`);
            } else {
              console.log(`🟡 No events found by ${file}`);
            }
          } else {
            console.warn(`⚠️  ${file} is not a valid scraper class. Skipping.`);
          }
        } catch (error) {
          console.error(`❌ Error running scraper ${file} for [${city}]:`, error);
        }
      }
    }
  } catch (error) {
    console.error('❌ A critical error occurred:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed.');
  }

  console.log('\n\n🎉 All scrapers have finished running.');
}

runAllScrapers();
