const axios = require('axios');
const cheerio = require('cheerio');

async function testEventUrl(venueName, url, selectors = ['h1', 'h2', 'h3', 'h4']) {
    console.log(`\n🔍 TESTING ${venueName.toUpperCase()}`);
    console.log(`📡 URL: ${url}`);
    
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'max-age=0',
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'Referer': 'https://www.google.com/',
                'DNT': '1',
                'Connection': 'keep-alive'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        
        console.log(`✅ Status: ${response.status}`);
        console.log(`📊 Content Length: ${response.data.length} characters`);
        
        // Check for potential event headings
        console.log('\n🎯 EVENT-LIKE HEADINGS:');
        selectors.forEach(selector => {
            $(selector).each((i, el) => {
                const text = $(el).text().trim();
                if (text && text.length > 3 && i < 10) {
                    // Look for event-like keywords
                    const eventKeywords = ['concert', 'show', 'tour', 'live', 'performance', 'event', 'music', 'artist'];
                    const isEventLike = eventKeywords.some(keyword => 
                        text.toLowerCase().includes(keyword) && 
                        !text.toLowerCase().includes('menu') && 
                        !text.toLowerCase().includes('search') &&
                        !text.toLowerCase().includes('newsletter')
                    );
                    
                    const marker = isEventLike ? '🎵' : '  ';
                    console.log(`${marker} ${selector}[${i}]: ${text.substring(0, 80)}`);
                }
            });
        });
        
        // Look for event links
        const eventLinks = $('a[href*="event"], a[href*="show"], a[href*="concert"]').length;
        if (eventLinks > 0) {
            console.log(`\n🔗 Found ${eventLinks} event-related links`);
        }
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

async function main() {
    console.log('🎭 TESTING ALTERNATIVE EVENT URLs');
    console.log('🎯 Goal: Find pages with actual concert event data\n');
    
    // Test different URL patterns for each venue
    const venueTests = [
        // Bowery Ballroom alternatives
        { name: 'Bowery Ballroom', url: 'https://www.boweryballroom.com' },
        { name: 'Bowery Ballroom /events', url: 'https://www.boweryballroom.com/events' },
        { name: 'Bowery Ballroom /calendar', url: 'https://www.boweryballroom.com/calendar' },
        { name: 'Bowery Ballroom /shows', url: 'https://www.boweryballroom.com/shows' },
        
        // Webster Hall alternatives
        { name: 'Webster Hall', url: 'https://www.websterhall.com' },
        { name: 'Webster Hall /events', url: 'https://www.websterhall.com/events' },
        { name: 'Webster Hall /calendar', url: 'https://www.websterhall.com/calendar' },
        { name: 'Webster Hall /shows', url: 'https://www.websterhall.com/shows' },
        
        // Lincoln Center alternatives  
        { name: 'Lincoln Center', url: 'https://www.lincolncenter.org' },
        { name: 'Lincoln Center /events', url: 'https://www.lincolncenter.org/events' },
        { name: 'Lincoln Center /calendar', url: 'https://www.lincolncenter.org/calendar' },
        { name: 'Lincoln Center /whats-on', url: 'https://www.lincolncenter.org/whats-on' }
    ];
    
    for (const test of venueTests) {
        await testEventUrl(test.name, test.url);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
    
    console.log('\n✅ Alternative URL testing complete!');
}

main();
