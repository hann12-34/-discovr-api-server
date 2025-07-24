/**
 * Test the Toronto.ca events endpoint
 */

const axios = require('axios');

async function testEventsEndpoint() {
    console.log('🔍 Testing Toronto.ca events endpoint...');
    
    const apiUrl = 'https://secure.toronto.ca/c3api_data/v2/DataAccess.svc/festivals_events/events';
    
    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': 'https://www.toronto.ca/explore-enjoy/festivals-events/festivals-events-calendar/',
                'DNT': '1',
                'Connection': 'keep-alive'
            },
            timeout: 15000
        });

        console.log(`✅ Success! Status: ${response.status}`);
        console.log(`📊 Data Type: ${typeof response.data}`);
        
        if (Array.isArray(response.data)) {
            console.log(`🎉 Found ${response.data.length} events!`);
            
            if (response.data.length > 0) {
                console.log('\n=== FIRST EVENT SAMPLE ===');
                console.log(JSON.stringify(response.data[0], null, 2));
                
                console.log('\n=== EVENT STRUCTURE ANALYSIS ===');
                const firstEvent = response.data[0];
                Object.keys(firstEvent).forEach(key => {
                    const value = firstEvent[key];
                    console.log(`${key}: ${typeof value} - ${value?.toString().substring(0, 100)}`);
                });
                
                console.log('\n=== SAMPLE EVENT TITLES ===');
                response.data.slice(0, 10).forEach((event, index) => {
                    const title = event.title || event.name || event.eventName || event.eventTitle || 'Untitled';
                    console.log(`${index + 1}. ${title}`);
                });
            }
            
        } else if (typeof response.data === 'object') {
            console.log('📦 Response is an object:');
            console.log(JSON.stringify(response.data, null, 2).substring(0, 1000));
            
            // Check if it has a value property (OData format)
            if (response.data.value && Array.isArray(response.data.value)) {
                console.log(`🎉 Found ${response.data.value.length} events in .value array!`);
                if (response.data.value.length > 0) {
                    console.log('\n=== FIRST EVENT FROM .value ===');
                    console.log(JSON.stringify(response.data.value[0], null, 2));
                    
                    console.log('\n=== SAMPLE EVENT TITLES FROM .value ===');
                    response.data.value.slice(0, 10).forEach((event, index) => {
                        const title = event.title || event.name || event.eventName || event.eventTitle || 'Untitled';
                        console.log(`${index + 1}. ${title}`);
                    });
                }
            }
            
        } else if (typeof response.data === 'string') {
            console.log('📄 String response (first 1000 chars):');
            console.log(response.data.substring(0, 1000));
            
            // Try to parse as JSON
            try {
                const parsed = JSON.parse(response.data);
                console.log('✅ Successfully parsed JSON!');
                if (parsed.value && Array.isArray(parsed.value)) {
                    console.log(`🎉 Found ${parsed.value.length} events in parsed JSON!`);
                    if (parsed.value.length > 0) {
                        console.log('\n=== FIRST PARSED EVENT ===');
                        console.log(JSON.stringify(parsed.value[0], null, 2));
                    }
                }
            } catch (parseError) {
                console.log('❌ Could not parse as JSON');
            }
        }
        
    } catch (error) {
        console.error('❌ Error testing events endpoint:', error.message);
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data: ${error.response.data?.toString().substring(0, 500)}`);
        }
    }
}

testEventsEndpoint();
