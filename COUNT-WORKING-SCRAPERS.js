#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CITIES = ['Calgary', 'Montreal', 'New York', 'Toronto', 'vancouver'];

async function countWorking() {
  for (const city of CITIES) {
    const cityDir = path.join(__dirname, 'scrapers', 'cities', city);
    if (!fs.existsSync(cityDir)) continue;

    const files = fs.readdirSync(cityDir)
      .filter(f => f.endsWith('.js') && !f.endsWith('.bak') && 
                   !f.includes('test') && !f.includes('index'));

    let working = 0;
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

        if (events && events.length > 0) {
          working++;
        }
      } catch (error) {
        // Silent
      }
    }

    const coverage = Math.round((working / files.length) * 100);
    console.log(`${city}: ${working}/${files.length} working (${coverage}%)`);
  }
}

countWorking().then(() => process.exit(0));
