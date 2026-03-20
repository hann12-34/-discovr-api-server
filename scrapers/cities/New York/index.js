/**
 * New York city scraper coordinator - DYNAMIC LOADER
 * Loads all available scrapers from directory
 */

const fs = require('fs');
const path = require('path');
const { toISODate } = require('../../utils/dateNormalizer');
const axios = require('axios');
const cheerio = require('cheerio');

// Blacklist of generic venue logos and placeholder images - DO NOT USE THESE
// NOTE: Do NOT blacklist full domains - only specific logo patterns
const IMAGE_BLACKLIST = [
    'sob-logo', 'sobs-logo', 'cropped-sobs', 'legendary-sobs', 'venue-logo', 'default', 'placeholder',
    'logo.png', 'logo.jpg', 'logo.gif', 'site-logo', 'header-logo', 'brand', 'favicon',
    'apollo-logo', 'apollo_logo', 'brooklynbowl-logo', 'bowery-logo',
    'terminal5', 'irving-plaza', 'gramercy', 'webster-hall', 'beacon',
    'radio-city', 'msg-logo', 'madison-square', 'barclays', 'forest-hills',
    'summerstage', 'central-park', 'prospect-park', 'nycgo', 'nyc-logo',
    'default-event', 'no-image', 'coming-soon', 'tbd', 'generic',
    'facebook.com/tr', 'pixel', 'tracking', 'analytics', '1x1', 'spacer',
    'share-image', 'og-default', 'social-share', 'twitter-card',
    'bam_logo', 'bam-logo', '/logo/', '_logo', '-logo',
    'javits-logo', 'javits_logo', 'cityfieldlogo', 'msglogo',
    '/img/logo', '/images/logo', '/assets/logo', 'Static/img/logo',
    'logo-open-graph', 'open-graph', 'cisco.com', 'nacacnet.org',
    'mcny.edu', 'cdn.asp.events', 'evbuc.com/images', 'eventbrite',
    'social', 'share', 'og-image', 'facebook', 'twitter-card',
    'icon', 'venue_', 'static_social', 'site-share', 'media-poster',
    'social-og', 'qtxasset.com', 'travmedia.com', 'oracle.com/a/evt',
    'nxedge.io', 'brooklynbowl.com/assets/img/static'
];

// Check if image URL is a generic logo or placeholder
function isGenericImage(imageUrl) {
    if (!imageUrl) return true;
    const lowerUrl = imageUrl.toLowerCase();
    return IMAGE_BLACKLIST.some(pattern => lowerUrl.includes(pattern));
}

// Helper function to fetch image from event URL (og:image only)
// CRITICAL: Filter out generic venue logos
async function fetchEventImage(url) {
    if (!url || !url.startsWith('http')) return null;
    // Skip listing pages - they return venue images, not event images
    const listingPatterns = [/\/events\/?$/i, /\/calendar\/?$/i, /\/shows\/?$/i, /\/whats-on\/?$/i, /\/schedule\/?$/i];
    if (listingPatterns.some(p => p.test(url))) return null;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 6000,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        const $ = cheerio.load(response.data);
        const ogImage = $('meta[property="og:image"]').attr('content') || null;
        
        // CRITICAL: Reject generic venue logos and placeholders
        if (ogImage && isGenericImage(ogImage)) {
            console.log(`   ⚠️ Rejected generic logo: ${ogImage.substring(0, 50)}...`);
            return null;
        }
        
        return ogImage;
    } catch (e) {
        clearTimeout(timeoutId);
        return null;
    }
}

