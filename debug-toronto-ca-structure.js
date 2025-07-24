/**
 * Debug script to analyze Toronto.ca events page structure
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function debugTorontoCA() {
    console.log('🔍 Debugging Toronto.ca events page structure...');
    
    try {
        const response = await axios.get('https://www.toronto.ca/explore-enjoy/festivals-events/festivals-events-calendar/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
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
        
        console.log('\n=== PAGE ANALYSIS ===');
        console.log(`Page title: ${$('title').text()}`);
        console.log(`Page length: ${response.data.length} characters`);
        
        // Check for common event-related elements
        const eventSelectors = [
            '.event',
            '.event-item',
            '.event-card',
            '.festival',
            '.festival-item',
            '.calendar-event',
            '.listing',
            'article',
            '.post',
            '[data-event]',
            '[class*="event"]',
            '[class*="festival"]',
            '[class*="calendar"]'
        ];
        
        console.log('\n=== ELEMENT SEARCH ===');
        eventSelectors.forEach(selector => {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
                // Show first element's HTML structure
                console.log(`   First element HTML: ${$(elements[0]).html()?.substring(0, 200)}...`);
            }
        });
        
        // Check for JSON-LD structured data
        console.log('\n=== JSON-LD ANALYSIS ===');
        const jsonLdScripts = $('script[type="application/ld+json"]');
        console.log(`Found ${jsonLdScripts.length} JSON-LD scripts`);
        
        jsonLdScripts.each((index, element) => {
            try {
                const jsonData = JSON.parse($(element).html());
                console.log(`JSON-LD ${index + 1}:`, JSON.stringify(jsonData, null, 2).substring(0, 300));
            } catch (e) {
                console.log(`JSON-LD ${index + 1}: Parse error`);
            }
        });
        
        // Check for dynamic loading indicators
        console.log('\n=== DYNAMIC LOADING INDICATORS ===');
        const dynamicIndicators = [
            'script[src*="react"]',
            'script[src*="vue"]',
            'script[src*="angular"]',
            'script[src*="jquery"]',
            '[data-react]',
            '[data-vue]',
            '.loading',
            '.spinner',
            '#calendar',
            '.calendar-container'
        ];
        
        dynamicIndicators.forEach(selector => {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`⚠️ Found ${elements.length} dynamic loading indicators: ${selector}`);
            }
        });
        
        // Check for specific Toronto.ca patterns
        console.log('\n=== TORONTO.CA SPECIFIC PATTERNS ===');
        const torontoSelectors = [
            '.toc-event',
            '.toc-calendar',
            '.city-event',
            '.toronto-event',
            '.events-list',
            '.events-container',
            '.calendar-view',
            '.event-calendar'
        ];
        
        torontoSelectors.forEach(selector => {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`🏛️ Found ${elements.length} Toronto-specific elements: ${selector}`);
            }
        });
        
        // Look for any text containing "event" or "festival"
        console.log('\n=== TEXT CONTENT ANALYSIS ===');
        const bodyText = $('body').text().toLowerCase();
        const eventMatches = bodyText.match(/event/g);
        const festivalMatches = bodyText.match(/festival/g);
        
        console.log(`"event" appears ${eventMatches ? eventMatches.length : 0} times in page text`);
        console.log(`"festival" appears ${festivalMatches ? festivalMatches.length : 0} times in page text`);
        
        // Check for calendar/date elements
        console.log('\n=== DATE/CALENDAR ELEMENTS ===');
        const dateSelectors = [
            '.date',
            '.calendar',
            '.month',
            '.day',
            '.year',
            '[data-date]',
            '.datetime'
        ];
        
        dateSelectors.forEach(selector => {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`📅 Found ${elements.length} date elements: ${selector}`);
            }
        });
        
        console.log('\n=== DEBUG COMPLETE ===');
        
    } catch (error) {
        console.error('❌ Error debugging Toronto.ca:', error.message);
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Headers:`, error.response.headers);
        }
    }
}

debugTorontoCA();
