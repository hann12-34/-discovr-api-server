/**
 * Analyze the structure of Now Playing Toronto events
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function analyzeEvents() {
    console.log('🔍 Analyzing Now Playing Toronto events structure...');
    
    try {
        const response = await axios.get('https://nowplayingtoronto.com/categories/festivals-special-events/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        console.log(`📄 Page title: ${$('title').text()}`);
        console.log(`📏 Content length: ${response.data.length} characters`);
        
        // Look for event articles
        const articles = $('article, .post, .entry, .event-item, .listing');
        console.log(`\n📰 Found ${articles.length} article elements`);
        
        articles.each((index, element) => {
            if (index < 5) { // Analyze first 5 events
                console.log(`\n🎯 Event ${index + 1}:`);
                
                const $el = $(element);
                const classes = $el.attr('class') || 'no-class';
                console.log(`   Classes: ${classes}`);
                
                // Look for title
                const titleSelectors = ['h1', 'h2', 'h3', '.title', '.entry-title', '.post-title', 'a[href*="/event/"]'];
                let title = '';
                for (const selector of titleSelectors) {
                    const titleEl = $el.find(selector).first();
                    if (titleEl.length && titleEl.text().trim()) {
                        title = titleEl.text().trim();
                        console.log(`   Title (${selector}): ${title}`);
                        break;
                    }
                }
                
                // Look for date
                const dateSelectors = ['.date', '.entry-date', '.post-date', '.event-date', '.when', 'time'];
                let date = '';
                for (const selector of dateSelectors) {
                    const dateEl = $el.find(selector).first();
                    if (dateEl.length && dateEl.text().trim()) {
                        date = dateEl.text().trim();
                        console.log(`   Date (${selector}): ${date}`);
                        break;
                    }
                }
                
                // Look for link
                const linkEl = $el.find('a[href*="/event/"]').first();
                if (linkEl.length) {
                    const href = linkEl.attr('href');
                    console.log(`   Link: ${href}`);
                }
                
                // Look for description
                const descSelectors = ['.excerpt', '.summary', '.description', '.content', '.entry-content'];
                let description = '';
                for (const selector of descSelectors) {
                    const descEl = $el.find(selector).first();
                    if (descEl.length && descEl.text().trim()) {
                        description = descEl.text().trim().substring(0, 100);
                        console.log(`   Description (${selector}): ${description}...`);
                        break;
                    }
                }
                
                // Look for location
                const locationSelectors = ['.location', '.venue', '.where', '.address'];
                let location = '';
                for (const selector of locationSelectors) {
                    const locEl = $el.find(selector).first();
                    if (locEl.length && locEl.text().trim()) {
                        location = locEl.text().trim();
                        console.log(`   Location (${selector}): ${location}`);
                        break;
                    }
                }
                
                // Look for price
                const priceSelectors = ['.price', '.cost', '.admission', '.ticket'];
                let price = '';
                for (const selector of priceSelectors) {
                    const priceEl = $el.find(selector).first();
                    if (priceEl.length && priceEl.text().trim()) {
                        price = priceEl.text().trim();
                        console.log(`   Price (${selector}): ${price}`);
                        break;
                    }
                }
                
                // Look for image
                const imgEl = $el.find('img').first();
                if (imgEl.length) {
                    const src = imgEl.attr('src') || imgEl.attr('data-src');
                    console.log(`   Image: ${src}`);
                }
                
                // Print full HTML structure for first event
                if (index === 0) {
                    console.log(`\n📝 Full HTML structure of first event:`);
                    console.log($el.html().substring(0, 500) + '...');
                }
            }
        });
        
        // Check if there are more events that might be loaded dynamically
        console.log('\n🔄 Checking for pagination or load more buttons...');
        const loadMoreSelectors = ['.load-more', '.pagination', '.next', '[data-page]', '[data-load]'];
        loadMoreSelectors.forEach(selector => {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`Found ${elements.length} elements with selector: ${selector}`);
                elements.each((i, el) => {
                    const text = $(el).text().trim();
                    const href = $(el).attr('href');
                    console.log(`  ${i + 1}. ${text} -> ${href}`);
                });
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

analyzeEvents();
