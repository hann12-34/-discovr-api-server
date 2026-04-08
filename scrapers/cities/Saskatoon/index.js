const fs = require('fs');
const path = require('path');

async function scrapeSaskatoonCityEvents() {
  const allEvents = [];
  const files = fs.readdirSync(__dirname).filter(f => f !== 'index.js' && f.endsWith('.js'));

  for (const file of files) {
    try {
      const scraper = require(path.join(__dirname, file));
      if (typeof scraper === 'function') {
        const events = await scraper();
        if (Array.isArray(events)) {
          allEvents.push(...events);
        }
      }
    } catch (error) {
      console.error(`Saskatoon scraper error (${file}):`, error.message);
    }
  }

  // Dedupe by title + date
  const seen = new Set();
  const unique = allEvents.filter(e => {
    const key = `${e.title}::${e.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Saskatoon total: ${unique.length} unique events`);
  return unique;
}

module.exports = scrapeSaskatoonCityEvents;
