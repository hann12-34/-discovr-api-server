/**
 * Full debug of Now Playing Toronto page structure
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function debugFullStructure() {
    console.log('🔍 Full debug of Now Playing Toronto structure...');
    
    try {
        const response = await axios.get('https://nowplayingtoronto.com/categories/special-events/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        console.log(`📄 Page title: ${$('title').text()}`);
        console.log(`📏 Page content length: ${response.data.length} characters`);
        
        // Look for any elements with event-related text
        console.log('\n🔍 Searching for elements containing "event" text...');
        const eventElements = $('*').filter(function() {
            const text = $(this).text().toLowerCase();
            return text.includes('event') && text.length > 20 && text.length < 500;
        });
        
        console.log(`Found ${eventElements.length} elements with "event" text`);
        eventElements.slice(0, 5).each((index, element) => {
            const tagName = element.tagName;
            const classes = $(element).attr('class') || 'no-class';
            const text = $(element).text().trim().substring(0, 100);
            console.log(`${index + 1}. <${tagName}> class="${classes}": ${text}...`);
        });
        
        // Look for any links that might be events
        console.log('\n🔗 Looking for links that might be events...');
        const links = $('a[href*="event"], a[href*="special"], a[href*="show"]');
        console.log(`Found ${links.length} event-related links`);
        links.slice(0, 5).each((index, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().trim();
            console.log(`${index + 1}. ${text} -> ${href}`);
        });
        
        // Look for any structured data
        console.log('\n📊 Looking for structured data...');
        const jsonLd = $('script[type="application/ld+json"]');
        console.log(`Found ${jsonLd.length} JSON-LD scripts`);
        jsonLd.each((index, element) => {
            try {
                const data = JSON.parse($(element).html());
                console.log(`JSON-LD ${index + 1}:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
            } catch (e) {
                console.log(`JSON-LD ${index + 1}: Invalid JSON`);
            }
        });
        
        // Look for any divs with substantial content
        console.log('\n📦 Looking for content divs...');
        const contentDivs = $('div').filter(function() {
            const text = $(this).text().trim();
            return text.length > 100 && text.length < 1000;
        });
        
        console.log(`Found ${contentDivs.length} content divs`);
        contentDivs.slice(0, 3).each((index, element) => {
            const classes = $(element).attr('class') || 'no-class';
            const text = $(element).text().trim().substring(0, 150);
            console.log(`${index + 1}. class="${classes}": ${text}...`);
        });
        
        // Check if page might be using JavaScript to load content
        console.log('\n🔧 Checking for JavaScript content loading...');
        const scripts = $('script');
        let hasReact = false;
        let hasVue = false;
        let hasAjax = false;
        
        scripts.each((index, element) => {
            const scriptContent = $(element).html() || '';
            if (scriptContent.includes('React') || scriptContent.includes('react')) hasReact = true;
            if (scriptContent.includes('Vue') || scriptContent.includes('vue')) hasVue = true;
            if (scriptContent.includes('ajax') || scriptContent.includes('fetch') || scriptContent.includes('XMLHttpRequest')) hasAjax = true;
        });
        
        console.log(`React detected: ${hasReact}`);
        console.log(`Vue detected: ${hasVue}`);
        console.log(`AJAX/Fetch detected: ${hasAjax}`);
        
        // Look for any elements that might indicate dynamic loading
        console.log('\n⚡ Looking for dynamic loading indicators...');
        const loadingElements = $('[class*="load"], [class*="lazy"], [id*="load"], [data-src]');
        console.log(`Found ${loadingElements.length} potential dynamic loading elements`);
        
        // Check main content area
        console.log('\n🎯 Checking main content area...');
        const mainContent = $('#main, .main, #content, .content, .container').first();
        if (mainContent.length > 0) {
            const contentText = mainContent.text().trim();
            console.log(`Main content length: ${contentText.length} characters`);
            console.log(`Main content preview: ${contentText.substring(0, 200)}...`);
        } else {
            console.log('No main content area found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugFullStructure();
