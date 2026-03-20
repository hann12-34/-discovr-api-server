const fs = require('fs');
const path = require('path');

async function scrapePittsburghCityEvents() {
    console.log('🏗️ Starting Pittsburgh scrapers...');
    const allEvents = [];
    const scraperFiles = fs.readdirSync(__dirname)
        .filter(file => file.endsWith('.js') && file !== 'index.js' && !file.includes('test') && !file.includes('backup'));
    for (const file of scraperFiles) {
        try {
            const scraper = require(path.join(__dirname, file));
            const events = await (typeof scraper.scrape === 'function' ? scraper.scrape() : scraper('Pittsburgh'));
            if (Array.isArray(events) && events.length > 0) allEvents.push(...events);
        } catch (error) { console.error(`❌ Pittsburgh/${file}: ${error.message}`); }
    }
    const seen = new Set();
    const deduped = allEvents.filter(e => {
        const key = `${e.title?.toLowerCase()?.trim()}|${e.date?.toLowerCase()?.trim()}`;
        if (seen.has(key)) return false;
        seen.add(key); return true;
    });
    console.log(`✅ Pittsburgh: ${deduped.length} events`);
    return deduped;
}

module.exports = scrapePittsburghCityEvents;