// Helper: delay between scrapers to let TCP connections drain
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class NewYorkScrapers {
    constructor(scrapersToRun) {
        this.city = 'New York';
        this.province = 'NY';
        this.sourceIdentifier = 'NewYork';
        
        // Dynamically load all scrapers from directory
        const allScrapers = [];
        const scraperFiles = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.js') && 
                           file !== 'index.js' && 
                           !file.includes('test') && 
                           !file.includes('backup') && 
                           !file.includes('template'));
        
        console.log(`🗽 Found ${scraperFiles.length} potential New York scrapers`);
        
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
        console.log(`✅ Loaded ${this.scrapers.length} working New York scrapers`);
    }

    async scrape() {
        console.log('🗽 Starting New York scrapers...');
        const allEvents = [];
        let successCount = 0;
        let failCount = 0;

        if (this.scrapers.length === 0) {
            console.log('⚠️ No working New York scrapers available');
            return [];
        }

        for (const scraper of this.scrapers) {
            try {
                const source = scraper.source || scraper.name || 'Unknown Scraper';
                
                // Use AbortController so timeout actually cancels HTTP connections
                // (prevents ERR_INTERNAL_ASSERTION from zombie TCP connections)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 45000);
                
                let scraperPromise;
                try {
                    scraperPromise = typeof scraper.scrape === 'function' 
                        ? scraper.scrape() 
                        : scraper('New York');
                } catch (syncErr) {
                    clearTimeout(timeoutId);
                    throw syncErr;
                }
                
                const timeoutPromise = new Promise((_, reject) => {
                    controller.signal.addEventListener('abort', () => 
                        reject(new Error('Scraper timeout (45s)'))
                    );
                });
                
                const events = await Promise.race([scraperPromise, timeoutPromise]);
                clearTimeout(timeoutId);

                if (Array.isArray(events) && events.length > 0) {
                    // Fetch images+descriptions for events missing them
                    for (const event of events) {
                        const needsImage = !event.image && !event.imageUrl;
                        const needsDesc = !event.description;
                        if ((needsImage || needsDesc) && event.url) {
                            try {
                                if (needsImage) {
                                    event.image = await fetchEventImage(event.url);
                                }
                                if (needsDesc) {
                                    // Fetch description from meta tags
                                    const response = await axios.get(event.url, {
                                        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
                                        timeout: 6000
                                    }).catch(() => null);
                                    if (response) {
                                        const $ = cheerio.load(response.data);
                                        const desc = $('meta[property="og:description"]').attr('content') ||
                                                     $('meta[name="description"]').attr('content') || null;
                                        if (desc && desc.length >= 20) {
                                            event.description = desc.replace(/\s+/g, ' ').trim().substring(0, 1000);
                                        }
                                    }
                                }
                            } catch (e) {
                                // Skip fetch errors silently
                            }
                        }
                    }
                    
                    const processedEvents = events.map(event => ({
                        ...event,
                        city: 'New York',
                        venue: event.venue || { name: source },
                        categories: [...(event.categories || []), 'city'].filter((v, i, a) => a.indexOf(v) === i)
                    }));

                    allEvents.push(...processedEvents);
                    successCount++;
                    console.log(`✅ ${source}: ${events.length} events`);
                } else {
                    // Silently skip scrapers with 0 events (many are stubs)
                }
            } catch (error) {
                failCount++;
                const source = scraper.source || scraper.name || 'Unknown';
                console.error(`❌ ${source}: ${error.message.substring(0, 50)}`);
            }
            
            // Cooldown between scrapers — lets TCP connections drain
            // Prevents ERR_INTERNAL_ASSERTION from connection pile-up
            await delay(200);
        }
        
        // GLOBAL DEDUPLICATION: Remove duplicates across all scrapers
        const seen = new Set();
        const uniqueEvents = [];
        
        for (const event of allEvents) {
            // Convert date to ISO format for reliable iOS parsing
            if (event.date) {
                const isoDate = toISODate(event.date);
                if (isoDate) {
                    event.date = isoDate; // Replace with ISO format: YYYY-MM-DD
                } else {
                    // Skip events with unparseable dates to avoid 1970-01-01 in iOS app
                    console.log(`  ❌ Skipping event with bad date: "${event.date}" - ${event.title}`);
                    continue;
                }
            } else {
                // Skip events with no date
                continue;
            }
            
            // Create unique key: title + date + venue (case-insensitive, normalized)
            let normalizedTitle = event.title.toLowerCase().trim();
            
            // Aggressive title normalization for better deduplication
            normalizedTitle = normalizedTitle
                .replace(/\s+/g, ' ')                    // Collapse whitespace
                .replace(/\s*[-–—:]\s*/g, ' ')           // Remove separators: " - ", " : ", etc.
                .replace(/\b(performance of|presents?|featuring)\b/gi, '') // Remove filler words
                .replace(/\s+/g, ' ')                    // Collapse again
                .trim();
            
            const normalizedDate = (event.date || '').toLowerCase().trim().replace(/\s+/g, ' ');
            
            // Normalize venue name: handle "Theater" vs "Theatre", remove extra spaces
            let venueName = (event.venue?.name || event.source || '').toLowerCase().trim();
            venueName = venueName
                .replace(/\s+/g, ' ')           // Collapse whitespace
                .replace(/\btheatre\b/g, 'theater')  // Normalize theater spelling
                .replace(/\bcentre\b/g, 'center')    // Normalize center spelling
                .replace(/\bmusic hall\b/g, '')      // "Radio City Music Hall" → "Radio City"
                .replace(/\bhall\b/g, '')            // Remove "Hall" suffix
                .replace(/[^\w\s]/g, '')             // Remove punctuation
                .replace(/\s+/g, ' ')                // Collapse again
                .trim();
            
            const key = `${normalizedTitle}|${normalizedDate}|${venueName}`;
            
            // Skip bad venue names
            const badVenuePatterns = [/^TBA$/i, /^various/i, /^unknown/i, /^new york$/i];
            if (badVenuePatterns.some(p => p.test(event.venue?.name || ''))) {
                continue;
            }
            
            // Skip bad titles
            const badTitlePatterns = [/^funded by/i, /^government of/i, /^sponsored by/i, /^advertisement/i];
            if (badTitlePatterns.some(p => p.test(event.title || ''))) {
                continue;
            }
            
            // Skip bad addresses
            const badAddressPatterns = [/^TBA$/i, /^various/i, /^new york,?\s*ny$/i];
            if (badAddressPatterns.some(p => p.test(event.venue?.address || ''))) {
                continue;
            }
            
            if (!seen.has(key)) {
                seen.add(key);
                uniqueEvents.push(event);
            }
        }
        
        const duplicatesRemoved = allEvents.length - uniqueEvents.length;
        if (duplicatesRemoved > 0) {
            console.log(`\n🧹 Removed ${duplicatesRemoved} duplicate events`);
        }
        
        console.log(`\n🏆 NY: ${successCount} working, ${failCount} failed, ${uniqueEvents.length} events`);
        return uniqueEvents;
    }
}

// Export as object with scrape method for compatibility with cities/index.js
module.exports = {
    scrape: async function scrapeNewYorkCityEvents() {
        const scraper = new NewYorkScrapers();
        return await scraper.scrape();
    }
};
