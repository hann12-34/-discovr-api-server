const axios = require('axios');
const cheerio = require('cheerio');

async function analyzeVenue(name, url) {
    console.log(`\n🔍 ANALYZING ${name.toUpperCase()}`);
    console.log('='.repeat(50));
    console.log(`📡 URL: ${url}`);
    
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        // Analyze different selector patterns
        console.log('\n📊 ELEMENT COUNT ANALYSIS:');
        
        const selectors = {
            'h1': $('h1').length,
            'h2': $('h2').length, 
            'h3': $('h3').length,
            'h4': $('h4').length,
            'h5': $('h5').length,
            '.event*': $('[class*="event"]').length,
            '.show*': $('[class*="show"]').length,
            '.concert*': $('[class*="concert"]').length,
            'event links': $('a[href*="event"]').length,
            'show links': $('a[href*="show"]').length
        };
        
        Object.entries(selectors).forEach(([selector, count]) => {
            if (count > 0) {
                console.log(`  ${selector}: ${count} elements`);
            }
        });
        
        // Sample some key headings
        console.log('\n🎯 SAMPLE HEADINGS:');
        ['h1', 'h2', 'h3', 'h4'].forEach(tag => {
            $(tag).each((i, el) => {
                if (i < 5) { // Limit to first 5
                    const text = $(el).text().trim().substring(0, 100);
                    if (text && text.length > 3) {
                        console.log(`  ${tag}[${i}]: ${text}`);
                    }
                }
            });
        });
        
        // Look for event-like content
        console.log('\n🎪 EVENT-LIKE ELEMENTS:');
        $('[class*="event"], [class*="show"], [class*="concert"]').each((i, el) => {
            if (i < 5) {
                const className = $(el).attr('class') || '';
                const text = $(el).text().trim().substring(0, 100);
                console.log(`  [${i}] class="${className}": ${text}`);
            }
        });
        
    } catch (error) {
        console.error(`❌ Error analyzing ${name}:`, error.message);
    }
}

async function main() {
    console.log('🎭 VENUE HTML STRUCTURE ANALYSIS');
    console.log('🎯 Goal: Find custom selectors for each venue\n');
    
    await analyzeVenue('Lincoln Center', 'https://www.lincolncenter.org');
    await analyzeVenue('Bowery Ballroom', 'https://www.boweryballroom.com');
    await analyzeVenue('Webster Hall', 'https://www.websterhall.com');
    
    console.log('\n✅ Analysis complete!');
}

main();
