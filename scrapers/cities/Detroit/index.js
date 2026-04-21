const fs = require('fs');
const path = require('path');

async function scrapeDetroitCityEvents() {
    console.log('🚗 Starting Detroit scrapers...');
    const allEvents = [];
    const scraperFiles = fs.readdirSync(__dirname)
        .filter(file => file.endsWith('.js') && file !== 'index.js' && !file.includes('test') && !file.includes('backup'));
    for (const file of scraperFiles) {
        try {
            const scraper = require(path.join(__dirname, file));
            const events = await (typeof scraper.scrape === 'function' ? scraper.scrape() : scraper('Detroit'));
            if (Array.isArray(events) && events.length > 0) allEvents.push(...events);
        } catch (error) { console.error(`❌ Detroit/${file}: ${error.message}`); }
    }
    const seen = new Set();
    const deduped = allEvents.filter(e => {
        const key = `${e.title?.toLowerCase()?.trim()}|${e.date?.toLowerCase()?.trim()}`;
        if (seen.has(key)) return false;
        seen.add(key); return true;
    });
    const today = new Date().toISOString().slice(0, 10);
    const unique = deduped.filter(e => (e.date || '').slice(0, 10) >= today);
    console.log(`✅ Detroit: ${unique.length} events`);
    return unique;
}

module.exports = scrapeDetroitCityEvents;
