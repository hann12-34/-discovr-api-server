const axios = require('axios');
const cheerio = require('cheerio');

async function checkEventBriteDates() {
  try {
    console.log('Fetching EventBrite event data...');
    const url = 'https://www.eventbrite.ca/d/canada--vancouver/rickshaw/';
    const response = await axios.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      } 
    });
    
    const $ = cheerio.load(response.data);
    console.log('Analyzing EventBrite HTML structure...');
    
    // Try with different event card selectors
    const cardSelectors = [
      '.event-card',
      '.eds-event-card-content',
      '[data-spec="event-card"]',
      '.search-event-card-square__info',
      '.search-event-card-rectangle',
      '.eds-l-pad-all'
    ];
    
    let found = false;
    
    for (const cardSelector of cardSelectors) {
      const cards = $(cardSelector);
      console.log(`Found ${cards.length} elements with selector: ${cardSelector}`);
      
      if (cards.length > 0) {
        found = true;
        console.log(`Analyzing cards with selector: ${cardSelector}`);
        
        cards.each((i, card) => {
          if (i > 2) return; // Only check first 3 cards
          
          // Try various title selectors
          const titleSelectors = ['h2', 'h3', '.eds-event-card-content__title', '.title', '.event-title', '.card-text-headline'];
          let title = '';
          
          for (const titleSelector of titleSelectors) {
            const titleText = $(card).find(titleSelector).text().trim();
            if (titleText) {
              title = titleText;
              console.log(`Found title with selector ${titleSelector}: "${title}"`);
              break;
            }
          }
          
          // Try various date selectors
          const dateSelectors = [
            '.eds-event-card-content__sub-title', 
            '.date', 
            '.event-date', 
            '.card-text-date',
            '.event-date-range', 
            'time', 
            '.datetime', 
            '.date-info',
            '.info-date'
          ];
          
          for (const dateSelector of dateSelectors) {
            const dateText = $(card).find(dateSelector).text().trim();
            if (dateText) {
              console.log(`Found date with selector ${dateSelector}: "${dateText}"`);
            }
          }
          
          // Look for any elements that might contain date information
          $(card).find('*').each(function() {
            const text = $(this).text().trim();
            if (text && 
                text.length < 50 && 
                (text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/) || 
                 text.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i) || 
                 text.match(/\b\d{1,2}:\d{2}\b/))) {
              console.log(`Potential date text: "${text}" in element: ${$(this).prop('tagName')}`);
            }
          });
          
          console.log('---');
        });
      }
    }
    
    if (!found) {
      console.log('No event cards found with our selectors. Checking raw HTML structure...');
      // Look for date patterns in the entire document
      $('*').each(function() {
        const text = $(this).text().trim();
        if (text && 
            text.length < 50 && 
            text.includes('202') && // Year indicator
            (text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/) || 
             text.match(/\b(PM|AM)\b/i))) {
          console.log(`Raw date text: "${text}"`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkEventBriteDates();
