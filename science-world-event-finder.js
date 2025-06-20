const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function findScienceWorldEvents() {
  console.log("Finding Science World event structure...");
  const url = "https://www.scienceworld.ca/today/events/";
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    
    console.log("Title:", $('title').text());
    
    // Check main content areas for potential events
    console.log("\nExploring main content areas:");
    ['main', '.main-content', '#main', '.content'].forEach(selector => {
      const contentArea = $(selector);
      if (contentArea.length) {
        console.log(`Found ${selector} with ${contentArea.find('a').length} links and ${contentArea.find('div').length} divs`);
      }
    });
    
    // Check for events API links
    const apiLinks = [];
    $('script').each((i, script) => {
      const content = $(script).html() || '';
      if (content.includes('event') && content.includes('api')) {
        const matches = content.match(/(https?:\/\/[^"'\s]+api[^"'\s]*)/g);
        if (matches) apiLinks.push(...matches);
      }
    });
    
    if (apiLinks.length) {
      console.log("\nFound possible event API links:");
      apiLinks.forEach(link => console.log(` - ${link}`));
    }
    
    // Check for specific event sections or containers
    const eventSections = [];
    
    // Look for upcoming events section
    $('h1, h2, h3, h4, h5, h6, .title').each((i, heading) => {
      const text = $(heading).text().trim();
      if (text.toLowerCase().includes('event') || text.toLowerCase().includes('coming') || text.toLowerCase().includes('upcoming')) {
        console.log(`\nFound event heading: "${text}"`);
        const section = $(heading).closest('section, div.section, div.container');
        if (section.length) {
          const links = section.find('a');
          console.log(` - Contains ${links.length} links`);
          
          // Check if these might be event links
          if (links.length > 0) {
            console.log("\nPotential event links:");
            links.each((j, link) => {
              if (j < 5) { // Limit to first 5 for brevity
                const href = $(link).attr('href');
                const text = $(link).text().trim();
                if (href && text) {
                  console.log(` - ${text}: ${href}`);
                }
              }
            });
          }
        }
      }
    });
    
    // Look for all links that might be event links
    const eventLinks = $('a').filter((i, link) => {
      const href = $(link).attr('href') || '';
      const text = $(link).text().trim();
      return (href.includes('event') || href.includes('exhibition')) && text.length > 0;
    });
    
    if (eventLinks.length) {
      console.log(`\nFound ${eventLinks.length} links that might be events`);
      console.log("Top 5 potential event links:");
      eventLinks.slice(0, 5).each((i, link) => {
        const href = $(link).attr('href');
        const text = $(link).text().trim();
        console.log(` - ${text}: ${href}`);
        
        // Try to extract date information near this link
        const parent = $(link).parent();
        const dateText = parent.find('time, .date, .calendar').text().trim();
        if (dateText) {
          console.log(`   Date info: ${dateText}`);
        }
      });
    }
    
    // Check for WordPress specific event blocks
    console.log("\nLooking for WordPress event blocks:");
    $('.wp-block-group, .events-listing, .event-block').each((i, block) => {
      console.log(` - Found block with ${$(block).find('a').length} links`);
      
      // Print HTML structure of first event block if found
      if (i === 0) {
        const eventHTML = $(block).html().substr(0, 500) + '...';
        console.log("\nFirst event block structure:");
        console.log(eventHTML);
      }
    });
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

findScienceWorldEvents();
