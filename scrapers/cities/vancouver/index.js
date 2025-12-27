/**
 * Vancouver city scraper coordinator
 * Loads all available scrapers from directory and normalizes dates
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { toISODate } = require('../../utils/dateNormalizer');

// Helper function to fetch og:image from event URL
// ONLY for specific event pages, NOT listing pages
async function fetchEventImage(url) {
    if (!url || !url.startsWith('http')) return null;
    
    // Skip generic listing pages - these return venue images, not event images
    const listingPatterns = [
        /\/events\/?$/i,
        /\/calendar\/?$/i,
        /\/shows\/?$/i,
        /\/whats-on\/?$/i,
        /\/schedule\/?$/i,
        /\/upcoming\/?$/i
    ];
    if (listingPatterns.some(p => p.test(url))) {
        return null; // Don't fetch from listing pages
    }
    
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
        });
        const $ = cheerio.load(response.data);
        const ogImage = $('meta[property="og:image"]').attr('content') || null;
        
        // Skip generic venue/logo images
        if (ogImage && (ogImage.includes('logo') || ogImage.includes('default') || ogImage.includes('placeholder'))) {
            return null;
        }
        
        return ogImage;
    } catch (e) {
        return null;
    }
}

class VancouverScrapers {
    constructor(scrapersToRun) {
        this.city = 'Vancouver';
        this.province = 'BC';
        this.sourceIdentifier = 'Vancouver';
        
        // Dynamically load all scrapers from directory
        const allScrapers = [];
        const scraperFiles = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.js') && 
                           file !== 'index.js' && 
                           !file.includes('test') && 
                           !file.includes('backup') && 
                           !file.includes('template'));
        
        console.log(`🍁 Found ${scraperFiles.length} potential Vancouver scrapers`);
        
        for (const file of scraperFiles) {
            try {
                const scraperPath = path.join(__dirname, file);
                const scraper = require(scraperPath);
                allScrapers.push(scraper);
            } catch (error) {
                // Skip broken scrapers silently
            }
        }

        this.scrapers = scrapersToRun || allScrapers;
        console.log(`✅ Loaded ${this.scrapers.length} working Vancouver scrapers`);
    }

    async scrape() {
        console.log('🍁 Starting Vancouver scrapers...');
        const allEvents = [];
        let successCount = 0;
        let failCount = 0;

        if (this.scrapers.length === 0) {
            console.log('⚠️ No working Vancouver scrapers available');
            return [];
        }

        for (const scraper of this.scrapers) {
            try {
                const source = scraper.source || scraper.name || 'Unknown Scraper';
                const events = await (typeof scraper.scrape === 'function' ? scraper.scrape() : scraper('Vancouver'));

                if (Array.isArray(events) && events.length > 0) {
                    // Process events and fetch og:image for those missing images
                    const processedEvents = [];
                    for (const event of events) {
                        let image = event.image || event.imageUrl || null;
                        
                        // Fetch og:image if missing
                        if (!image && event.url) {
                            image = await fetchEventImage(event.url);
                        }
                        
                        processedEvents.push({
                            ...event,
                            imageUrl: image,
                            image: image,
                            city: 'Vancouver',
                            venue: event.venue || { name: source },
                            categories: [...(event.categories || []), 'city'].filter((v, i, a) => a.indexOf(v) === i)
                        });
                    }

                    allEvents.push(...processedEvents);
                    successCount++;
                    const withImages = processedEvents.filter(e => e.image).length;
                    console.log(`✅ ${source}: ${events.length} events (${withImages} with images)`);
                } else {
                    // Silently skip scrapers with 0 events
                }
            } catch (error) {
                failCount++;
                if (process.env.NODE_ENV !== 'production') {
                    const source = scraper.source || scraper.name || 'Unknown';
                    console.error(`❌ ${source}: ${error.message.substring(0, 50)}`);
                }
            }
        }
        
        // CRITICAL: Normalize dates to ISO format for consistent iOS parsing
        const validEvents = [];
        
        // Generic venue patterns to filter out
        const badVenuePatterns = [
            /^various\s*(locations|venues)/i,
            /^vancouver's best places$/i,
            /^daily hive/i,
            /^do604$/i,
            /^made in the 604$/i
        ];
        
        const badAddressPatterns = [
            /^various\s*(locations|venues)/i,
            /^vancouver,?\s*bc$/i
        ];
        
        // Bad title patterns
        const badTitlePatterns = [
            /^must close/i,
            /^closing soon/i,
            /^last chance/i,
            /^now showing/i,
            /^what's showing/i,
            /^all past events/i,
            /special event$/i,
            /^\w+\s+\d{1,2}(st|nd|rd|th)?\s+(special event|theatre|multimedia)/i
        ];
        
        const seenTitles = new Set();
        
        for (const event of allEvents) {
            // Skip bad titles
            const title = event.title || '';
            if (badTitlePatterns.some(p => p.test(title))) {
                continue;
            }
            
            // Convert date to ISO format
            if (event.date) {
                const isoDate = toISODate(event.date);
                if (isoDate) {
                    event.date = isoDate; // Replace with ISO format: YYYY-MM-DD
                } else {
                    // Skip events with unparseable dates
                    continue;
                }
            } else {
                // Skip events with no date
                continue;
            }
            
            // Deduplicate by title + date
            const key = (title + event.date).toLowerCase();
            if (seenTitles.has(key)) continue;
            seenTitles.add(key);
            
            // Skip events with generic/bad venue names
            const venueName = event.venue?.name || '';
            if (badVenuePatterns.some(p => p.test(venueName))) {
                console.log(`  ❌ Skipping generic venue: "${venueName}" - ${event.title}`);
                continue;
            }
            
            // Skip events with generic addresses
            const venueAddress = event.venue?.address || '';
            if (badAddressPatterns.some(p => p.test(venueAddress))) {
                console.log(`  ❌ Skipping generic address: "${venueAddress}" - ${event.title}`);
                continue;
            }
            
            validEvents.push(event);
        }
        
        console.log(`\n🏆 Vancouver: ${successCount} working, ${failCount} failed, ${allEvents.length} raw events`);
        console.log(`✅ ${validEvents.length} valid events (skipped ${allEvents.length - validEvents.length} with bad dates)`);
        
        return validEvents;
    }
}

// Export as object with scrape method for compatibility with cities/index.js
module.exports = {
    scrape: async () => {
        const scraper = new VancouverScrapers();
        return scraper.scrape();
    }
};
