/**
 * Test local sorting by running a simple server with our sorting logic
 */

const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3099;

// Test endpoint that fetches from the live API and applies our sorting
app.get('/test-sorted-events', async (req, res) => {
  try {
    console.log('🔄 Fetching events from live API...');
    const response = await axios.get('https://discovr-proxy-server.onrender.com/api/v1/venues/events/all');
    
    const events = response.data.events || response.data;
    console.log(`📊 Fetched ${events.length} events`);
    
    // Apply our sorting logic
    console.log('📅 Sorting events by date (oldest first)...');
    const sortedEvents = events.sort((a, b) => {
      // Get dates for comparison
      const dateA = a.startDate ? new Date(a.startDate) : null;
      const dateB = b.startDate ? new Date(b.startDate) : null;
      
      // Both have dates - compare them (oldest first)
      if (dateA && dateB) {
        return dateA - dateB;
      }
      
      // Only one has a date - the one with date comes first
      if (dateA && !dateB) return -1; // a comes before b
      if (!dateA && dateB) return 1;  // b comes before a
      
      // Neither has a date - maintain original order
      return 0;
    });
    
    console.log(`✅ Sorted ${sortedEvents.length} events by date`);
    
    // Show first few events to verify sorting
    console.log('\n📅 First 10 sorted events:');
    sortedEvents.slice(0, 10).forEach((event, index) => {
      const title = event.title || event.name || 'No title';
      const startDate = event.startDate;
      const dateStr = startDate ? new Date(startDate).toLocaleDateString() : 'No date';
      console.log(`   ${index + 1}. ${dateStr} - "${title}"`);
    });
    
    res.json({ 
      success: true,
      count: sortedEvents.length,
      events: sortedEvents 
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch and sort events' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📡 Test endpoint: http://localhost:${PORT}/test-sorted-events`);
  console.log('\n🧪 Testing our sorting logic locally...');
  
  // Auto-test the endpoint
  setTimeout(async () => {
    try {
      const response = await axios.get(`http://localhost:${PORT}/test-sorted-events`);
      console.log('\n✅ LOCAL SORTING TEST COMPLETED!');
      console.log(`📊 Successfully sorted ${response.data.count} events`);
      
      // Verify sorting
      const events = response.data.events;
      let sortingCorrect = true;
      let lastValidDate = null;
      
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const currentDate = event.startDate ? new Date(event.startDate) : null;
        
        if (currentDate) {
          if (lastValidDate && currentDate < lastValidDate) {
            console.log(`❌ Sorting error at index ${i}`);
            sortingCorrect = false;
            break;
          }
          lastValidDate = currentDate;
        }
      }
      
      if (sortingCorrect) {
        console.log('✅ LOCAL SORTING IS WORKING CORRECTLY!');
        console.log('📱 The sorting logic is ready for deployment.');
      } else {
        console.log('❌ Local sorting has issues');
      }
      
      process.exit(0);
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    }
  }, 1000);
});
