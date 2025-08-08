/**
 * Calgary Nightlife Scraper
 *
 * This scraper extracts nightlife venue information from Calgary's official tourism page.
 * It identifies venues in different categories: Live Music, Nightclubs & Dancing, Bars & Pubs, and Cowboy bars.
 */

const axios = require('axios');
const cheerio = require('cheerio');

class CalgaryNightlifeScraper {
    constructor() {
        this.baseUrl = 'https://www.calgary.ca';
        this.targetUrl = 'https://www.calgary.ca/major-projects/night-life.html';
        this.venues = [];
    }

    async scrapeEvents() {
        try {
            console.log('🌃 Scraping Calgary Nightlife venues...');

            const response = await axios.get(this.targetUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            };

            const $ = cheerio.load(response.data);
            const events = [];

            // Extract venues from different categories
            const categories = {
                'Live Music': 'Concert',
                'Nightclubs & Dancing': 'Nightclub',
                'Bars & Pubs': 'Bar',
                'Cowboy Up': 'Country Bar'
            };

            // Process each category section
            for (const [sectionName, category] of Object.entries(categories)) {
                const sectionHeader = $(`h2:contains("${sectionName}")`);

                if (sectionHeader.length > 0) {
                    const sectionContent = sectionHeader.next();

                    // Extract venue links and names
                    const venueLinks = sectionContent.find('a').toArray();

                    venueLinks.forEach(link => {
                        const $link = $(link);
                        const venueName = this.cleanText($link.text());
                        const venueUrl = $link.attr('href');

                        if (venueName && venueUrl && venueName.length > 2) {
                            // Create a generic event for each venue
                            events.push({
                                title: `${venueName} - ${category} Venue`,
                                description: `Experience ${category.toLowerCase()} entertainment at ${venueName}. Check their website for current events and schedules.`,
                                venue: { ...RegExp.venue: {
                                    name: venueName,
                                    address: 'Calgary, AB',
                                    city: city,
                                    state: 'Alberta',
                                    country: 'Canada'
                                }, city },,
                                category: category,
                                url: venueUrl.startsWith('http') ? venueUrl : `https://${venueUrl}`,
                                date: this.getUpcomingDate(),
                                source: 'Calgary Nightlife',
                                scrapedAt: new Date()
                            };
                        }
                    };
                }
            }

            // Also extract venue names from text content
            const textContent = $('body').text();
            const venueNames = this.extractVenueNames(textContent);

            venueNames.forEach(venue => {
                if (!events.find(e => e.venue.name === venue.name)) {
                    events.push({
                        title: `${venue.name} - ${venue.category} Venue`,
                        description: `Experience ${venue.category.toLowerCase()} entertainment at ${venue.name}. Visit for current events and schedules.`,
                        venue: { ...RegExp.venue: {
                            name: venue.name,
                            address: 'Calgary, AB',
                            city: city,
                            state: 'Alberta',
                            country: 'Canada'
                        }, city },,
                        category: venue.category,
                        url: venue.url || this.targetUrl,
                        date: this.getUpcomingDate(),
                        source: 'Calgary Nightlife',
                        scrapedAt: new Date()
                    };
                }
            };

            console.log(`🎉 Successfully scraped ${events.length} unique venues from Calgary Nightlife`);
            return events;

        } catch (error) {
            console.error('❌ Error scraping Calgary Nightlife:', error.message);
            return [];
        }
    }

    extractVenueNames(text) {
        const venues = [];
        const venuePatterns = [
            // Live Music venues
            { name: 'Commonwealth Bar & Stage', category: 'Live Music', url: 'https://www.commonwealthbar.ca/' },
            { name: 'King Eddy', category: 'Live Music', url: 'https://kingeddy.ca/' },
            { name: 'Modern Love', category: 'Live Music', url: 'https://modern-love.ca/' },
            { name: 'The Palomino Smokehouse', category: 'Live Music', url: 'https://thepalomino.ca/' },
            { name: 'The Blues Can', category: 'Live Music', url: 'https://www.thebluescan.com/' },

            // Nightclubs
            { name: 'Greta Bar', category: 'Nightclub', url: 'https://www.gretabar.com/locations/calgary' },
            { name: 'Infinity Ultra Lounge', category: 'Nightclub', url: 'https://www.infinityultralounge.com/' },
            { name: 'Papi', category: 'Nightclub', url: 'https://papicalgary.ca/' },
            { name: 'Sub Rosa', category: 'Nightclub', url: 'https://www.subrosayyc.com/' },
            { name: 'Twisted Element', category: 'Nightclub', url: 'https://twistedelement.club/' },

            // Bars & Pubs
            { name: 'Bottlescrew Bill\'s Pub', category: 'Bar', url: 'https://www.bottlescrewbill.com/' },
            { name: 'James Joyce Irish Pub', category: 'Bar', url: 'http://jamesjoycepub.com/' },
            { name: 'One Night Stan\'s Bar Room', category: 'Bar', url: 'https://www.onenightstans.ca/' },
            { name: 'St. James Corner', category: 'Bar', url: 'https://stjamescorner.ca/' },
            { name: 'Ship and Anchor', category: 'Bar', url: 'https://shipandanchor.com/' },
            { name: 'The Bank and Baron P.U.B', category: 'Bar', url: 'https://www.bankandbaronpub.com/' },

            // Country Bars
            { name: 'Cowboys Dance Hall', category: 'Country Bar', url: 'https://www.cowboysnightclub.com/' },
            { name: 'Spanky\'s Saloon', category: 'Country Bar', url: 'https://spankyssaloon.ca/' },
            { name: 'Whiskey Rose Saloon', category: 'Country Bar', url: 'https://whiskeyrosesaloon.com/' }
        ];

        return venuePatterns.filter(venue =>
            text.includes(venue.name) || text.includes(venue.name.replace(/[^\w\s]/g, ''))
        );
    }

    cleanText(text) {
        return text ? text.trim().replace(/\s+/g, ' ').replace(/[^\w\s&'-]/g, '') : '';
    }

    getUpcomingDate() {
        const now = new Date();
        const upcoming = new Date(now);
        upcoming.setDate(now.getDate() + 1); // Tomorrow
        return upcoming;
    }
}

module.exports = CalgaryNightlifeScraper;


// Function export wrapper added by targeted fixer
module.exports = async (city) => {
    const scraper = new CalgaryNightlifeScraper();
    if (typeof scraper.scrape === 'function') {
        return await scraper.scrape(city);
    } else {
        throw new Error('No scrape method found in CalgaryNightlifeScraper');
    }
};