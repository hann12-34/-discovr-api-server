const fs = require('fs');
const path = require('path');

/**
 * Unified Canadian Event Scraper Management System
 * Manages and executes scrapers for all Canadian cities
 */
class CanadianEventScraperSystem {
    constructor() {
        this.citiesDir = path.join(__dirname, 'scrapers/cities');
        this.cities = this.discoverCities();
        this.scrapers = this.loadAllScrapers();
    }

    discoverCities() {
        return fs.readdirSync(this.citiesDir)
            .filter(item => {
                const cityPath = path.join(this.citiesDir, item);
                return fs.statSync(cityPath).isDirectory();
            })
            .sort();
    }

    loadAllScrapers() {
        const allScrapers = {};
        
        for (const city of this.cities) {
            const cityPath = path.join(this.citiesDir, city);
            const scraperFiles = fs.readdirSync(cityPath)
                .filter(file => file.endsWith('.js') && 
                       !file.includes('index') && 
                       !file.includes('template') &&
                       !file.includes('test'));
            
            allScrapers[city] = [];
            
            for (const file of scraperFiles) {
                try {
                    const ScraperClass = require(path.join(cityPath, file));
                    const scraper = new ScraperClass();
                    
                    allScrapers[city].push({
                        name: scraper.source || file.replace('.js', ''),
                        file: file,
                        url: scraper.eventsUrl || scraper.baseUrl,
                        scraper: scraper,
                        category: scraper.category || 'Entertainment'
                    });
                } catch (error) {
                    console.error(`❌ Error loading ${file} from ${city}:`, error.message);
                }
            }
        }
        
        return allScrapers;
    }

