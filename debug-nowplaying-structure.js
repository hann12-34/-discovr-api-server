/**
 * Debug Now Playing Toronto structure in detail
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function debugNowPlaying() {
    console.log('🔍 Debugging Now Playing Toronto structure...');
    
    try {
        const response = await axios.get('https://nowplayingtoronto.com/categories/special-events/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        // Look for article elements specifically
        console.log('\n📰 Article elements:');
        $('article').each((index, element) => {
            if (index < 3) { // Show first 3 articles
                const classes = $(element).attr('class');
                const title = $(element).find('h1, h2, h3, .entry-title, .post-title').first().text().trim();
                const date = $(element).find('.date, .entry-date, .post-date').first().text().trim();
                
                console.log(`\n   Article ${index + 1}:`);
                console.log(`   Classes: ${classes}`);
                console.log(`   Title: ${title}`);
                console.log(`   Date: ${date}`);
                
                // Look for links
                const link = $(element).find('a').first().attr('href');
                console.log(`   Link: ${link}`);
            }
        });
        
        // Look for post elements
        console.log('\n📝 Post elements:');
        $('.post').each((index, element) => {
            if (index < 3) {
                const classes = $(element).attr('class');
                const title = $(element).find('h1, h2, h3, .entry-title, .post-title').first().text().trim();
                
                console.log(`\n   Post ${index + 1}:`);
                console.log(`   Classes: ${classes}`);
                console.log(`   Title: ${title}`);
            }
        });
        
        // Look for entry elements
        console.log('\n📄 Entry elements:');
        $('.entry, [class*="entry"]').each((index, element) => {
            if (index < 3) {
                const classes = $(element).attr('class');
                const title = $(element).find('h1, h2, h3, .entry-title, .post-title').first().text().trim();
                
                console.log(`\n   Entry ${index + 1}:`);
                console.log(`   Classes: ${classes}`);
                console.log(`   Title: ${title}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugNowPlaying().catch(console.error);
