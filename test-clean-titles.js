/**
 * Test that event titles are now clean without city prefixes
 */

const axios = require('axios');

async function testCleanTitles() {
  console.log('🧪 TESTING CLEAN EVENT TITLES');
  console.log('=' .repeat(50));
  
  try {
    const response = await axios.get('https://discovr-proxy-server.onrender.com/api/v1/venues/events/all');
    
    console.log(`✅ API Response Status: ${response.status}`);
    
    const events = response.data.events || response.data;
    console.log(`📊 Total Events: ${events.length}`);
    
    // Check for Toronto events
    const torontoEvents = events.filter(event => 
      (event.location && event.location.toLowerCase().includes('toronto')) ||
      (event.venue && event.venue.city && event.venue.city.toLowerCase().includes('toronto'))
    );
    
    console.log(`\n🏙️ Toronto Events: ${torontoEvents.length}`);
    
    // Show sample Toronto event titles
    console.log('\n📋 Sample Toronto Event Titles (should be clean):');
    torontoEvents.slice(0, 15).forEach((event, index) => {
      const title = event.title || event.name || 'No title';
      const hasPrefix = title.toLowerCase().startsWith('toronto - ');
      const status = hasPrefix ? '❌' : '✅';
      console.log(`   ${index + 1}. ${status} "${title}"`);
    });
    
    // Check for any remaining prefixes
    const eventsWithTorontoPrefix = events.filter(event => {
      const title = event.title || event.name || '';
      return title.toLowerCase().startsWith('toronto - ');
    });
    
    const eventsWithVancouverPrefix = events.filter(event => {
      const title = event.title || event.name || '';
      return title.toLowerCase().startsWith('vancouver - ');
    });
    
    console.log(`\n📊 Events still with "Toronto - " prefix: ${eventsWithTorontoPrefix.length}`);
    console.log(`📊 Events still with "Vancouver - " prefix: ${eventsWithVancouverPrefix.length}`);
    
    if (eventsWithTorontoPrefix.length === 0 && eventsWithVancouverPrefix.length === 0) {
      console.log('🎉 ALL CITY PREFIXES REMOVED!');
      console.log('📱 Mobile app will show clean event titles.');
    } else {
      console.log('⚠️ Some prefixes still remain:');
      [...eventsWithTorontoPrefix, ...eventsWithVancouverPrefix].slice(0, 5).forEach((event, index) => {
        console.log(`   ${index + 1}. "${event.title || event.name}"`);
      });
    }
    
    // Show Vancouver events too
    const vancouverEvents = events.filter(event => 
      (event.location && event.location.toLowerCase().includes('vancouver')) ||
      (event.venue && event.venue.city && event.venue.city.toLowerCase().includes('vancouver'))
    );
    
    console.log(`\n🏙️ Vancouver Events: ${vancouverEvents.length}`);
    console.log('\n📋 Sample Vancouver Event Titles:');
    vancouverEvents.slice(0, 10).forEach((event, index) => {
      const title = event.title || event.name || 'No title';
      console.log(`   ${index + 1}. "${title}"`);
    });
    
  } catch (error) {
    console.error('❌ Error testing clean titles:', error.message);
  }
}

// Run the test
testCleanTitles().catch(console.error);
