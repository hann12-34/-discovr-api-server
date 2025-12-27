/**
 * Montreal city scraper coordinator - CLEAN RECONSTRUCTION
 * Nuclear reconstruction approach due to massive syntax corruption across scrapers
 */

const { toISODate } = require('../../utils/dateNormalizer');
const axios = require('axios');
const cheerio = require('cheerio');

// Helper function to fetch image from event URL (og:image only)
async function fetchEventImage(url) {
    if (!url || !url.startsWith('http')) return null;
    // Skip listing pages - they return venue images, not event images
    const listingPatterns = [/\/events\/?$/i, /\/calendar\/?$/i, /\/shows\/?$/i, /\/whats-on\/?$/i, /\/schedule\/?$/i];
    if (listingPatterns.some(p => p.test(url))) return null;
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            timeout: 8000
        });
        const $ = cheerio.load(response.data);
        return $('meta[property="og:image"]').attr('content') || null;
    } catch (e) {
        return null;
    }
}

class MontrealScrapers {
    constructor(scrapersToRun) {
        this.city = 'Montreal';
        this.province = 'QC';
        this.sourceIdentifier = 'Montreal';
        
        // MONTREAL SCRAPERS - MAJOR VENUES (11 SCRAPERS)
        // Cultural Venues
        const scrapeTheatreStDenis = require('./scrape-theatre-st-denis-real');
        const scrapePlaceDesArts = require('./scrape-place-des-arts-real');
        const scrapeEspaceStDenis = require('./scrape-espace-st-denis-full');
        
        // Major Arenas & Concert Venues
        const scrapeBellCentre = require('./scrape-bell-centre');
        const scrapeMetropolis = require('./scrape-metropolis');
        
        // Concert Venues (evenko manages MTELUS, Corona, Olympia, La Tulipe)
        const scrapeEvenkoVenues = require('./scrape-evenko-venues');
        
        // Nightlife & Music Venues
        const scrapeBarLeRitzPDB = require('./scrape-bar-le-ritz-pdb-nightlife');
        const scrapeStereoNightclub = require('./scrape-stereo-nightclub');
        const scrapeNewCityGas = require('./scrape-new-city-gas');
        const scrapeFoufounesElectriques = require('./scrape-foufounes-electriques');
        const scrapeCasaDelPopolo = require('./scrape-casa-del-popolo');
        const scrapeDatchaBar = require('./scrape-datcha-bar');
        const scrapeClubUnity = require('./scrape-club-unity');
        const scrapeTurboHauss = require('./scrape-turbo-hauss');
        const scrapeBeachclub = require('./scrape-beachclub');
        const scrapeComedyNest = require('./scrape-comedy-nest');
        const scrapeLAstral = require('./scrape-l-astral');
        const scrapeQuartierSpectacles = require('./scrape-quartier-spectacles');
        const scrapeOSM = require('./scrape-osm-concerts');
        
        // NO GENERATORS OR FALLBACKS - only real venue scrapers
        
        const allScrapers = [
            // Major Arenas & Concert Venues (priority)
            scrapeBellCentre,
            scrapeMetropolis,
            scrapeTheatreStDenis,
            scrapePlaceDesArts,
            scrapeEspaceStDenis,
            scrapeEvenkoVenues,  // MTELUS, Corona, Olympia, La Tulipe, Beanfield
            // Nightlife & Music Venues
            scrapeBarLeRitzPDB,
            scrapeStereoNightclub,
            scrapeNewCityGas,
            scrapeFoufounesElectriques,
            scrapeCasaDelPopolo,
            scrapeDatchaBar,
            scrapeClubUnity,
            scrapeTurboHauss,
            scrapeBeachclub,
            scrapeComedyNest,
            scrapeLAstral,
            scrapeQuartierSpectacles,
            scrapeOSM
        ];

        this.scrapers = scrapersToRun || allScrapers;

        console.log(`🎆 Montreal Scrapers initialized - ${this.scrapers.length} scrapers`);
        console.log(`📍 Major venues: Theatre St-Denis, Place des Arts, Espace St-Denis, evenko (MTELUS+4), Bar Le Ritz, Stereo, New City Gas`);
    }

