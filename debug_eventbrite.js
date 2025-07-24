const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function debugEventBriteFormat() {
  try {
    console.log('Fetching EventBrite data...');
    const url = 'https://www.eventbrite.ca/d/canada--vancouver/rickshaw/';
    const response = await axios.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' 
      } 
    });
    
    // Save HTML for inspection
    fs.writeFileSync('eventbrite_debug.html', response.data);
    console.log('Saved HTML to eventbrite_debug.html');
    
    const $ = cheerio.load(response.data);
    console.log('Finding event cards...');
    
    // Check event cards and extract data
    const eventCards = $('.event-card');
    console.log(`Found ${eventCards.length} event cards`);
    
    eventCards.slice(0, 3).each((i, el) => {
      console.log(`\n--- Event ${i+1} ---`);
      
      // Extract title
      const title = $(el).find('h3').text().trim();
      console.log(`Title: ${title}`);
      
      // Extract date element text
      const dateElements = [
        'p.event-card-date-location',
        'p:contains("Tue,")',
        'p:contains("Wed,")',
        'p:contains("Thu,")',
        'p:contains("Fri,")',
        'p:contains("Sat,")',
        'p:contains("Sun,")',
        'p:contains("Mon,")'
      ];
      
      dateElements.forEach(selector => {
        const text = $(el).find(selector).text().trim();
        if (text) {
          console.log(`Date text [${selector}]: "${text}"`);
        }
      });
      
      // Look for all paragraph elements
      $(el).find('p').each((j, p) => {
        const pText = $(p).text().trim();
        console.log(`Paragraph ${j+1}: "${pText}"`);
      });
      
      // Extract HTML structure for first part
      console.log('HTML structure snippet:');
      console.log($(el).html().substring(0, 300) + '...');
    });
    
    // Test date parsing with sample dates
    const sampleDates = [
      "Tue, Sep 30, 7:00 PM",
      "Wed, Sep 3, 7:30 PM",
      "Thu, Jul 18, 2024, 8:00 PM"
    ];
    
    console.log('\n--- Testing Date Parsing ---');
    sampleDates.forEach(dateStr => {
      // EventBrite pattern
      const eventbritePattern = /(?:(?:mon|tue|wed|thu|fri|sat|sun)),\s+([a-z]{3})\s+(\d{1,2})(?:,\s+(\d{4}))?(?:,)?\s+(\d{1,2}):(\d{2})\s+(am|pm)/i;
      const match = dateStr.match(eventbritePattern);
      
      console.log(`\nTesting: "${dateStr}"`);
      if (match) {
        console.log('Match found!');
        console.log('Month:', match[1]);
        console.log('Day:', match[2]);
        console.log('Year:', match[3] || new Date().getFullYear());
        console.log('Hour:', match[4]);
        console.log('Minute:', match[5]);
        console.log('AM/PM:', match[6]);
      } else {
        console.log('No match found');
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugEventBriteFormat();
