/**
 * Debug the HTML structure of Toronto event sites
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function debugSites() {
    const sites = [
        {
            name: 'City of Toronto',
            url: 'https://www.toronto.ca/explore-enjoy/festivals-events/festivals-events-calendar/'
        },
        {
            name: 'Now Playing Toronto',
            url: 'https://nowplayingtoronto.com/categories/special-events/'
        },
        {
            name: 'TodoCanada Toronto',
            url: 'https://www.todocanada.ca/city/toronto/events/'
        }
    ];
    
    for (const site of sites) {
        console.log(`\n🔍 Debugging ${site.name}...`);
        console.log(`📡 URL: ${site.url}`);
        
        try {
            const response = await axios.get(site.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 10000
            });
            
            console.log(`✅ Status: ${response.status}`);
            console.log(`📄 Content Length: ${response.data.length} characters`);
            
            const $ = cheerio.load(response.data);
            
            // Look for common event-related elements
            const commonSelectors = [
                '.event',
                '.event-item',
                '.event-card',
                '.listing',
                '.post',
                'article',
                '.entry',
                '[class*="event"]',
                '[class*="listing"]'
            ];
            
            console.log('\n🔎 Checking common selectors:');
            for (const selector of commonSelectors) {
                const count = $(selector).length;
                if (count > 0) {
                    console.log(`   ${selector}: ${count} elements found`);
                    
                    // Show sample element structure
                    const sample = $(selector).first();
                    const classes = sample.attr('class');
                    const text = sample.text().trim().substring(0, 100);
                    console.log(`      Sample classes: ${classes}`);
                    console.log(`      Sample text: ${text}...`);
                }
            }
            
            // Look for title elements
            console.log('\n📝 Title elements:');
            const titleSelectors = ['h1', 'h2', 'h3', '.title', '[class*="title"]'];
            for (const selector of titleSelectors) {
                const count = $(selector).length;
                if (count > 0) {
                    console.log(`   ${selector}: ${count} elements`);
                    const sampleText = $(selector).first().text().trim().substring(0, 50);
                    if (sampleText) {
                        console.log(`      Sample: "${sampleText}..."`);
                    }
                }
            }
            
            // Look for date elements
            console.log('\n📅 Date elements:');
            const dateSelectors = ['.date', '[class*="date"]', '.time', '[class*="time"]'];
            for (const selector of dateSelectors) {
                const count = $(selector).length;
                if (count > 0) {
                    console.log(`   ${selector}: ${count} elements`);
                    const sampleText = $(selector).first().text().trim().substring(0, 50);
                    if (sampleText) {
                        console.log(`      Sample: "${sampleText}..."`);
                    }
                }
            }
            
        } catch (error) {
            console.error(`❌ Error debugging ${site.name}:`, error.message);
            
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Headers:`, Object.keys(error.response.headers));
            }
        }
        
        console.log('─'.repeat(60));
    }
}

debugSites().catch(console.error);
