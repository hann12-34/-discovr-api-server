/**
 * Debug script to find potential API endpoints on Now Playing Toronto
 * This script searches for API URLs in the page source and network requests
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function findApiEndpoints() {
    console.log('🔍 Searching for API endpoints on Now Playing Toronto...');
    
    const url = 'https://nowplayingtoronto.com/categories/special-events/';
    
    try {
        // Make request with browser-like headers
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': 'https://nowplayingtoronto.com/'
            }
        });
        
        console.log(`📥 Got response with status ${response.status}`);
        
        // Load HTML content
        const $ = cheerio.load(response.data);
        
        // Search for common API patterns in scripts
        console.log('\n🔎 Searching for API endpoints in script tags...');
        const scriptTags = $('script');
        let foundApiPatterns = new Set();
        
        scriptTags.each((i, script) => {
            const scriptContent = $(script).html();
            if (!scriptContent) return;
            
            // Look for common API patterns
            const apiPatterns = [
                /["'](?:https?:)?\/\/(?:api|rest|graphql|v\d)\.[\w.-]+\.com[^"']+["']/g, // External API domains
                /["']\/(?:api|wp-json|rest|graphql|v\d)[^"']*["']/g, // Relative API paths
                /["'](?:https?:)?\/\/nowplayingtoronto\.com\/(?:api|wp-json|rest)[^"']*["']/g, // This domain API paths
                /fetch\(['"]([^'"]+)['"]/g, // fetch calls
                /axios\s*\.\s*get\(['"]([^'"]+)['"]/g, // axios.get calls
                /new XMLHttpRequest\(\)[\s\S]*?\.open\(['"][A-Z]+['"],\s*['"]([^'"]+)['"]/g, // XMLHttpRequest
                /\$\.(?:get|post|ajax)\(\s*['"]([^'"]+)['"]/g // jQuery ajax calls
            ];
            
            apiPatterns.forEach(pattern => {
                const matches = scriptContent.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        // Clean up the match
                        const endpoint = match.replace(/["']/g, '').trim();
                        foundApiPatterns.add(endpoint);
                    });
                }
            });
        });
        
        // Check for WordPress REST API (common for many sites)
        console.log('\n🔎 Checking for WordPress REST API...');
        const wpApiEndpoints = [
            'https://nowplayingtoronto.com/wp-json/',
            'https://nowplayingtoronto.com/wp-json/wp/v2/posts',
            'https://nowplayingtoronto.com/wp-json/wp/v2/categories'
        ];
        
        for (const endpoint of wpApiEndpoints) {
            try {
                const wpResponse = await axios.get(endpoint, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
                    timeout: 5000
                });
                
                if (wpResponse.status === 200) {
                    console.log(`✅ WordPress API endpoint found: ${endpoint}`);
                    console.log(`📄 Sample data: ${JSON.stringify(wpResponse.data).slice(0, 100)}...`);
                    foundApiPatterns.add(endpoint);
                }
            } catch (error) {
                console.log(`❌ WordPress API endpoint not available: ${endpoint}`);
            }
        }
        
        // Print found patterns
        console.log('\n🔍 Found potential API endpoints:');
        if (foundApiPatterns.size > 0) {
            Array.from(foundApiPatterns).forEach(endpoint => {
                console.log(`- ${endpoint}`);
            });
        } else {
            console.log('No API endpoints found in page source');
        }
        
        // Look for network requests in HTML comments
        console.log('\n🔎 Searching for AJAX or data loading patterns...');
        const htmlContent = response.data;
        
        // Common patterns for AJAX requests
        const ajaxPatterns = [
            /ajax_url\s*=\s*["']([^"']+)["']/g,
            /data-(?:src|url|endpoint)\s*=\s*["']([^"']+)["']/g,
            /loadMore\(\s*["']([^"']+)["']/g,
            /(?:load|fetch|get)Posts\(\s*["']([^"']+)["']/g
        ];
        
        ajaxPatterns.forEach(pattern => {
            const matches = htmlContent.match(pattern);
            if (matches) {
                console.log(`✅ Found AJAX pattern: ${pattern.toString()}`);
                matches.forEach(match => {
                    console.log(`- ${match}`);
                });
            }
        });
        
        // Check meta tags for API URLs
        console.log('\n🔎 Checking meta tags for API references...');
        const metaTags = $('meta');
        metaTags.each((i, meta) => {
            const content = $(meta).attr('content');
            if (content && (content.includes('/api/') || content.includes('/wp-json/'))) {
                console.log(`- Meta tag with API reference: ${content}`);
            }
        });
        
        // Look for data attributes on elements
        console.log('\n🔎 Checking data attributes for API references...');
        const elementsWithData = $('[data-api], [data-url], [data-endpoint], [data-src]');
        if (elementsWithData.length > 0) {
            elementsWithData.each((i, el) => {
                const dataAttr = $(el).attr('data-api') || $(el).attr('data-url') || 
                                $(el).attr('data-endpoint') || $(el).attr('data-src');
                if (dataAttr && (dataAttr.includes('/api/') || dataAttr.includes('/wp-json/'))) {
                    console.log(`- Element with API reference: ${dataAttr}`);
                }
            });
        }
        
    } catch (error) {
        console.error(`❌ Error during API endpoint detection:`, error.message);
    }
}

findApiEndpoints();
