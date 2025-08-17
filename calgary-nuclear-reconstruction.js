#!/usr/bin/env node

/**
 * Calgary Nuclear Reconstruction Script
 * Applies Vancouver template to reconstruct all Calgary scrapers
 */

const fs = require('fs');
const path = require('path');

const CALGARY_SCRAPERS_DIR = path.join(__dirname, 'scrapers', 'cities', 'Calgary');

// Calgary venue mapping for reconstruction
const CALGARY_VENUES = {
    'scrape-arts-commons.js': { name: 'Arts Commons', url: 'https://www.artscommons.ca', category: 'Theater & Arts' },
    'scrape-saddledome.js': { name: 'Scotiabank Saddledome', url: 'https://www.saddledome.com', category: 'Sports & Entertainment' },
    'scrape-stampede.js': { name: 'Calgary Stampede', url: 'https://www.calgarystampede.com', category: 'Festivals & Events' },
    'scrape-calgary-zoo.js': { name: 'Calgary Zoo', url: 'https://www.calgaryzoo.com', category: 'Family & Entertainment' },
    'scrape-telus-spark.js': { name: 'TELUS Spark Science Centre', url: 'https://www.sparkscience.ca', category: 'Educational' },
    'scrape-glenbow-museum.js': { name: 'Glenbow Museum', url: 'https://www.glenbow.org', category: 'Museums & Culture' },
    'scrape-heritage-park.js': { name: 'Heritage Park Historical Village', url: 'https://www.heritagepark.ca', category: 'Historical & Educational' },
    'scrape-calgary-tower.js': { name: 'Calgary Tower', url: 'https://www.calgarytower.com', category: 'Tourist Attractions' },
    'scrape-studio-bell.js': { name: 'Studio Bell - National Music Centre', url: 'https://www.nmc.ca', category: 'Music & Culture' }
};

function generateCalgaryScraperTemplate(fileName, venue) {
    const className = fileName
        .replace('scrape-', '')
        .replace('.js', '')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('') + 'Events';

    return `const puppeteer = require('puppeteer');
const slugify = require('slugify');

/**
 * ${venue.name} Events Scraper
 * Scrapes events from ${venue.name}
 * URL: ${venue.url}
 */
class ${className} {
    constructor() {
        this.venueName = '${venue.name}';
        this.venueUrl = '${venue.url}';
        this.category = '${venue.category}';
        this.city = 'Calgary';
        this.province = 'AB';
        this.venue = {
            name: this.venueName,
            address: 'Calgary, AB, Canada',
            city: this.city,
            province: this.province,
            coordinates: { lat: 51.0447, lon: -114.0719 }
        };
    }

    /**
     * Generate unique event ID using slugify
     */
    generateEventId(eventTitle, date) {
        const dateStr = date ? new Date(date).toISOString().split('T')[0] : 'no-date';
        const titleSlug = slugify(eventTitle, { lower: true, strict: true });
        const venueSlug = slugify(this.venueName, { lower: true, strict: true });
        return \`\${venueSlug}-\${titleSlug}-\${dateStr}\`;
    }

    /**
     * Main scraping method
     */
    async scrape() {
        console.log(\`🎭 Scraping events from \${this.venueName}...\`);
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            await page.goto(this.venueUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            const events = await page.evaluate(() => {
                const eventElements = document.querySelectorAll([
                    '.event', '.event-item', '.event-card',
                    '[class*="event"]', '[class*="show"]', '[class*="performance"]',
                    'article', '.post', '.listing', '.item'
                ].join(', '));

                return Array.from(eventElements).slice(0, 50).map(element => {
                    const titleSelectors = [
                        'h1', 'h2', 'h3', 'h4', '.title', '.name', '.event-title',
                        '[class*="title"]', '[class*="name"]', '[class*="heading"]'
                    ];
                    
                    const dateSelectors = [
                        '.date', '.time', '.when', '[class*="date"]', 
                        '[class*="time"]', 'time', '[datetime]'
                    ];

                    let title = 'Event';
                    let date = null;
                    let description = '';

                    for (const selector of titleSelectors) {
                        const titleElement = element.querySelector(selector);
                        if (titleElement && titleElement.textContent.trim()) {
                            title = titleElement.textContent.trim();
                            break;
                        }
                    }

                    for (const selector of dateSelectors) {
                        const dateElement = element.querySelector(selector);
                        if (dateElement) {
                            const dateText = dateElement.textContent.trim() || 
                                           dateElement.getAttribute('datetime') || 
                                           dateElement.getAttribute('title');
                            if (dateText) {
                                date = dateText;
                                break;
                            }
                        }
                    }

                    const descElement = element.querySelector('p, .description, .summary, [class*="desc"]');
                    if (descElement) {
                        description = descElement.textContent.trim();
                    }

                    return { title, date, description };
                }).filter(event => event.title && event.title !== 'Event');
            });

            const formattedEvents = events.map(event => ({
                id: this.generateEventId(event.title, event.date),
                title: event.title,
                date: event.date,
                time: null,
                description: event.description || \`Event at \${this.venueName}\`,
                venue: this.venue,
                category: this.category,
                price: null,
                url: this.venueUrl,
                source: this.venueName,
                city: this.city,
                province: this.province
            }));

            console.log(\`✅ Found \${formattedEvents.length} events from \${this.venueName}\`);
            return formattedEvents;

        } catch (error) {
            console.error(\`❌ Error scraping \${this.venueName}:\`, error.message);
            return [];
        } finally {
            await browser.close();
        }
    }
}

module.exports = ${className};`;
}

function reconstructCalgaryScrapers() {
    console.log('🚀 Starting Calgary Nuclear Reconstruction...\n');
    
    let reconstructed = 0;
    let total = 0;

    for (const [fileName, venue] of Object.entries(CALGARY_VENUES)) {
        const filePath = path.join(CALGARY_SCRAPERS_DIR, fileName);
        total++;
        
        try {
            const cleanScraperCode = generateCalgaryScraperTemplate(fileName, venue);
            fs.writeFileSync(filePath, cleanScraperCode, 'utf8');
            console.log(`✅ Reconstructed ${fileName}`);
            reconstructed++;
        } catch (error) {
            console.error(`❌ Failed to reconstruct ${fileName}:`, error.message);
        }
    }

    console.log(`\n🎉 Calgary Nuclear Reconstruction Complete!`);
    console.log(`📊 Reconstructed: ${reconstructed}/${total} priority scrapers`);
    
    // Test reconstructed scrapers
    console.log(`\n🧪 Testing reconstructed scrapers...`);
    for (const fileName of Object.keys(CALGARY_VENUES)) {
        try {
            delete require.cache[require.resolve(path.join(CALGARY_SCRAPERS_DIR, fileName))];
            const ScraperClass = require(path.join(CALGARY_SCRAPERS_DIR, fileName));
            const scraper = new ScraperClass();
            console.log(`✅ ${fileName} loads successfully`);
        } catch (error) {
            console.error(`❌ ${fileName} error:`, error.message);
        }
    }
}

if (require.main === module) {
    reconstructCalgaryScrapers();
}

module.exports = { reconstructCalgaryScrapers };
