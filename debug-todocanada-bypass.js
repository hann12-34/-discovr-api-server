/**
 * Debug TodoCanada 403 blocking and find bypass methods
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function testDifferentApproaches() {
    const urls = [
        'https://www.todocanada.ca/city/vancouver/events',
        'https://www.todocanada.ca/city/toronto/events'
    ];

    for (const url of urls) {
        console.log(`\n🔍 Testing different approaches for: ${url}`);
        
        // Approach 1: Different User Agents
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
        ];

        for (let i = 0; i < userAgents.length; i++) {
            try {
                console.log(`   Trying User Agent ${i + 1}...`);
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': userAgents[i],
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Cache-Control': 'max-age=0'
                    },
                    timeout: 15000
                });
                
                console.log(`   ✅ SUCCESS with User Agent ${i + 1}! Status: ${response.status}`);
                console.log(`   📄 Content Length: ${response.data.length} characters`);
                
                // Check if we got actual content
                const $ = cheerio.load(response.data);
                const title = $('title').text();
                console.log(`   📝 Page Title: ${title}`);
                
                // Look for event-related content
                const eventElements = $('[class*="event"], [class*="Event"], .card, .item, .listing').length;
                console.log(`   🎪 Potential event elements found: ${eventElements}`);
                
                if (eventElements > 0) {
                    console.log(`   🎉 Found potential events! This approach works.`);
                    return { url, userAgent: userAgents[i], success: true };
                }
                
                break; // If we get here, the request succeeded
                
            } catch (error) {
                console.log(`   ❌ Failed with User Agent ${i + 1}: ${error.message}`);
                if (error.response) {
                    console.log(`      Status: ${error.response.status}`);
                }
            }
        }

        // Approach 2: Try with delays and different headers
        try {
            console.log(`   Trying with delay and referrer...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://www.google.com/',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 15000
            });
            
            console.log(`   ✅ SUCCESS with referrer approach! Status: ${response.status}`);
            const $ = cheerio.load(response.data);
            const title = $('title').text();
            console.log(`   📝 Page Title: ${title}`);
            
        } catch (error) {
            console.log(`   ❌ Failed with referrer approach: ${error.message}`);
        }

        // Approach 3: Try the main page first, then events
        try {
            console.log(`   Trying main page first approach...`);
            const mainUrl = url.replace('/events', '');
            
            const mainResponse = await axios.get(mainUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 10000
            });
            
            console.log(`   ✅ Main page accessible! Status: ${mainResponse.status}`);
            
            // Now try events page with cookies if any
            const cookies = mainResponse.headers['set-cookie'];
            const eventResponse = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': mainUrl,
                    'Cookie': cookies ? cookies.join('; ') : ''
                },
                timeout: 10000
            });
            
            console.log(`   ✅ SUCCESS with main page first! Status: ${eventResponse.status}`);
            
        } catch (error) {
            console.log(`   ❌ Failed with main page first: ${error.message}`);
        }
    }
}

testDifferentApproaches().catch(console.error);
