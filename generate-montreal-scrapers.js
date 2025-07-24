const fs = require('fs');
const path = require('path');

/**
 * Generate Montreal scrapers for all active URLs
 */

// List of active Montreal URLs with venue information
const venueData = [
    { url: 'boho.ca', name: 'Boho', category: 'Nightlife', type: 'bar' },
    { url: 'cloakroombar.ca', name: 'Cloakroom Bar', category: 'Nightlife', type: 'bar' },
    { url: 'gokudo.ca', name: 'Gokudo', category: 'Food & Dining', type: 'restaurant' },
    { url: 'lelab.ca', name: 'Le Lab', category: 'Nightlife', type: 'club' },
    { url: 'thepastime.ca', name: 'The Pastime', category: 'Nightlife', type: 'bar' },
    { url: 'undergroundcity.ca', name: 'Underground City', category: 'Shopping & Events', type: 'complex' },
    { url: 'maisonnotman.ca', name: 'Maison Notman', category: 'Event Space', type: 'venue' },
    { url: 'lola-rosa.ca', name: 'Lola Rosa', category: 'Food & Dining', type: 'restaurant' },
    { url: 'pubsaintpierre.ca', name: 'Pub Saint-Pierre', category: 'Nightlife', type: 'pub' },
    { url: 'tavernemidway.ca', name: 'Taverne Midway', category: 'Nightlife', type: 'tavern' },
    { url: 'montroyal.ca', name: 'Mont Royal', category: 'Outdoor & Recreation', type: 'park' },
    { url: 'lagranderouedemontreal.com', name: 'La Grande Roue de Montreal', category: 'Attraction', type: 'attraction' },
    { url: 'lavoute.ca', name: 'La Voute', category: 'Nightlife', type: 'venue' },
    { url: 'blvd44.com', name: 'Boulevard 44', category: 'Nightlife', type: 'venue' },
    { url: 'clubunity.com', name: 'Club Unity', category: 'Nightlife', type: 'club' },
    { url: 'foufounes.ca', name: 'Foufounes Électriques', category: 'Nightlife', type: 'club' },
    { url: 'belmont.ca', name: 'Belmont', category: 'Entertainment', type: 'venue' },
    { url: 'cabaretmado.com', name: 'Cabaret Mado', category: 'Entertainment', type: 'cabaret' },
    { url: 'lebalcon.ca', name: 'Le Balcon', category: 'Nightlife', type: 'bar' },
    { url: 'lebelmont.ca', name: 'Le Belmont', category: 'Nightlife', type: 'bar' },
    { url: 'montrealnightclubs.com', name: 'Montreal Nightclubs', category: 'Directory', type: 'directory' },
    { url: 'lelab.com', name: 'Le Lab', category: 'Nightlife', type: 'club' },
    { url: 'lemalnecessaire.com', name: 'Le Mal Nécessaire', category: 'Nightlife', type: 'bar' },
    { url: 'barraca.ca', name: 'Barraca', category: 'Nightlife', type: 'bar' },
    { url: 'flyjin.ca', name: 'Fly Jin', category: 'Nightlife', type: 'bar' },
    { url: 'barfurco.com', name: 'Bar Furco', category: 'Nightlife', type: 'bar' },
    { url: 'dieuduciel.com', name: 'Dieu du Ciel!', category: 'Food & Drinks', type: 'brewery' },
    { url: 'amereaboire.com', name: 'À Mère À Boire', category: 'Food & Drinks', type: 'brewery' },
    { url: 'mabrasserie.com', name: 'Ma Brasserie', category: 'Food & Drinks', type: 'brewery' },
    { url: 'brutopia.net', name: 'Brutopia', category: 'Food & Drinks', type: 'brewery' },
    { url: 'yeoldeorchard.com', name: 'Ye Olde Orchard', category: 'Nightlife', type: 'pub' },
    { url: 'griffintown.com', name: 'Griffintown', category: 'Neighborhood', type: 'area' }
];

