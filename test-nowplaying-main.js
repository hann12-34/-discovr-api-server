/**
 * Test the main Now Playing Toronto events page
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function testMainPage() {
    console.log('🔍 Testing main Now Playing Toronto events page...');
    
    const urls = [
        'https://nowplayingtoronto.com/',
        'https://nowplayingtoronto.com/events/',
        'https://nowplayingtoronto.com/categories/festivals-special-events/',
        'https://nowplayingtoronto.com/event/'
    ];
    
    for (const url of urls) {
        try {
            console.log(`\n📄 Testing: ${url}`);
            
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 10000
            });
            
            const $ = cheerio.load(response.data);
            
            console.log(`Status: ${response.status}`);
            console.log(`Title: ${$('title').text()}`);
            console.log(`Content length: ${response.data.length} characters`);
            
            // Look for any event listings
            const eventLinks = $('a').filter(function() {
                const href = $(this).attr('href') || '';
                const text = $(this).text().toLowerCase();
                return (href.includes('/event/') || href.includes('/show/') || 
                       text.includes('event') || text.includes('show')) && 
                       text.length > 5 && text.length < 100;
            });
            
            console.log(`Found ${eventLinks.length} potential event links`);
            eventLinks.slice(0, 5).each((index, element) => {
                const href = $(element).attr('href');
                const text = $(element).text().trim();
                console.log(`  ${index + 1}. ${text} -> ${href}`);
            });
            
            // Look for any structured content
            const articles = $('article, .post, .entry, .event-item, .listing');
            console.log(`Found ${articles.length} structured content elements`);
            
            if (articles.length > 0) {
                articles.slice(0, 3).each((index, element) => {
                    const title = $(element).find('h1, h2, h3, .title').first().text().trim();
                    const link = $(element).find('a').first().attr('href');
                    console.log(`  Article ${index + 1}: ${title} -> ${link}`);
                });
            }
            
        } catch (error) {
            console.log(`❌ Error testing ${url}: ${error.message}`);
        }
    }
}

testMainPage();
