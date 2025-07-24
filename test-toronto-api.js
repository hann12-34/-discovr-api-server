/**
 * Test the Toronto.ca events API endpoint
 */

const axios = require('axios');

async function testTorontoAPI() {
    console.log('🔍 Testing Toronto.ca events API endpoint...');
    
    const apiUrl = 'https://www.toronto.ca/api_data/v2/DataAccess.svc/festivals_events';
    
    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 15000
        });

        console.log(`✅ API Response Status: ${response.status}`);
        console.log(`📊 Data Type: ${typeof response.data}`);
        
        if (Array.isArray(response.data)) {
            console.log(`🎉 Found ${response.data.length} events!`);
            
            if (response.data.length > 0) {
                console.log('\n=== FIRST EVENT SAMPLE ===');
                console.log(JSON.stringify(response.data[0], null, 2));
                
                console.log('\n=== EVENT STRUCTURE ANALYSIS ===');
                const firstEvent = response.data[0];
                Object.keys(firstEvent).forEach(key => {
                    console.log(`${key}: ${typeof firstEvent[key]} - ${firstEvent[key]?.toString().substring(0, 100)}`);
                });
            }
            
            console.log('\n=== SAMPLE OF ALL EVENTS ===');
            response.data.slice(0, 10).forEach((event, index) => {
                console.log(`${index + 1}. ${event.title || event.name || event.eventName || 'Untitled'}`);
            });
            
        } else if (typeof response.data === 'object') {
            console.log('📦 Response is an object:');
            console.log(JSON.stringify(response.data, null, 2).substring(0, 1000));
        } else {
            console.log('📄 Response data:');
            console.log(response.data.toString().substring(0, 1000));
        }
        
    } catch (error) {
        console.error('❌ Error testing API:', error.message);
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data: ${error.response.data?.toString().substring(0, 500)}`);
        }
    }
}

testTorontoAPI();