    async scrape() {
        console.log('🏙️ Starting Montreal scrapers...');
        const allEvents = [];

        if (this.scrapers.length === 0) {
            console.log('⚠️ No working Montreal scrapers available - all require syntax reconstruction');
            return [];
        }

        for (const scraper of this.scrapers) {
            try {
                const source = scraper.source || scraper.name || 'Unknown Scraper';
                console.log(`📍 Running scraper for ${source}...`);
                const events = await (typeof scraper.scrape === 'function' ? scraper.scrape() : scraper());

                if (Array.isArray(events) && events.length > 0) {
                    // Process events and fetch images for those missing them
                    const processedEvents = [];
                    for (const event of events) {
                        // Fetch image if missing
                        let image = event.image || event.imageUrl || event.imageURL;
                        if (!image && event.url) {
                            image = await fetchEventImage(event.url);
                        }
                        
                        // Normalize date to ISO format (YYYY-MM-DD)
                        let normalizedDate = event.date;
                        if (event.date && !event.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            let dateToNormalize = event.date;
                            
                            // Handle short format like "13.Nov" or "26.Déc" - add current/next year
                            const shortDateMatch = dateToNormalize.match(/(\d{1,2})\.(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Déc)/i);
                            if (shortDateMatch) {
                                const day = shortDateMatch[1];
                                let month = shortDateMatch[2];
                                if (month === 'Déc') month = 'Dec';
                                
                                const now = new Date();
                                const currentYear = now.getFullYear();
                                const currentMonth = now.getMonth(); // 0-11
                                
                                const monthMap = {'Jan':0,'Feb':1,'Mar':2,'Apr':3,'May':4,'Jun':5,'Jul':6,'Aug':7,'Sep':8,'Oct':9,'Nov':10,'Dec':11};
                                const eventMonth = monthMap[month];
                                
                                // If event month is in the past, use next year
                                const year = (eventMonth < currentMonth - 1) ? currentYear + 1 : currentYear;
                                
                                dateToNormalize = `${month} ${day}, ${year}`;
                            }
                            
                            // Handle French date ranges: "26 et 27 novembre 2025" or "10 au 31 décembre 2025"
                            if (dateToNormalize.includes(' et ') || dateToNormalize.includes(' au ')) {
                                // Extract first date: "26 et 27 novembre 2025" -> "26 novembre 2025"
                                dateToNormalize = dateToNormalize
                                    .replace(/(\d{1,2})\s+et\s+\d{1,2}\s+(\w+\s+\d{4})/, '$1 $2')
                                    .replace(/(\d{1,2})\s+au\s+\d{1,2}\s+(\w+\s+\d{4})/, '$1 $2')
                                    .split(' et ')[0]
                                    .split(' au ')[0];
                            }
                            
                            // Handle English date ranges: "November 12 and 13" or "November 12 to 15"
                            if (dateToNormalize.includes(' and ') || dateToNormalize.includes(' to ')) {
                                dateToNormalize = dateToNormalize
                                    .replace(/(\w+ \d{1,2})(?:\s+and\s+\d{1,2})?,\s+(\d{4})/, '$1, $2')
                                    .replace(/(\w+ \d{1,2})(?:\s+to\s+\d{1,2})?,\s+(\d{4})/, '$1, $2')
                                    .split(' and ')[0]
                                    .split(' to ')[0];
                            }
                            
                            // Convert French months to English for toISODate()
                            const frenchToEnglish = {
                                'janvier': 'January', 'février': 'February', 'mars': 'March', 'avril': 'April',
                                'mai': 'May', 'juin': 'June', 'juillet': 'July', 'août': 'August',
                                'septembre': 'September', 'octobre': 'October', 'novembre': 'November', 'décembre': 'December'
                            };
                            
                            for (const [fr, en] of Object.entries(frenchToEnglish)) {
                                if (dateToNormalize.toLowerCase().includes(fr)) {
                                    // Convert "17 novembre 2025" to "November 17, 2025"
                                    dateToNormalize = dateToNormalize.replace(
                                        new RegExp(`(\\d{1,2})\\s+${fr}\\s+(\\d{4})`, 'i'),
                                        `${en} $1, $2`
                                    );
                                    break;
                                }
                            }
                            
                            normalizedDate = toISODate(dateToNormalize);
                        }
                        
                        // Skip events with invalid dates
                        if (!normalizedDate) continue;
                        
                        // Skip bad venue names
                        const badVenuePatterns = [/^TBA$/i, /^various/i, /^unknown/i, /^montreal$/i];
                        const venueName = event.venue?.name || source || '';
                        if (badVenuePatterns.some(p => p.test(venueName))) continue;
                        
                        // Skip bad titles
                        const badTitlePatterns = [/^funded by/i, /^government of/i, /^sponsored by/i, /^advertisement/i, /^par le/i, /^le gouvernement/i];
                        if (badTitlePatterns.some(p => p.test(event.title || ''))) continue;
                        
                        // Skip bad addresses
                        const badAddressPatterns = [/^TBA$/i, /^various/i, /^montreal,?\s*qc$/i];
                        if (badAddressPatterns.some(p => p.test(event.venue?.address || ''))) continue;
                        
                        processedEvents.push({
                            ...event,
                            date: normalizedDate,
                            city: 'Montreal',
                            image: image,
                            venue: event.venue || { name: source },
                            categories: [...(event.categories || []), 'city'].filter((v, i, a) => a.indexOf(v) === i)
                        });
                    }

                    allEvents.push(...processedEvents);
                    console.log(`✅ Found ${events.length} events from ${source}, ${processedEvents.length} with valid dates`);
                } else {
                    console.log(`⚠️ No events found from ${source}`);
                }
            } catch (error) {
                const source = scraper.source || scraper.name || 'Unknown Scraper';
                console.error(`❌ Error running scraper for ${source}:`, error.message);
            }
        }

        console.log(`🎉 Montreal scrapers found ${allEvents.length} events in total`);
        return allEvents;
    }
}

// Export as object with scrape method for compatibility with cities/index.js
module.exports = {
    scrape: async function scrapeMontrealCityEvents() {
        const scraper = new MontrealScrapers();
        return await scraper.scrape();
    }
};
