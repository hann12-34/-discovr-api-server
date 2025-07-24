/**
 * Test TodoCanada Vancouver URL accessibility
 */

const axios = require('axios');

async function testVancouverTodoCanada() {
    console.log('🔍 Testing TodoCanada Vancouver URL...');
    
    try {
        const response = await axios.get('https://www.todocanada.ca/city/vancouver/events', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });
        
        console.log(`✅ Status: ${response.status}`);
        console.log(`📄 Content Length: ${response.data.length} characters`);
        console.log('✅ TodoCanada Vancouver is accessible!');
        
    } catch (error) {
        console.error('❌ Error accessing TodoCanada Vancouver:', error.message);
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
        }
    }
}

testVancouverTodoCanada().catch(console.error);
