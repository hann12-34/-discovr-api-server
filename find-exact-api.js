/**
 * Find the exact API URL from Toronto.ca page source
 */

const axios = require('axios');

async function findExactAPI() {
    console.log('🔍 Finding exact API URL from page source...');
    
    try {
        const response = await axios.get('https://www.toronto.ca/explore-enjoy/festivals-events/festivals-events-calendar/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
            },
            timeout: 15000
        });

        const html = response.data;
        
        // Look for the exact API URL
        const apiMatches = html.match(/api_data\/v2\/DataAccess\.svc\/festivals_events[^"'\s]*/gi);
        if (apiMatches) {
            console.log('🎯 Found API URLs:', apiMatches);
            
            // Test each found URL
            for (const apiPath of apiMatches) {
                const fullUrl = apiPath.startsWith('http') ? apiPath : `https://www.toronto.ca/${apiPath}`;
                console.log(`\n🧪 Testing: ${fullUrl}`);
                
                try {
                    const apiResponse = await axios.get(fullUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
                            'Accept': 'application/json, text/plain, */*'
                        },
                        timeout: 10000
                    });
                    
                    console.log(`✅ Success! Status: ${apiResponse.status}`);
                    console.log(`📊 Data type: ${typeof apiResponse.data}`);
                    
                    if (Array.isArray(apiResponse.data)) {
                        console.log(`🎉 Found ${apiResponse.data.length} events!`);
                        if (apiResponse.data.length > 0) {
                            console.log('First event keys:', Object.keys(apiResponse.data[0]));
                        }
                    } else if (typeof apiResponse.data === 'object') {
                        console.log('Object keys:', Object.keys(apiResponse.data));
                    }
                    
                } catch (error) {
                    console.log(`❌ Failed: ${error.response?.status || error.message}`);
                }
            }
        }
        
        // Also look for any complete API URLs
        const fullApiMatches = html.match(/https?:\/\/[^"'\s]*api[^"'\s]*events[^"'\s]*/gi);
        if (fullApiMatches) {
            console.log('\n🌐 Found full API URLs:', fullApiMatches);
        }
        
        // Look for JavaScript variables that might contain API info
        const jsApiMatches = html.match(/var\s+\w*[aA]pi\w*\s*=\s*['"](.*?)['"]/gi);
        if (jsApiMatches) {
            console.log('\n📝 Found JS API variables:', jsApiMatches);
        }
        
        // Look for data-api or similar attributes
        const dataApiMatches = html.match(/data-api[^=]*=\s*['"](.*?)['"]/gi);
        if (dataApiMatches) {
            console.log('\n📊 Found data-api attributes:', dataApiMatches);
        }
        
    } catch (error) {
        console.error('❌ Error finding API:', error.message);
    }
}

findExactAPI();