// Generate scraper template
function generateScraperTemplate(venue) {
    const className = venue.name.replace(/[^a-zA-Z0-9]/g, '') + 'Events';
    const fileName = venue.url.split('.')[0].replace(/[^a-zA-Z0-9]/g, '-');
    
    const template = `const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

/**
 * ${venue.name} Montreal Events Scraper
 * URL: https://${venue.url}
 */
class ${className} {
    constructor() {
        this.baseUrl = 'https://${venue.url}';
        this.eventsUrl = 'https://${venue.url}/events';
        this.source = '${venue.name}';
        this.city = 'Montreal';
        this.province = 'QC';
    }

    getDefaultCoordinates() {
        return { latitude: 45.5088, longitude: -73.5878 };
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        try {
            const cleanDateStr = dateStr.trim();
            const isoMatch = cleanDateStr.match(/(\\d{4}-\\d{2}-\\d{2})/);
            if (isoMatch) return new Date(isoMatch[1]);
            
            const frenchMonths = {
                'janvier': 'January', 'février': 'February', 'mars': 'March',
                'avril': 'April', 'mai': 'May', 'juin': 'June',
                'juillet': 'July', 'août': 'August', 'septembre': 'September',
                'octobre': 'October', 'novembre': 'November', 'décembre': 'December'
            };
            
            let englishDateStr = cleanDateStr;
            for (const [french, english] of Object.entries(frenchMonths)) {
                englishDateStr = englishDateStr.replace(new RegExp(french, 'gi'), english);
            }
            
            const parsedDate = new Date(englishDateStr);
            return isNaN(parsedDate.getTime()) ? null : parsedDate;
        } catch (error) {
            return null;
        }
    }

    cleanText(text) {
        if (!text) return '';
        return text.trim().replace(/\\s+/g, ' ').replace(/\\n+/g, ' ').trim();
    }

    extractVenueInfo() {
        return {
            name: '${venue.name}',
            address: 'Montreal, QC',
            city: 'Montreal',
            province: 'QC',
            coordinates: this.getDefaultCoordinates()
        };
    }

    extractEventDetails($, eventElement) {
        const $event = $(eventElement);
        const title = this.cleanText($event.find('h1, h2, h3, h4, .title, .event-title, .name').first().text() || $event.find('a').first().text());
        
        if (!title || title.length < 3) return null;
        
        const dateText = $event.find('.date, .event-date, .when, time').first().text();
        const eventDate = this.parseDate(dateText);
        const description = this.cleanText($event.find('.description, .summary, .excerpt, p').first().text());
        const priceText = $event.find('.price, .cost, .ticket-price').text();
        const price = priceText ? this.cleanText(priceText) : 'Check website for pricing';
        const eventUrl = $event.find('a').first().attr('href');
        const fullEventUrl = eventUrl ? (eventUrl.startsWith('http') ? eventUrl : \`\$\{this.baseUrl\}\$\{eventUrl\}\`) : null;
        const venue = this.extractVenueInfo();
        
        return {
            id: uuidv4(),
            name: title,
            title: title,
            description: description || \`\$\{title\} at ${venue.name}\`,
            date: eventDate,
            venue: venue,
            city: this.city,
            province: this.province,
            price: price,
            category: '${venue.category}',
            source: this.source,
            url: fullEventUrl,
            scrapedAt: new Date()
        };
    }

    async scrapeEvents() {
        try {
            console.log(\`🎯 Scraping events from \$\{this.source\}...\`);
            const response = await axios.get(this.eventsUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
                timeout: 30000
            });
            
            const $ = cheerio.load(response.data);
            const events = [];
            const eventSelectors = ['.event', '.event-item', '.event-card', '.show', '.party', '.listing', '.card'];
            
            let eventElements = $();
            for (const selector of eventSelectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                    eventElements = elements;
                    console.log(\`✅ Found \$\{elements.length\} events using selector: \$\{selector\}\`);
                    break;
                }
            }
            
            if (eventElements.length === 0) {
                eventElements = $('[class*="event"], [class*="show"], [class*="party"]').filter(function() {
                    const text = $(this).text().toLowerCase();
                    return text.includes('2024') || text.includes('2025') || text.includes('party') || text.includes('show');
                });
            }
            
            eventElements.each((index, element) => {
                try {
                    const eventData = this.extractEventDetails($, element);
                    if (eventData && eventData.name) {
                        events.push(eventData);
                        console.log(\`✅ Extracted: \$\{eventData.name\}\`);
                    }
                } catch (error) {
                    console.error(\`❌ Error extracting event \$\{index + 1\}:\`, error.message);
                }
            });
            
            const uniqueEvents = this.removeDuplicateEvents(events);
            console.log(\`🎉 Successfully scraped \$\{uniqueEvents.length\} unique events from \$\{this.source\}\`);
            return uniqueEvents;
            
        } catch (error) {
            console.error(\`❌ Error scraping \$\{this.source\}:\`, error.message);
            return [];
        }
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            const key = \`\$\{event.name\}-\$\{event.date\}\`.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    async getEvents(startDate = null, endDate = null) {
        const events = await this.scrapeEvents();
        if (!startDate && !endDate) return events;
        
        return events.filter(event => {
            if (!event.date) return true;
            const eventDate = new Date(event.date);
            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            return true;
        });
    }
}

module.exports = ${className};`;

    return { template, fileName: `scrape-${fileName}.js` };
}

// Generate all scrapers
console.log('🏗️ Generating Montreal scrapers for all active URLs...');

const scrapersDir = './scrapers/cities/Montreal';
let generatedCount = 0;
let skippedCount = 0;

