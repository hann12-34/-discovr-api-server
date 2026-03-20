const fs = require('fs');
const path = require('path');

async function scrapeMadisonCityEvents() {
    console.log('🧀 Starting Madison scrapers...');
    const allEvents = [];
    const scraperFiles = fs.readdirSync(__dirname)
        .filter(file => file.endsWith('.js') && file !== 'index.js' && !file.includes('test') && !file.includes('backup'));
    for (const file of scraperFiles) {
        try {
            const scraper = require(path.join(__dirname, file));
            const events = await (typeof scraper.scrape === 'function' ? scraper.scrape() : scraper('Madison'));
            if (Array.isArray(events) && events.length > 0) allEvents.push(...events);
        } catch (error) { console.error(`❌ Madison/${file}: ${error.message}`); }
    }
    const seen = new Set();
    const deduped = allEvents.filter(e => {
        const key = `${e.title?.toLowerCase()?.trim()}|${e.date?.toLowerCase()?.trim()}`;
        if (seen.has(key)) return false;
        seen.add(key); return true;
    });
    console.log(`✅ Madison: ${deduped.length} events`);
    return deduped;
}

module.exports = scrapeMadisonCityEvents;