    async scrapeAllEvents(options = {}) {
        const {
            cities = this.cities,
            maxConcurrent = 5,
            includeCategories = null,
            excludeCategories = null,
            startDate = null,
            endDate = null
        } = options;

        console.log('🇨🇦 Starting comprehensive Canadian event scraping...');
        console.log(`Cities: ${cities.join(', ')}`);
        console.log(`Max concurrent: ${maxConcurrent}`);
        
        const allEvents = [];
        const scrapingResults = {
            totalScrapers: 0,
            successfulScrapers: 0,
            totalEvents: 0,
            byCity: {}
        };

        for (const city of cities) {
            if (!this.scrapers[city]) {
                console.log(`⚠️  No scrapers found for ${city}`);
                continue;
            }

            console.log(`\n🏙️  Scraping ${city.toUpperCase()} (${this.scrapers[city].length} venues)...`);
            
            const cityResults = {
                totalScrapers: this.scrapers[city].length,
                successfulScrapers: 0,
                totalEvents: 0,
                events: []
            };

            // Process scrapers in batches to avoid overwhelming servers
            const scrapers = this.scrapers[city].filter(scraperInfo => {
                if (includeCategories && !includeCategories.includes(scraperInfo.category)) return false;
                if (excludeCategories && excludeCategories.includes(scraperInfo.category)) return false;
                return true;
            });

            for (let i = 0; i < scrapers.length; i += maxConcurrent) {
                const batch = scrapers.slice(i, i + maxConcurrent);
                const batchPromises = batch.map(async (scraperInfo) => {
                    try {
                        console.log(`   🎯 ${scraperInfo.name}...`);
                        const events = await scraperInfo.scraper.getEvents(startDate, endDate);
                        
                        if (events && events.length > 0) {
                            console.log(`      ✅ ${events.length} events`);
                            cityResults.successfulScrapers++;
                            cityResults.totalEvents += events.length;
                            cityResults.events.push(...events);
                            return events;
                        } else {
                            console.log(`      ⚠️  No events`);
                            return [];
                        }
                    } catch (error) {
                        console.log(`      ❌ Error: ${error.message.substring(0, 50)}...`);
                        return [];
                    }
                });

                const batchResults = await Promise.all(batchPromises);
                allEvents.push(...batchResults.flat());
                
                // Small delay between batches
                if (i + maxConcurrent < scrapers.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            scrapingResults.byCity[city] = cityResults;
            scrapingResults.totalScrapers += cityResults.totalScrapers;
            scrapingResults.successfulScrapers += cityResults.successfulScrapers;
            scrapingResults.totalEvents += cityResults.totalEvents;

            console.log(`   📊 ${city}: ${cityResults.totalEvents} events from ${cityResults.successfulScrapers}/${cityResults.totalScrapers} scrapers`);
        }

        // Remove duplicates
        const uniqueEvents = this.removeDuplicateEvents(allEvents);
        
        console.log(`\n🎉 SCRAPING COMPLETE!`);
        console.log(`   Cities: ${cities.length}`);
        console.log(`   Total scrapers: ${scrapingResults.totalScrapers}`);
        console.log(`   Working scrapers: ${scrapingResults.successfulScrapers}`);
        console.log(`   Raw events: ${scrapingResults.totalEvents}`);
        console.log(`   Unique events: ${uniqueEvents.length}`);
        console.log(`   Success rate: ${((scrapingResults.successfulScrapers / scrapingResults.totalScrapers) * 100).toFixed(1)}%`);

        return {
            events: uniqueEvents,
            results: scrapingResults,
            summary: {
                totalEvents: uniqueEvents.length,
                totalScrapers: scrapingResults.totalScrapers,
                successfulScrapers: scrapingResults.successfulScrapers,
                successRate: ((scrapingResults.successfulScrapers / scrapingResults.totalScrapers) * 100).toFixed(1)
            }
        };
    }

    removeDuplicateEvents(events) {
        const seen = new Set();
        return events.filter(event => {
            if (!event || !event.name) return false;
            
            const key = `${event.name}-${event.date}-${event.venue?.name || 'unknown'}`.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    async scrapeByCity(city, options = {}) {
        return await this.scrapeAllEvents({ ...options, cities: [city] });
    }

    async scrapeByCategory(category, options = {}) {
        return await this.scrapeAllEvents({ ...options, includeCategories: [category] });
    }

    getScraperStats() {
        const stats = {
            totalCities: this.cities.length,
            cities: {},
            totalScrapers: 0,
            categoriesCount: {}
        };

        for (const [city, scrapers] of Object.entries(this.scrapers)) {
            stats.cities[city] = {
                total: scrapers.length,
                categories: {}
            };
            
            stats.totalScrapers += scrapers.length;
            
            for (const scraper of scrapers) {
                const category = scraper.category || 'Entertainment';
                stats.cities[city].categories[category] = (stats.cities[city].categories[category] || 0) + 1;
                stats.categoriesCount[category] = (stats.categoriesCount[category] || 0) + 1;
            }
        }

        return stats;
    }

    printSystemOverview() {
        const stats = this.getScraperStats();
        
        console.log('🇨🇦 CANADIAN EVENT SCRAPER SYSTEM OVERVIEW');
        console.log('=' .repeat(80));
        console.log(`Total Cities: ${stats.totalCities}`);
        console.log(`Total Scrapers: ${stats.totalScrapers}`);
        console.log('');
        
        console.log('📊 BY CITY:');
        for (const [city, cityStats] of Object.entries(stats.cities)) {
            console.log(`   🏙️  ${city}: ${cityStats.total} scrapers`);
            const topCategories = Object.entries(cityStats.categories)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3);
            console.log(`      Top categories: ${topCategories.map(([cat, count]) => `${cat} (${count})`).join(', ')}`);
        }
        
        console.log('\n📈 BY CATEGORY:');
        const sortedCategories = Object.entries(stats.categoriesCount)
            .sort(([,a], [,b]) => b - a);
        
        for (const [category, count] of sortedCategories) {
            console.log(`   🎯 ${category}: ${count} scrapers`);
        }
        
        console.log('=' .repeat(80));
    }
}

// Export the system
module.exports = CanadianEventScraperSystem;

// CLI functionality
if (require.main === module) {
    const system = new CanadianEventScraperSystem();
    
    const command = process.argv[2];
    
    if (command === 'overview') {
        system.printSystemOverview();
    } else if (command === 'scrape') {
        const city = process.argv[3];
        if (city && system.cities.includes(city)) {
            system.scrapeByCity(city).then(results => {
                console.log(`\\n✅ Completed scraping ${city}: ${results.events.length} events`);
            });
        } else {
            system.scrapeAllEvents().then(results => {
                console.log(`\\n✅ Completed scraping all cities: ${results.events.length} events`);
            });
        }
    } else {
        console.log('🇨🇦 Canadian Event Scraper System');
        console.log('Usage:');
        console.log('  node canadian-event-scraper-system.js overview  - Show system overview');
        console.log('  node canadian-event-scraper-system.js scrape    - Scrape all cities');
        console.log('  node canadian-event-scraper-system.js scrape [city] - Scrape specific city');
        system.printSystemOverview();
    }
}
