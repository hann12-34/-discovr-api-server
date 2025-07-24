/**
 * Debug TodoCanada HTML structure to understand event data
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function analyzeStructure() {
    const urls = [
        'https://www.todocanada.ca/city/vancouver/events',
        'https://www.todocanada.ca/city/toronto/events'
    ];

    // Working User Agent (Firefox)
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';

    for (const url of urls) {
        console.log(`\n🔍 Analyzing structure for: ${url}`);
        
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 15000
            });
            
            const $ = cheerio.load(response.data);
            
            console.log(`✅ Successfully loaded page`);
            console.log(`📝 Title: ${$('title').text()}`);
            
            // Look for common event container patterns
            const selectors = [
                '.event',
                '.Event',
                '[class*="event"]',
                '[class*="Event"]',
                '.card',
                '.item',
                '.listing',
                '.post',
                '.entry',
                'article',
                '[data-event]',
                '.event-item',
                '.event-card',
                '.event-listing'
            ];
            
            console.log(`\n🎪 Event container analysis:`);
            for (const selector of selectors) {
                const elements = $(selector);
                if (elements.length > 0) {
                    console.log(`   ${selector}: ${elements.length} elements found`);
                    
                    // Analyze first few elements
                    elements.slice(0, 3).each((i, el) => {
                        const $el = $(el);
                        const classes = $el.attr('class') || '';
                        const text = $el.text().trim().substring(0, 100);
                        console.log(`     Element ${i + 1}: classes="${classes}", text="${text}..."`);
                    });
                }
            }
            
            // Look for specific event data patterns
            console.log(`\n📅 Looking for event data patterns:`);
            
            // Dates
            const datePatterns = [
                '[class*="date"]',
                '[class*="Date"]',
                '[class*="time"]',
                '[class*="Time"]',
                '.when',
                '.datetime'
            ];
            
            datePatterns.forEach(pattern => {
                const elements = $(pattern);
                if (elements.length > 0) {
                    console.log(`   Date pattern "${pattern}": ${elements.length} elements`);
                    elements.slice(0, 2).each((i, el) => {
                        console.log(`     "${$(el).text().trim()}"`);
                    });
                }
            });
            
            // Titles/Names
            const titlePatterns = [
                'h1', 'h2', 'h3', 'h4',
                '[class*="title"]',
                '[class*="Title"]',
                '[class*="name"]',
                '[class*="Name"]',
                '.event-title',
                '.event-name'
            ];
            
            console.log(`\n📝 Title patterns:`);
            titlePatterns.forEach(pattern => {
                const elements = $(pattern);
                if (elements.length > 0 && elements.length < 50) { // Avoid too many generic elements
                    console.log(`   Title pattern "${pattern}": ${elements.length} elements`);
                    elements.slice(0, 3).each((i, el) => {
                        const text = $(el).text().trim();
                        if (text.length > 5 && text.length < 100) {
                            console.log(`     "${text}"`);
                        }
                    });
                }
            });
            
            // Locations
            const locationPatterns = [
                '[class*="location"]',
                '[class*="Location"]',
                '[class*="venue"]',
                '[class*="Venue"]',
                '[class*="address"]',
                '[class*="Address"]',
                '.where'
            ];
            
            console.log(`\n📍 Location patterns:`);
            locationPatterns.forEach(pattern => {
                const elements = $(pattern);
                if (elements.length > 0) {
                    console.log(`   Location pattern "${pattern}": ${elements.length} elements`);
                    elements.slice(0, 2).each((i, el) => {
                        console.log(`     "${$(el).text().trim()}"`);
                    });
                }
            });
            
            // Look for JSON-LD structured data
            const jsonLd = $('script[type="application/ld+json"]');
            if (jsonLd.length > 0) {
                console.log(`\n🔍 Found ${jsonLd.length} JSON-LD scripts`);
                jsonLd.each((i, el) => {
                    try {
                        const data = JSON.parse($(el).html());
                        console.log(`   JSON-LD ${i + 1}:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
                    } catch (e) {
                        console.log(`   JSON-LD ${i + 1}: Parse error`);
                    }
                });
            }
            
        } catch (error) {
            console.error(`❌ Error analyzing ${url}:`, error.message);
        }
    }
}

analyzeStructure().catch(console.error);