// Already created scrapers - skip these
const existingScrapers = [
    'placedesarts.com',
    'montrealsciencecentre.com', 
    'newcitygas.com',
    'vieuxmontreal.ca',
    'complexesky.com'
];

venueData.forEach(venue => {
    if (existingScrapers.some(existing => venue.url.includes(existing.split('.')[0]))) {
        console.log(`⏭️  Skipping ${venue.name} - already exists`);
        skippedCount++;
        return;
    }
    
    const { template, fileName } = generateScraperTemplate(venue);
    const filePath = path.join(scrapersDir, fileName);
    
    try {
        fs.writeFileSync(filePath, template);
        console.log(`✅ Generated: ${fileName} for ${venue.name}`);
        generatedCount++;
    } catch (error) {
        console.error(`❌ Error generating ${fileName}:`, error.message);
    }
});

console.log(`\n📊 Generation Summary:`);
console.log(`   Generated: ${generatedCount} new scrapers`);
console.log(`   Skipped: ${skippedCount} existing scrapers`);
console.log(`   Total venues: ${venueData.length}`);

// Generate updated test file
const testTemplate = `const fs = require('fs');
const path = require('path');

/**
 * Test all Montreal scrapers
 */
async function testAllMontrealScrapers() {
    console.log('🇨🇦 Testing ALL Montreal Event Scrapers...\\n');
    
    const scrapersDir = path.join(__dirname, 'scrapers/cities/Montreal');
    const scraperFiles = fs.readdirSync(scrapersDir).filter(file => file.endsWith('.js'));
    
    console.log(\`Found \${scraperFiles.length} scraper files\`);
    
    const results = [];
    
    for (const file of scraperFiles) {
        try {
            const ScraperClass = require(path.join(scrapersDir, file));
            const scraper = new ScraperClass();
            
            console.log(\`\\n\${'='.repeat(50)}\`);
            console.log(\`🎯 Testing \${scraper.source}...\`);
            console.log(\`\${'='.repeat(50)}\`);
            
            const startTime = Date.now();
            const events = await scraper.scrapeEvents();
            const endTime = Date.now();
            
            const result = {
                name: scraper.source,
                file: file,
                url: scraper.eventsUrl,
                eventsFound: events.length,
                duration: \`\${((endTime - startTime) / 1000).toFixed(2)}s\`,
                status: events.length > 0 ? '✅ Success' : '⚠️ No events found',
                sampleEvents: events.slice(0, 1)
            };
            
            results.push(result);
            
            console.log(\`📊 Results for \${scraper.source}:\`);
            console.log(\`   Events found: \${events.length}\`);
            console.log(\`   Duration: \${result.duration}\`);
            console.log(\`   Status: \${result.status}\`);
            
            if (events.length > 0) {
                console.log(\`   Sample: \${events[0].name}\`);
            }
            
        } catch (error) {
            console.error(\`❌ Error testing \${file}:\`, error.message);
            results.push({
                name: file.replace('.js', ''),
                file: file,
                eventsFound: 0,
                duration: '0s',
                status: \`❌ Error: \${error.message}\`,
                sampleEvents: []
            });
        }
    }
    
    // Print summary
    console.log(\`\\n\${'='.repeat(60)}\`);
    console.log(\`📊 ALL MONTREAL SCRAPERS SUMMARY\`);
    console.log(\`\${'='.repeat(60)}\`);
    
    let totalEvents = 0;
    let successfulScrapers = 0;
    
    results.forEach(result => {
        console.log(\`\\n🎯 \${result.name}:\`);
        console.log(\`   File: \${result.file}\`);
        console.log(\`   Events: \${result.eventsFound}\`);
        console.log(\`   Status: \${result.status}\`);
        
        totalEvents += result.eventsFound;
        if (result.eventsFound > 0) {
            successfulScrapers++;
        }
    });
    
    console.log(\`\\n\${'='.repeat(60)}\`);
    console.log(\`🎉 FINAL RESULTS:\`);
    console.log(\`   Total scrapers tested: \${results.length}\`);
    console.log(\`   Successful scrapers: \${successfulScrapers}\`);
    console.log(\`   Total events found: \${totalEvents}\`);
    console.log(\`   Success rate: \${((successfulScrapers / results.length) * 100).toFixed(1)}%\`);
    console.log(\`\${'='.repeat(60)}\`);
    
    return results;
}

// Run the test
if (require.main === module) {
    testAllMontrealScrapers()
        .then(results => {
            console.log('\\n✅ All Montreal scrapers test completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\\n❌ Error running Montreal scrapers test:', error);
            process.exit(1);
        });
}

module.exports = testAllMontrealScrapers;`;

fs.writeFileSync('./test-all-montreal-scrapers.js', testTemplate);
console.log('✅ Generated comprehensive test file: test-all-montreal-scrapers.js');

console.log('\n🎉 All Montreal scrapers generated successfully!');
