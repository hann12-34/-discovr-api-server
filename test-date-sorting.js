/**
 * Test that events are now sorted by date (oldest first)
 */

const axios = require('axios');

async function testDateSorting() {
  console.log('🧪 TESTING EVENT DATE SORTING');
  console.log('=' .repeat(50));
  
  try {
    const response = await axios.get('https://discovr-proxy-server.onrender.com/api/v1/venues/events/all');
    
    console.log(`✅ API Response Status: ${response.status}`);
    
    const events = response.data.events || response.data;
    console.log(`📊 Total Events: ${events.length}`);
    
    // Check first 20 events to see their dates
    console.log('\n📅 First 20 Events (should be oldest first):');
    events.slice(0, 20).forEach((event, index) => {
      const title = event.title || event.name || 'No title';
      const startDate = event.startDate;
      const dateStr = startDate ? new Date(startDate).toLocaleDateString() : 'No date';
      
      console.log(`   ${index + 1}. ${dateStr} - "${title}"`);
    });
    
    // Check last 10 events
    console.log('\n📅 Last 10 Events (should be newest):');
    events.slice(-10).forEach((event, index) => {
      const title = event.title || event.name || 'No title';
      const startDate = event.startDate;
      const dateStr = startDate ? new Date(startDate).toLocaleDateString() : 'No date';
      const actualIndex = events.length - 10 + index;
      
      console.log(`   ${actualIndex + 1}. ${dateStr} - "${title}"`);
    });
    
    // Count events with and without dates
    console.log('\n🔍 Analyzing event dates...');
    let eventsWithDates = 0;
    let eventsWithoutDates = 0;
    
    events.forEach(event => {
      if (event.startDate) {
        eventsWithDates++;
      } else {
        eventsWithoutDates++;
      }
    });
    
    console.log(`📅 Events with dates: ${eventsWithDates}`);
    console.log(`❌ Events without dates: ${eventsWithoutDates}`);
    
    // Verify sorting is correct for events with dates
    console.log('\n🔍 Verifying date sorting...');
    let sortingCorrect = true;
    let lastValidDate = null;
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const currentDate = event.startDate ? new Date(event.startDate) : null;
      
      if (currentDate) {
        if (lastValidDate && currentDate < lastValidDate) {
          console.log(`❌ Sorting error at index ${i}: ${currentDate.toLocaleDateString()} < ${lastValidDate.toLocaleDateString()}`);
          sortingCorrect = false;
          break;
        }
        lastValidDate = currentDate;
      }
    }
    
    console.log(`📊 Events with dates: ${eventsWithDates}`);
    console.log(`📊 Events without dates: ${eventsWithoutDates}`);
    
    if (sortingCorrect) {
      console.log('✅ DATE SORTING IS CORRECT!');
      console.log('📱 Mobile app will now show events in chronological order (oldest first).');
    } else {
      console.log('❌ Date sorting has issues');
    }
    
    // Show date range
    const eventsWithValidDates = events.filter(e => e.startDate);
    if (eventsWithValidDates.length > 0) {
      const firstDate = new Date(eventsWithValidDates[0].startDate);
      const lastDate = new Date(eventsWithValidDates[eventsWithValidDates.length - 1].startDate);
      
      console.log(`\n📅 Date Range: ${firstDate.toLocaleDateString()} to ${lastDate.toLocaleDateString()}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing date sorting:', error.message);
  }
}

// Run the test
testDateSorting().catch(console.error);
