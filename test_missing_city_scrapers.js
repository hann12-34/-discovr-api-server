const fs = require('fs');
const path = require('path');

// Test if Calgary, Montreal, and NYC scrapers are loading and working
async function testMissingCityScrapers() {
    console.log('🔍 TESTING CALGARY, MONTREAL, AND NYC SCRAPERS...\n');
    
    const cities = ['Calgary', 'Montreal', 'New York'];
    
    for (const city of cities) {
        console.log(`\n🏙️  TESTING ${city.toUpperCase()} SCRAPERS:`);
        console.log('='.repeat(50));
        
        const cityPath = path.join(__dirname, 'scrapers', 'cities', city);
        
        if (!fs.existsSync(cityPath)) {
            console.log(`❌ Directory does not exist: ${cityPath}`);
            continue;
        }
        
        // Check if index.js exists
        const indexPath = path.join(cityPath, 'index.js');
        if (!fs.existsSync(indexPath)) {
            console.log(`❌ index.js missing for ${city}`);
            continue;
        }
        
        console.log(`✅ Found index.js for ${city}`);
        
        try {
            // Try to require the city's scrapers
            console.log(`📝 Attempting to load ${city} scrapers...`);
            const cityScrapers = require(indexPath);
            
            console.log(`📊 Successfully loaded ${city} scrapers module`);
            console.log(`📊 Type: ${typeof cityScrapers}`);
            console.log(`📊 Keys: ${Object.keys(cityScrapers || {})}`);
            
            if (Array.isArray(cityScrapers)) {
                console.log(`📊 ${city} has ${cityScrapers.length} scrapers`);
                
                // Test first scraper
                if (cityScrapers.length > 0) {
                    const firstScraper = cityScrapers[0];
                    console.log(`🧪 Testing first scraper: ${firstScraper.constructor?.name || 'Unknown'}`);
                    
                    // Try to run scrape method
                    if (firstScraper && typeof firstScraper.scrape === 'function') {
                        console.log(`✅ First scraper has scrape method`);
                        
                        try {
                            const timeout = setTimeout(() => {
                                console.log(`⏰ First scraper test timeout (10s)`);
                            }, 10000);
                            
                            const testResult = await Promise.race([
                                firstScraper.scrape(),
                                new Promise((_, reject) => 
                                    setTimeout(() => reject(new Error('Timeout')), 10000)
                                )
                            ]);
                            
                            clearTimeout(timeout);
                            
                            console.log(`✅ First scraper returned: ${Array.isArray(testResult) ? testResult.length + ' events' : typeof testResult}`);
                            
                            if (Array.isArray(testResult) && testResult.length > 0) {
                                console.log(`📝 Sample event: ${JSON.stringify(testResult[0], null, 2).slice(0, 200)}...`);
                            }
                            
                        } catch (error) {
                            console.log(`❌ First scraper test failed: ${error.message}`);
                        }
                    } else {
                        console.log(`❌ First scraper missing scrape method`);
                    }
                }
            } else {
                console.log(`❌ ${city} scrapers is not an array: ${typeof cityScrapers}`);
            }
            
        } catch (error) {
            console.log(`❌ Failed to load ${city} scrapers: ${error.message}`);
            console.log(`❌ Stack trace: ${error.stack?.split('\n')[1]}`);
        }
    }
    
    console.log('\n🔍 CHECKING MAIN CITIES INDEX...\n');
    
    try {
        const mainCitiesIndex = path.join(__dirname, 'scrapers', 'cities', 'index.js');
        if (fs.existsSync(mainCitiesIndex)) {
            console.log('✅ Main cities/index.js exists');
            
            const citiesConfig = require(mainCitiesIndex);
            console.log(`📊 Cities config type: ${typeof citiesConfig}`);
            console.log(`📊 Cities config keys: ${Object.keys(citiesConfig || {})}`);
            
            if (citiesConfig.getCityScrapers) {
                console.log('✅ getCityScrapers function exists');
                
                for (const city of cities) {
                    try {
                        const scrapers = citiesConfig.getCityScrapers(city);
                        console.log(`📊 ${city}: getCityScrapers returned ${Array.isArray(scrapers) ? scrapers.length + ' scrapers' : typeof scrapers}`);
                    } catch (error) {
                        console.log(`❌ ${city}: getCityScrapers failed: ${error.message}`);
                    }
                }
            }
        } else {
            console.log('❌ Main cities/index.js does not exist');
        }
        
    } catch (error) {
        console.log(`❌ Failed to load main cities index: ${error.message}`);
    }
}

testMissingCityScrapers().catch(console.error);
