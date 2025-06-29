/**
 * Main script to run all registered scrapers.
 * This script correctly initializes the ScraperCoordinator and runs all scrapers.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const scraperSystem = require('./scrapers');
const Event = require('./models/Event'); // Make sure this path is correct

async function run() {
  try {
    console.log("Starting Discovr API scraper system...");

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in your .env file.');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB for scraper run.');

        await scraperSystem.init({ eventModel: Event });

    console.log(`▶️ Running ${scraperSystem.scrapers.length} registered scrapers...`);
    
    // The runScrapers method will now handle its own logging.
    await scraperSystem.runScrapers({ preserveExisting: true });

    console.log("\n✅ Scraper run finished successfully.");

  } catch (error) {
    console.error("❌ An error occurred during the scraper run:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

run();
