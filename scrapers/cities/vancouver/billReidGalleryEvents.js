/**
 * Bill Reid Gallery Events Scraper
 * 
 * Scrapes events from the Bill Reid Gallery website
 * https://www.billreidgallery.ca/pages/events
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class BillReidGalleryEvents {
  constructor() {
    this.name = "Bill Reid Gallery";
    this.url = "https://www.billreidgallery.ca/blogs/exhibitions-page";
    this.city = "Vancouver";
    this.scraperName = "billReidGalleryEvents";
  }
  
  /**
   * Scrape events from Bill Reid Gallery website
   */
  async scrape() {
    console.log(`🔍 Starting ${this.name} scraper...`);
    
    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15');
    
    // Set navigation timeouts
    await page.setDefaultNavigationTimeout(30000);
    await page.setDefaultTimeout(30000);
    
    const events = [];
    
    try {
      console.log(`Navigating to: ${this.url}`);
      await page.goto(this.url, { waitUntil: 'networkidle2' });
      
      // Take a debug screenshot
      await page.screenshot({ path: 'billreid-gallery-debug.png' });
      console.log('✅ Saved debug screenshot');
      
      // Extract events from the page
      const extractedEvents = await page.evaluate(() => {
        // Bill Reid Gallery uses a different structure for exhibitions
        // Look for exhibition links that contain date and title information
        const exhibitionLinks = Array.from(document.querySelectorAll('a[href*="exhibitions-page/"]')).filter(link => 
          // Only include links that aren't navigation
          !link.textContent.includes('Current & Upcoming') && 
          !link.textContent.includes('Past')
        );
        
        const events = [];
        const processedUrls = new Set();
        
        // Process each exhibition link that contains date information
        exhibitionLinks.forEach(link => {
          try {
            // Skip if we've already processed this URL
            if (processedUrls.has(link.href)) return;
            processedUrls.add(link.href);
            
            // Get the text content which may include date and title
            const fullText = link.textContent.trim();
            
            // Try to extract the date if this link contains it
            let dateText = '';
            let title = '';
            
            // Pattern: dates followed by title
            const dateMatch = fullText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\s+[–-]\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i);
            
            if (dateMatch) {
              dateText = dateMatch[0];
              // Title might be after the date
              title = fullText.substring(dateMatch.index + dateMatch[0].length).trim();
              if (!title) {
                // Try to get the title from the URL
                const urlParts = link.href.split('/');
                const slug = urlParts[urlParts.length - 1];
                title = slug.split('-').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
              }
            } else {
              // If no date in this link, the link might just be the title
              title = fullText;
              
              // Look for nearby elements with date information
              const parentElement = link.parentElement;
              if (parentElement) {
                const nearbyDateElement = parentElement.querySelector('*:not(a)');
                if (nearbyDateElement && nearbyDateElement.textContent.match(/\d{4}/)) {
                  dateText = nearbyDateElement.textContent.trim();
                }
              }
            }
            
            // If this link is for an exhibition detail page
            if (link.href.includes('/exhibitions-page/') && !link.href.endsWith('/exhibitions-page')) {
              // Get image from the parent or nearby elements
              let imageUrl = null;
              let parentEl = link;
              
              // Look up to 3 levels up for an image
              for (let i = 0; i < 3; i++) {
                parentEl = parentEl.parentElement;
                if (!parentEl) break;
                
                const img = parentEl.querySelector('img');
                if (img && img.src) {
                  imageUrl = img.src;
                  break;
                }
              }
              
              // Only include if we have at least a title and a link to the detail page
              if (title && link.href) {
                events.push({
                  title: title.trim(),
                  dateText: dateText.trim(),
                  description: '',  // Will get description from the detail page
                  imageUrl,
                  eventUrl: link.href
                });
              }
            }
          } catch (e) {
            // Continue with other links
          }
        });
        
        // If we haven't found any events, look for exhibition headers that might contain links
        if (events.length === 0) {
          const exhibitionHeaders = document.querySelectorAll('h1, h2, h3');
          
          exhibitionHeaders.forEach(header => {
            try {
              // Skip if the header is empty
              if (!header.textContent.trim()) return;
              
              // Check if this header mentions exhibitions
              const isExhibitionHeader = 
                header.textContent.toLowerCase().includes('exhibition') || 
                header.textContent.toLowerCase().includes('gallery');
              
              if (isExhibitionHeader) {
                // Look for links in or near this header
                const link = header.querySelector('a') || 
                             header.nextElementSibling?.querySelector('a');
                             
                if (link && link.href) {
                  const title = header.textContent.trim();
                  
                  // Try to find date information nearby
                  let dateText = '';
                  let sibling = header.nextElementSibling;
                  
                  while (sibling && !dateText) {
                    if (sibling.textContent.match(/\d{4}/)) {
                      dateText = sibling.textContent.trim();
                      break;
                    }
                    sibling = sibling.nextElementSibling;
                  }
                  
                  // Get image if available
                  const nearbyImage = header.parentElement?.querySelector('img');
                  const imageUrl = nearbyImage ? nearbyImage.src : null;
                  
                  events.push({
                    title,
                    dateText,
                    description: '',  // Will get description from the detail page
                    imageUrl,
                    eventUrl: link.href
                  });
                }
              }
            } catch (e) {
              // Continue with other headers
            }
          });
        }
        
        // If no structured event containers found, look for event info in the page content
        if (events.length === 0) {
          // Look for headings that might be event titles
          const headings = document.querySelectorAll('h1, h2, h3');
          
          headings.forEach(heading => {
            try {
              const title = heading.textContent.trim();
              
              // Find date info - check siblings or parent's children
              let dateText = '';
              let dateElement = null;
              
              // Check next sibling for date
              let sibling = heading.nextElementSibling;
              while (sibling && !dateText) {
                if (sibling.textContent.match(/\d{1,2}(st|nd|rd|th)?(\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)/i) ||
                    sibling.textContent.match(/\d{1,2}([\/\-])\d{1,2}([\/\-])(\d{4}|\d{2})/)) {
                  dateText = sibling.textContent.trim();
                  dateElement = sibling;
                  break;
                }
                sibling = sibling.nextElementSibling;
              }
              
              // If no date found, check parent's children
              if (!dateText && heading.parentElement) {
                const children = heading.parentElement.children;
                for (const child of children) {
                  if (child !== heading && 
                      (child.textContent.match(/\d{1,2}(st|nd|rd|th)?(\s+)?(January|February|March|April|May|June|July|August|September|October|November|December)/i) ||
                       child.textContent.match(/\d{1,2}([\/\-])\d{1,2}([\/\-])(\d{4}|\d{2})/))) {
                    dateText = child.textContent.trim();
                    dateElement = child;
                    break;
                  }
                }
              }
              
              // Find description - check siblings after heading or date element
              let description = '';
              let startElement = dateElement || heading;
              
              sibling = startElement.nextElementSibling;
              while (sibling && !description && sibling.tagName !== 'H1' && sibling.tagName !== 'H2' && sibling.tagName !== 'H3') {
                if (sibling.tagName === 'P') {
                  description = sibling.textContent.trim();
                }
                sibling = sibling.nextElementSibling;
              }
              
              // Extract image - look near the heading
              let imageUrl = null;
              let imgElement = null;
              
              // Check siblings
              sibling = heading.nextElementSibling;
              while (sibling && !imageUrl && sibling.tagName !== 'H1' && sibling.tagName !== 'H2' && sibling.tagName !== 'H3') {
                imgElement = sibling.querySelector('img');
                if (imgElement) {
                  imageUrl = imgElement.src;
                  break;
                }
                sibling = sibling.nextElementSibling;
              }
              
              // If no image found, check parent
              if (!imageUrl && heading.parentElement) {
                imgElement = heading.parentElement.querySelector('img');
                if (imgElement) {
                  imageUrl = imgElement.src;
                }
              }
              
              // Extract link
              let eventUrl = '';
              let linkElement = heading.querySelector('a');
              
              if (!linkElement && heading.parentElement) {
                linkElement = heading.parentElement.querySelector('a');
              }
              
              if (linkElement) {
                eventUrl = linkElement.href;
              }
              
              // Only add if we have a title and date
              if (title && dateText) {
                events.push({
                  title,
                  dateText,
                  description,
                  imageUrl,
                  eventUrl
                });
              }
            } catch (e) {
              // Continue with other headings
            }
          });
        }
        
        return events;
      });
      
      console.log(`Found ${extractedEvents.length} events on the page`);
      
      // Process each extracted event
      for (const eventData of extractedEvents) {
        try {
          // Visit event detail page if available
          if (eventData.eventUrl) {
            console.log(`Visiting event page: ${eventData.eventUrl}`);
            await page.goto(eventData.eventUrl, { waitUntil: 'networkidle2' });
            
            // Extract detailed event info
            const eventDetails = await page.evaluate(() => {
              // Try to get a more detailed date
              const dateElement = document.querySelector('.date, time, .event-date, [datetime]');
              const dateText = dateElement ? dateElement.textContent.trim() : '';
              
              // Try to get a more detailed description
              const descElement = document.querySelector('.description, .event-description, article p');
              const description = descElement ? descElement.textContent.trim() : '';
              
              // Try to get a better image
              const imgElement = document.querySelector('.event-image img, .featured-image img, article img');
              const imageUrl = imgElement ? imgElement.src : null;
              
              return {
                dateText,
                description,
                imageUrl
              };
            });
            
            // Update event data with detailed info
            if (eventDetails.dateText) {
              eventData.dateText = eventDetails.dateText;
            }
            
            if (eventDetails.description) {
              eventData.description = eventDetails.description;
            }
            
            if (eventDetails.imageUrl) {
              eventData.imageUrl = eventDetails.imageUrl;
            }
          }
          
          // Parse the date
          const dateInfo = this.parseEventDate(eventData.dateText);
          
          if (dateInfo && eventData.title) {
            // Generate event ID
            const eventId = this.generateEventId(eventData.title, dateInfo.startDate);
            
            // Create event object
            const event = this.createEventObject(
              eventId,
              eventData.title,
              eventData.description || `${eventData.title} at ${this.name}`,
              dateInfo.startDate,
              dateInfo.endDate,
              eventData.imageUrl,
              eventData.eventUrl || this.url
            );
            
            events.push(event);
            console.log(`✅ Added event: ${eventData.title}`);
          } else {
            console.log(`⚠️ Skipped event "${eventData.title}" - invalid date: ${eventData.dateText}`);
          }
        } catch (error) {
          console.error(`Error processing event "${eventData.title}": ${error.message}`);
        }
      }
      
      // Close browser
      await browser.close();
      console.log(`🎉 Successfully scraped ${events.length} events from ${this.name}`);
      
      return events;
    } catch (error) {
      console.error(`❌ Error scraping ${this.name}: ${error.message}`);
      
      try {
        await browser.close();
      } catch (e) {
        // Browser might already be closed
      }
      
      return [];
    }
  }
  
  /**
   * Parse event date
   */
  parseEventDate(dateString) {
    if (!dateString) return null;
    
    try {
      // Clean the date string
      const cleanDateStr = dateString.trim();
      
      // Current year for reference
      const currentYear = new Date().getFullYear();
      
      // Try different date formats
      let dateObj;
      
      // Format: Month Day, Year (e.g., "July 15, 2025" or "July 15")
      const monthDayYearMatch = cleanDateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i);
      
      if (monthDayYearMatch) {
        const month = this.getMonthNumber(monthDayYearMatch[1]);
        const day = parseInt(monthDayYearMatch[2], 10);
        const year = monthDayYearMatch[3] ? parseInt(monthDayYearMatch[3], 10) : currentYear;
        
        dateObj = new Date(year, month, day, 10, 0, 0); // Default to 10:00 AM for gallery events
      }
      
      // Format: MM/DD/YYYY or DD/MM/YYYY
      if (!dateObj) {
        const slashMatch = cleanDateStr.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
        
        if (slashMatch) {
          let month, day, year;
          
          // For North America, assume MM/DD format
          month = parseInt(slashMatch[1], 10) - 1; // 0-indexed month
          day = parseInt(slashMatch[2], 10);
          year = slashMatch[3] ? parseInt(slashMatch[3], 10) : currentYear;
          
          dateObj = new Date(year, month, day, 10, 0, 0); // Default to 10:00 AM for gallery events
        }
      }
      
      // Format: YYYY-MM-DD
      if (!dateObj) {
        const isoMatch = cleanDateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        
        if (isoMatch) {
          const year = parseInt(isoMatch[1], 10);
          const month = parseInt(isoMatch[2], 10) - 1; // 0-indexed month
          const day = parseInt(isoMatch[3], 10);
          
          dateObj = new Date(year, month, day, 10, 0, 0); // Default to 10:00 AM for gallery events
        }
      }
      
      // Look for time information
      const timeMatch = cleanDateStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      
      if (dateObj && timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const isPM = timeMatch[3] && timeMatch[3].toLowerCase() === 'pm';
        
        // Adjust for PM if needed
        if (isPM && hours < 12) {
          hours += 12;
        }
        
        dateObj.setHours(hours, minutes);
      }
      
      // If we've successfully parsed a date
      if (dateObj && !isNaN(dateObj.getTime())) {
        // Gallery events typically last 2-3 hours
        const endDate = new Date(dateObj);
        endDate.setHours(endDate.getHours() + 3);
        
        return {
          startDate: dateObj,
          endDate: endDate
        };
      }
    } catch (error) {
      console.error(`Error parsing date ${dateString}: ${error.message}`);
    }
    
    return null;
  }
  
  /**
   * Convert month name to month number (0-indexed)
   */
  getMonthNumber(monthName) {
    const months = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'may': 4, 'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11
    };
    
    return months[monthName.toLowerCase()];
  }
  
  /**
   * Create an event object
   */
  createEventObject(id, title, description, startDate, endDate, imageUrl, sourceURL) {
    return {
      id,
      title,
      description,
      startDate,
      endDate,
      venue: {
        name: this.name,
        id: this.generateVenueId(this.name),
        address: "639 Hornby St",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        coordinates: {
          lat: 49.2849,
          lng: -123.1195
        },
        websiteUrl: "https://www.billreidgallery.ca/",
        description: "The Bill Reid Gallery of Northwest Coast Art is a public gallery dedicated to contemporary Indigenous Northwest Coast Art."
      },
      category: "exhibition",
      categories: ["art", "exhibition", "indigenous", "culture", "gallery"],
      sourceURL,
      officialWebsite: "https://www.billreidgallery.ca/",
      image: imageUrl,
      ticketsRequired: true,
      lastUpdated: new Date()
    };
  }
  
  /**
   * Generate a venue ID from a name
   */
  generateVenueId(name) {
    return slugify(name, {
      lower: true,
      strict: true
    });
  }
  
  /**
   * Generate an event ID
   */
  generateEventId(title, date) {
    // Create parts for ID
    const venuePart = this.generateVenueId(this.name);
    const titlePart = slugify(title, {
      lower: true,
      strict: true
    });
    
    // Format date as YYYY-MM-DD
    const datePart = date instanceof Date
      ? date.toISOString().split('T')[0]
      : 'unknown-date';
    
    return `${venuePart}-${titlePart}-${datePart}`;
  }
}

module.exports = BillReidGalleryEvents;
