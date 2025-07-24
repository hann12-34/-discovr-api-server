const fs = require('fs');
const path = require('path');

async function testTorontoScrapers() {
    console.log('🏙️ Testing Toronto Event Scrapers');
    console.log('=' .repeat(60));
    
    const scrapersDir = path.join(__dirname, 'scrapers/cities/Toronto');
    const scraperFiles = fs.readdirSync(scrapersDir)
        .filter(file => file.startsWith('scrape-') && file.endsWith('.js'))
        .sort();
    
    console.log(`📁 Found ${scraperFiles.length} Toronto scrapers`);
    
    const results = [];
    let successCount = 0;
    let totalEvents = 0;
    
    for (const file of scraperFiles.slice(0, 10)) { // Test first 10 scrapers
        const scraperPath = path.join(scrapersDir, file);
        const scraperName = file.replace('scrape-', '').replace('.js', '');
        
        console.log(`\n🔍 Testing ${scraperName}...`);
        
        try {
            const ScraperClass = require(scraperPath);
            
            if (typeof ScraperClass === 'function') {
                const scraper = new ScraperClass();
                
                if (typeof scraper.scrapeEvents === 'function') {
                    const events = await scraper.scrapeEvents();
                    const eventCount = events.length;
                    totalEvents += eventCount;
                    
                    if (eventCount > 0) {
                        successCount++;
                        console.log(`✅ ${scraperName}: ${eventCount} live events`);
                        results.push({ name: scraperName, events: eventCount, status: 'success' });
                    } else {
                        console.log(`⚪ ${scraperName}: 0 live events (filtered correctly)`);
                        results.push({ name: scraperName, events: 0, status: 'no_events' });
                    }
                } else {
                    console.log(`❌ ${scraperName}: Not class-based (no scrapeEvents method)`);
                    results.push({ name: scraperName, events: 0, status: 'not_class_based' });
                }
            } else {
                console.log(`❌ ${scraperName}: Not a proper class export`);
                results.push({ name: scraperName, events: 0, status: 'not_class' });
            }
        } catch (error) {
            console.log(`❌ ${scraperName}: Error - ${error.message}`);
            results.push({ name: scraperName, events: 0, status: 'error', error: error.message });
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TORONTO SCRAPERS TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`🏙️ Total scrapers tested: ${results.length}`);
    console.log(`✅ Scrapers with events: ${successCount}`);
    console.log(`📅 Total live events found: ${totalEvents}`);
    console.log(`🎯 Success rate: ${((successCount / results.length) * 100).toFixed(1)}%`);
    
    // Group by status
    const statusCounts = results.reduce((acc, result) => {
        acc[result.status] = (acc[result.status] || 0) + 1;
        return acc;
    }, {});
    
    console.log('\n📋 Status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
        const emoji = {
            'success': '✅',
            'no_events': '⚪',
            'not_class_based': '🔄',
            'not_class': '❌',
            'error': '❌'
        }[status] || '❓';
        console.log(`${emoji} ${status}: ${count}`);
    });
    
    // Show scrapers that need fixing
    const needsFixing = results.filter(r => r.status === 'not_class_based' || r.status === 'error');
    if (needsFixing.length > 0) {
        console.log('\n🔧 Scrapers needing refactoring:');
        needsFixing.forEach(scraper => {
            console.log(`   • ${scraper.name}`);
        });
    }
}

if (require.main === module) {
    testTorontoScrapers().catch(console.error);
}

module.exports = { testTorontoScrapers };
