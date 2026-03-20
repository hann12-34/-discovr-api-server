/**
 * Toronto city scraper coordinator - DYNAMIC LOADER
 * Loads all available scrapers from directory
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { toISODate } = require('../../utils/dateNormalizer');

// Fetch image AND description from event detail page
async function fetchEventDetails(url) {
    const result = { image: null, description: null };
    if (!url || !url.startsWith('http')) return result;
    const listingPatterns = [/\/events\/?$/i, /\/calendar\/?$/i, /\/shows\/?$/i, /\/whats-on\/?$/i, /\/schedule\/?$/i];
    if (listingPatterns.some(p => p.test(url))) return result;
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
        });
        const $ = cheerio.load(response.data);
        const ogImage = $('meta[property="og:image"]').attr('content');
        if (ogImage && !/logo|placeholder|default|favicon|icon/i.test(ogImage)) {
            result.image = ogImage;
        }
        const ogDesc = $('meta[property="og:description"]').attr('content');
        const metaDesc = $('meta[name="description"]').attr('content');
        let desc = ogDesc || metaDesc || null;
        if (!desc) {
            for (const sel of ['.event-description', '.description', '.event-content', '.entry-content', 'article p', 'main p']) {
                const text = $(sel).first().text().trim();
                if (text && text.length > 30 && text.length < 2000) { desc = text; break; }
            }
        }
        if (desc) {
            desc = desc.replace(/\s+/g, ' ').trim();
            if (desc.length > 1000) desc = desc.substring(0, 1000) + '...';
            if (desc.length >= 20) result.description = desc;
        }
        return result;
    } catch (e) { return result; }
}

async function scrapeTorontoCityEvents() {
    console.log('🍁 Starting Toronto scrapers...');
    const allEvents = [];
    let successCount = 0;
    let failCount = 0;
    
    // Dynamically load all scrapers from directory
    const scraperFiles = fs.readdirSync(__dirname)
        .filter(file => file.endsWith('.js') && 
                       file !== 'index.js' && 
                       !file.includes('test') && 
                       !file.includes('backup') && 
                       !file.includes('template'));
    
    console.log(`📍 Found ${scraperFiles.length} potential Toronto scrapers`);
    
    const scrapers = [];
    for (const file of scraperFiles) {
        try {
            const scraperPath = path.join(__dirname, file);
            const scraper = require(scraperPath);
            scrapers.push(scraper);
        } catch (error) {
            // Skip broken scrapers silently
        }
    }
    
    console.log(`✅ Loaded ${scrapers.length} working Toronto scrapers`);
    
    // Run all scrapers
    for (const scraper of scrapers) {
        try {
            const source = scraper.source || scraper.name || 'Unknown Scraper';
            const events = await (typeof scraper.scrape === 'function' ? scraper.scrape() : scraper('Toronto'));
            
            if (Array.isArray(events) && events.length > 0) {
                const processedEvents = [];
                for (const event of events) {
                    let image = event.imageUrl || event.image || null;
                    let description = event.description || null;
                    
                    // Fetch image and description from event detail page if missing
                    if ((!image || !description) && event.url) {
                        const details = await fetchEventDetails(event.url);
                        if (!image && details.image) image = details.image;
                        if (!description && details.description) description = details.description;
                    }
                    
                    processedEvents.push({
                        ...event,
                        description: description || '',
                        imageUrl: image,
                        image: image,
                        city: 'Toronto'
                    });
                }
                
                allEvents.push(...processedEvents);
                successCount++;
            }
        } catch (error) {
            failCount++;
            // Silently skip errors in production
        }
    }
    
    console.log(`\n🏆 Toronto: ${successCount} working, ${failCount} failed, ${allEvents.length} raw events`);
    
    // DEDUPLICATION: Remove duplicate events (by title + date)
    const seenEvents = new Set();
    const dedupedEvents = [];
    let duplicateCount = 0;
    
    for (const event of allEvents) {
        const key = `${event.title?.toLowerCase()?.trim()}|${event.date?.toLowerCase()?.trim()}`;
        if (!seenEvents.has(key)) {
            seenEvents.add(key);
            dedupedEvents.push(event);
        } else {
            duplicateCount++;
        }
    }
    
    if (duplicateCount > 0) {
        console.log(`🧹 Removed ${duplicateCount} duplicate events`);
    }
    
    // Bad venue/title patterns to filter out
    const badVenuePatterns = [/^TBA$/i, /^various/i, /^unknown/i];
    const badTitlePatterns = [
        /^funded by/i, /^government of/i, /^sponsored by/i,
        /^advertisement/i, /^subscribe/i, /^newsletter/i
    ];
    const badAddressPatterns = [/^TBA$/i, /^various/i, /^toronto,?\s*on$/i];
    
    // DATE VALIDATION + VENUE/ADDRESS VALIDATION
    const filteredEvents = [];
    let skippedCount = 0;
    
    for (const event of dedupedEvents) {
        // Skip bad titles
        if (badTitlePatterns.some(p => p.test(event.title || ''))) {
            skippedCount++;
            continue;
        }
        
        // Skip bad venue names
        const venueName = event.venue?.name || '';
        if (badVenuePatterns.some(p => p.test(venueName))) {
            skippedCount++;
            continue;
        }
        
        // Skip bad addresses
        const venueAddress = event.venue?.address || '';
        if (badAddressPatterns.some(p => p.test(venueAddress))) {
            skippedCount++;
            continue;
        }
        
        if (event.date) {
            const isoDate = toISODate(event.date);
            if (isoDate) {
                event.date = isoDate; // Normalize to YYYY-MM-DD
                filteredEvents.push(event);
            } else {
                skippedCount++;
            }
        } else {
            skippedCount++; // Skip events with no date
        }
    }
    
    console.log(`✅ ${filteredEvents.length} valid events (skipped ${skippedCount} bad events)`);
    return filteredEvents;
}

module.exports = scrapeTorontoCityEvents;
