/**
 * Debug script to find Toronto.ca events API endpoints
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function findTorontoAPI() {
    console.log('🔍 Looking for Toronto.ca events API endpoints...');
    
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
        const html = response.data;
        
        console.log('\n=== SEARCHING FOR API ENDPOINTS ===');
        
        // Look for API URLs in script tags
        const apiPatterns = [
            /api[\/\w\-\.]*events/gi,
            /\/wp-json\/[\/\w\-\.]*events/gi,
            /\/api\/[\/\w\-\.]*calendar/gi,
            /\/events\/[\/\w\-\.]*api/gi,
            /ajax[\/\w\-\.]*events/gi,
            /calendar[\/\w\-\.]*api/gi,
            /festivals[\/\w\-\.]*api/gi
        ];
        
        apiPatterns.forEach((pattern, index) => {
            const matches = html.match(pattern);
            if (matches) {
                console.log(`🎯 Pattern ${index + 1} matches:`, matches);
            }
        });
        
        // Look for data attributes that might contain API info
        console.log('\n=== DATA ATTRIBUTES ===');
        const dataAttributes = [
            '[data-api]',
            '[data-endpoint]',
            '[data-url]',
            '[data-source]',
            '[data-events]',
            '[data-calendar]'
        ];
        
        dataAttributes.forEach(selector => {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`📊 Found ${elements.length} elements with ${selector}`);
                elements.each((i, el) => {
                    const attrs = el.attribs;
                    Object.keys(attrs).forEach(key => {
                        if (key.startsWith('data-')) {
                            console.log(`   ${key}: ${attrs[key]}`);
                        }
                    });
                });
            }
        });
        
        // Look for WordPress REST API endpoints
        console.log('\n=== WORDPRESS API SEARCH ===');
        const wpApiMatches = html.match(/wp-json[\/\w\-\.]*events/gi);
        if (wpApiMatches) {
            console.log('🔌 WordPress API endpoints found:', wpApiMatches);
        }
        
        // Look for AJAX URLs
        console.log('\n=== AJAX ENDPOINTS ===');
        const ajaxMatches = html.match(/ajax[\/\w\-\.]*\w+/gi);
        if (ajaxMatches) {
            console.log('⚡ AJAX endpoints found:', ajaxMatches.slice(0, 10));
        }
        
        // Check for calendar-specific endpoints
        console.log('\n=== CALENDAR ENDPOINTS ===');
        const calendarMatches = html.match(/calendar[\/\w\-\.]*\w+/gi);
        if (calendarMatches) {
            console.log('📅 Calendar endpoints found:', calendarMatches.slice(0, 10));
        }
        
        // Look for event feed URLs
        console.log('\n=== EVENT FEED SEARCH ===');
        const feedPatterns = [
            /feed[\/\w\-\.]*events/gi,
            /events[\/\w\-\.]*feed/gi,
            /rss[\/\w\-\.]*events/gi,
            /events[\/\w\-\.]*rss/gi
        ];
        
        feedPatterns.forEach((pattern, index) => {
            const matches = html.match(pattern);
            if (matches) {
                console.log(`📡 Feed pattern ${index + 1}:`, matches);
            }
        });
        
        // Try common Toronto.ca API patterns
        console.log('\n=== TESTING COMMON API PATTERNS ===');
        const testUrls = [
            'https://www.toronto.ca/wp-json/wp/v2/events',
            'https://www.toronto.ca/api/events',
            'https://www.toronto.ca/wp-json/events/v1',
            'https://secure.toronto.ca/cc_sr_v1/data/swm_waste_wizard_APR',
            'https://www.toronto.ca/data/events/calendar.json'
        ];
        
        for (const url of testUrls) {
            try {
                const testResponse = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
                    },
                    timeout: 5000
                });
                console.log(`✅ ${url} - Status: ${testResponse.status}`);
                if (testResponse.data) {
                    console.log(`   Data type: ${typeof testResponse.data}`);
                    if (Array.isArray(testResponse.data)) {
                        console.log(`   Array length: ${testResponse.data.length}`);
                    }
                }
            } catch (error) {
                console.log(`❌ ${url} - Error: ${error.response?.status || error.message}`);
            }
        }
        
        console.log('\n=== API SEARCH COMPLETE ===');
        
    } catch (error) {
        console.error('❌ Error searching for API:', error.message);
    }
}

findTorontoAPI();
