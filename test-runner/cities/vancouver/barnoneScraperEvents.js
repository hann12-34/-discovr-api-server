/**
 * Improved scraper for Barnone Scraper
 * Enhanced with multiple selector strategies to extract events
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function scrape() {
  console.log('🔍 Scraping events from Barnone Scraper...');
  
  try {
    const sourceUrl = 'https://www.barnonescraper.com/events/';
    console.log(`Navigating to ${sourceUrl}`);
    
    const response = await axios.get(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
      },
      timeout: 10000
    }).catch(error => {
      console.log(`Error fetching ${sourceUrl}: ${error.message}`);
      return { status: 404 };
    });
    
    if (!response || response.status !== 200) {
      console.error(`Failed to fetch from ${sourceUrl}`);
      return [];
    }
    
    const $ = cheerio.load(response.data);
    const events = [];
    
    // Save HTML for debugging
    fs.writeFileSync('barnone-scraper-debug.html', response.data);
    console.log(`Saved HTML to barnone-scraper-debug.html`);
    
    // Strategy 1: Try common event selectors
    const eventSelectors = [
      '.event', '.events', '.event-item', '.event-listing',
      '.show', '.shows', '.show-item', '.performance',
      '[class*="event"]', '[class*="show"]', '[class*="performance"]',
      'article', '.card', '.listing', '.program-item',
      '.calendar-item', '.upcoming'
    ];
    
    console.log('Trying common event selectors...');
    for (const selector of eventSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        
        elements.each((i, el) => {
          try {
            // Look for title
            const titleSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', '.title', '[class*="title"]', 'a'];
            let title = '';
            
            for (const titleSel of titleSelectors) {
              const titleEl = $(el).find(titleSel).first();
              if (titleEl.length) {
                title = titleEl.text().trim();
                if (title) break;
              }
            }
            
            if (!title) title = $(el).text().trim().split('\n')[0]; // First line as fallback
            
            // Skip non-event items
            if (title.toLowerCase().includes('subscribe') || 
                title.toLowerCase().includes('newsletter') ||
                title.toLowerCase().includes('sign up') ||
                title.length < 3 || title.length > 100) {
              return;
            }
            
            // Extract date
            const dateSelectors = [
              'time', '.date', '.time', '[class*="date"]', '[class*="time"]',
              '[datetime]', '[class*="calendar"]'
            ];
            
            let dateText = '';
            for (const dateSel of dateSelectors) {
              const dateEl = $(el).find(dateSel).first();
              if (dateEl.length) {
                dateText = dateEl.text().trim() || dateEl.attr('datetime') || '';
                if (dateText) break;
              }
            }
            
            // Extract link
            let eventUrl = '';
            const linkEl = $(el).find('a').first();
            if (linkEl.length) {
              eventUrl = linkEl.attr('href') || '';
              if (eventUrl && !eventUrl.startsWith('http')) {
                eventUrl = new URL(eventUrl, sourceUrl).href;
              }
            }
            
            // Extract image
            let imageUrl = '';
            const imgEl = $(el).find('img').first();
            if (imgEl.length) {
              imageUrl = imgEl.attr('src') || imgEl.attr('data-src') || '';
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = new URL(imageUrl, sourceUrl).href;
              }
            }
            
            // Extract description
            let description = '';
            const descriptionSelectors = [
              '.description', '.excerpt', '.summary', 'p', '[class*="desc"]', '[class*="content"]'
            ];
            
            for (const descSel of descriptionSelectors) {
              const descEl = $(el).find(descSel).first();
              if (descEl.length) {
                description = descEl.text().trim();
                if (description) break;
              }
            }
            
            if (!description) {
              // Remove title from text to create description
              const fullText = $(el).text().trim();
              const titleIndex = fullText.indexOf(title);
              if (titleIndex >= 0) {
                description = fullText.substring(titleIndex + title.length).trim().substring(0, 200);
              }
            }
            
            events.push({
              title,
              description: description || 'No description available',
              startDate: new Date(), // Using current date since we can't reliably parse date text
              dateText: dateText || 'Date not specified',
              sourceUrl: eventUrl || sourceUrl,
              imageUrl,
              venue: {
                name: "Barnone Scraper",
                city: "Vancouver",
                province: "BC",
                country: "Canada"
              },
              categories: guessCategories('Barnone Scraper', title)
            });
          } catch (error) {
            console.error('Error extracting event data:', error);
          }
        });
        
        if (events.length > 0) break;
      }
    }
    
    // Strategy 2: If no events found, try looking for specific date patterns in the text
    if (events.length === 0) {
      console.log('Trying date pattern search...');
      
      // Find elements containing date-like patterns
      const datePatterns = [
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(st|nd|rd|th)?\b/i,
        /\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i,
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(st|nd|rd|th)?\b/i,
        /\b\d{1,2}\/(0?[1-9]|1[0-2])\b/
      ];
      
      $('*').each((i, el) => {
        if (events.length >= 5) return false; // Limit to 5 events
        
        const text = $(el).text().trim();
        
        // Check if text contains date pattern
        let hasDatePattern = false;
        for (const pattern of datePatterns) {
          if (pattern.test(text)) {
            hasDatePattern = true;
            break;
          }
        }
        
        if (hasDatePattern && text.length > 10 && text.length < 500) {
          // Try to get a title
          let title = '';
          
          // Look for a title in parent elements first
          $(el).parents().each((i, parent) => {
            if (title) return false;
            
            const parentTitle = $(parent).find('h1, h2, h3, h4, h5, .title, [class*="title"]').first().text().trim();
            if (parentTitle) {
              title = parentTitle;
              return false;
            }
          });
          
          // If no title in parents, use this element's own content
          if (!title) {
            const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            title = lines[0]; // First non-empty line
          }
          
          if (title && title.length > 3 && title.length < 100 &&
              !title.toLowerCase().includes('subscribe') &&
              !title.toLowerCase().includes('newsletter')) {
            
            events.push({
              title: title,
              description: text.length > 100 ? text.substring(0, 100) + '...' : text,
              startDate: new Date(),
              dateText: text.match(datePatterns[0]) || text.match(datePatterns[1]) || 
                      text.match(datePatterns[2]) || text.match(datePatterns[3]) || 'Date not specified',
              sourceUrl,
              venue: {
                name: "Barnone Scraper",
                city: "Vancouver",
                province: "BC",
                country: "Canada"
              },
              categories: guessCategories('Barnone Scraper', title)
            });
          }
        }
      });
    }
    
    console.log(`Found ${events.length} events from Barnone Scraper`);
    
    if (events.length > 0) {
      console.log('First event:');
      console.log(`Title: ${events[0].title}`);
      console.log(`Date: ${events[0].dateText}`);
      console.log(`URL: ${events[0].sourceUrl}`);
    }
    
    return events;
  } catch (error) {
    console.error('Error scraping events:', error);
    return [];
  }
}

// Helper function to guess categories based on venue and title
function guessCategories(venue, title) {
  const categories = [];
  
  // Basic category from venue type
  const venueLC = venue.toLowerCase();
  if (venueLC.includes('theatre') || venueLC.includes('theater')) categories.push('theatre');
  if (venueLC.includes('festival')) categories.push('festival');
  if (venueLC.includes('gallery')) categories.push('art');
  if (venueLC.includes('museum')) categories.push('museum');
  if (venueLC.includes('bar') || venueLC.includes('cabaret')) categories.push('nightlife');
  if (venueLC.includes('music') || venueLC.includes('sound') || venueLC.includes('concert')) categories.push('music');
  
  // Category from event title
  const titleLC = title.toLowerCase();
  if (titleLC.includes('music') || titleLC.includes('concert') || titleLC.includes('band') || titleLC.includes('dj')) 
    categories.push('music');
  if (titleLC.includes('art') || titleLC.includes('exhibition') || titleLC.includes('gallery')) 
    categories.push('art');
  if (titleLC.includes('comedy') || titleLC.includes('laugh')) 
    categories.push('comedy');
  if (titleLC.includes('film') || titleLC.includes('movie') || titleLC.includes('cinema')) 
    categories.push('film');
  if (titleLC.includes('food') || titleLC.includes('dinner') || titleLC.includes('tasting')) 
    categories.push('food');
  if (titleLC.includes('dance') || titleLC.includes('dancing') || titleLC.includes('ballet')) 
    categories.push('dance');
  
  // Add entertainment as a fallback
  if (categories.length === 0) {
    categories.push('entertainment');
  }
  
  return [...new Set(categories)]; // Remove duplicates
}

module.exports = {
  scrape
};