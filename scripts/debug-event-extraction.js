/**
 * DEBUG EVENT EXTRACTION: Analyze Website Structure
 * 
 * Investigates why all Toronto scrapers return 0 events by analyzing
 * the actual HTML structure and content from target websites.
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Set MongoDB URI to avoid connection errors
process.env.MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

async function debugEventExtraction() {
    console.log('\n🔍 DEBUGGING EVENT EXTRACTION FOR TORONTO SCRAPERS');
    console.log('=' .repeat(60));
    console.log('🎯 Goal: Find out why scrapers return 0 events');
    
    // Test a few key venues to see what's happening
    const testVenues = [
        {
            name: 'AGO (Art Gallery of Ontario)',
            url: 'https://ago.ca/exhibitions-and-events/',
            selectors: ['.event-item', '.exhibition-item', '.event', '.exhibition', 'article', '.card']
        },
        {
            name: 'ROM (Royal Ontario Museum)', 
            url: 'https://www.rom.on.ca/en/exhibitions-galleries',
            selectors: ['.event-item', '.exhibition-item', '.event', '.exhibition', 'article', '.card']
        },
        {
            name: 'Casa Loma',
            url: 'https://casaloma.ca/visit/events/',
            selectors: ['.event-item', '.event', '.card', 'article', '.post']
        }
    ];
    
    for (const venue of testVenues) {
        console.log(`\n🏛️ TESTING: ${venue.name}`);
        console.log(`📍 URL: ${venue.url}`);
        
        try {
            console.log('   📡 Fetching webpage...');
            const { data, status } = await axios.get(venue.url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            
            console.log(`   ✅ Response: ${status} (${data.length} chars)`);
            
            const $ = cheerio.load(data);
            
            // Test each selector to see what we find
            console.log('   🔍 Testing selectors:');
            for (const selector of venue.selectors) {
                const elements = $(selector);
                console.log(`      ${selector}: ${elements.length} elements`);
                
                if (elements.length > 0) {
                    // Show some sample content
                    elements.slice(0, 3).each((i, el) => {
                        const text = $(el).text().trim().substring(0, 100);
                        console.log(`         [${i + 1}] ${text}...`);
                    });
                }
            }
            
            // Look for event-related keywords in the HTML
            console.log('   🔍 Searching for event indicators in HTML:');
            const eventKeywords = ['event', 'exhibition', 'show', 'concert', 'performance'];
            eventKeywords.forEach(keyword => {
                const count = (data.match(new RegExp(keyword, 'gi')) || []).length;
                console.log(`      "${keyword}": ${count} mentions`);
            });
            
            // Look for common class patterns
            console.log('   🔍 Common classes in HTML:');
            const classMatches = data.match(/class="([^"]+)"/g) || [];
            const classFreq = {};
            classMatches.forEach(match => {
                const classes = match.replace(/class="([^"]+)"/, '$1').split(' ');
                classes.forEach(cls => {
                    if (cls && cls.length > 3) {
                        classFreq[cls] = (classFreq[cls] || 0) + 1;
                    }
                });
            });
            
            const topClasses = Object.entries(classFreq)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);
            
            topClasses.forEach(([cls, count]) => {
                console.log(`      .${cls}: ${count} uses`);
            });
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                console.log('      🌐 Network/DNS issue - site may be down or blocking requests');
            } else if (error.response && error.response.status) {
                console.log(`      📡 HTTP ${error.response.status}: ${error.response.statusText}`);
            }
        }
    }
    
    console.log('\n📊 ANALYSIS SUMMARY:');
    console.log('🔍 Next steps based on findings:');
    console.log('   1. Update selectors if sites have changed HTML structure');
    console.log('   2. Handle different response formats (JSON, different HTML)');
    console.log('   3. Add user-agent headers if sites are blocking requests');
    console.log('   4. Check if sites require authentication or have anti-bot measures');
    
    return true;
}

// Run event extraction debugging
debugEventExtraction()
    .then(() => {
        console.log('\n🏁 Event extraction debugging complete!');
        console.log('📊 Use findings to update scraper selectors and logic');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Debug failed:', error.message);
        process.exit(1);
    });
