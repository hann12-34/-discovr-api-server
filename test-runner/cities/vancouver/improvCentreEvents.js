/**
 * The Improv Centre Events Scraper
 * 
 * Scrapes events from The Improv Centre website
 * https://theimprovcentre.ca/shows/
 */

const puppeteer = require('puppeteer');
const slugify = require('slugify');

class ImprovCentreEvents {
  constructor() {
    this.name = "The Improv Centre";
    this.url = "https://theimprovcentre.ca/shows/";
    this.city = "Vancouver";
    this.scraperName = "improvCentreEvents";
  }
  
  /**
   * Scrape events from The Improv Centre website
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
      await page.screenshot({ path: 'improv-centre-debug.png' });
      console.log('✅ Saved debug screenshot');
      
      console.log('Looking for shows from H3 headings...');
      
      // Extract shows from H3 headings, which is how this site structures their shows
      console.log('Extracting shows from H3 headings...');
      const extractedShows = await page.evaluate(() => {
        const shows = [];
        
        // Find all H3 elements that might be show titles
        const headings = Array.from(document.querySelectorAll('h3')).filter(h => 
          h.textContent.trim() !== '' && 
          !h.textContent.toLowerCase().includes('subscribe') &&
          !h.textContent.toLowerCase().includes('contact') &&
          !h.textContent.toLowerCase().includes('location')
        );
        
        headings.forEach(heading => {
          try {
            // Get the title from the heading
            const title = heading.textContent.trim();
            
            // Find potential date information
            // Look in nearby elements (parent's children or next siblings)
            let dateText = '';
            let description = '';
            let imageUrl = null;
            let showUrl = '';
            
            // Look for a parent section or div that contains this heading
            const parentSection = heading.closest('section') || heading.closest('.elementor-widget-wrap') || heading.parentElement;
            
            if (parentSection) {
              // Look for paragraphs that might contain date information or descriptions
              const paragraphs = parentSection.querySelectorAll('p');
              if (paragraphs.length > 0) {
                // First paragraph might have date info
                const firstPara = paragraphs[0].textContent.trim();
                if (firstPara.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)\b/i) ||
                    firstPara.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/)) {
                  dateText = firstPara;
                } else {
                  description = firstPara;
                }
                
                // Additional paragraphs contribute to description
                if (paragraphs.length > 1) {
                  for (let i = 1; i < Math.min(paragraphs.length, 3); i++) {
                    description += ' ' + paragraphs[i].textContent.trim();
                  }
                }
              }
              
              // Look for images
              const images = parentSection.querySelectorAll('img');
              if (images.length > 0) {
                // Filter out small icons and logos
                const contentImages = Array.from(images).filter(img => 
                  img.width > 100 && img.height > 100 && 
                  !img.src.includes('logo') && !img.src.includes('icon')
                );
                if (contentImages.length > 0) {
                  imageUrl = contentImages[0].src;
                }
              }
              
              // Look for links
              const links = parentSection.querySelectorAll('a');
              if (links.length > 0) {
                // Look for ticket links or any link
                const ticketLink = Array.from(links).find(link => 
                  link.textContent.toLowerCase().includes('ticket') ||
                  link.href.toLowerCase().includes('ticket')
                ) || links[0];
                
                showUrl = ticketLink.href;
              }
            }
            
            // If no date text was found but we have a description, try to extract a date
            if (!dateText && description) {
              const dateMatch = description.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*[,-]?\s*\d{4})?\b/i) ||
                               description.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/);
              if (dateMatch) {
                dateText = dateMatch[0];
              }
            }
            
            // If we still don't have a date, use "Upcoming" as a generic placeholder
            if (!dateText) {
              dateText = 'Upcoming show - check website for dates';
            }
            
            // If no specific URL was found, use the main shows page
            if (!showUrl) {
              showUrl = 'https://theimprovcentre.ca/shows/';
            }
            
            shows.push({
              title,
              dateText,
              description: description.trim() || `${title} at The Improv Centre`,
              imageUrl,
              showUrl
            });
          } catch (e) {
            // Log error but continue processing
            console.error('Error processing heading:', e);
          }
        });
        
        return shows;
      });
      
      console.log(`Extracted ${extractedShows.length} shows from headings`);
      
      // Process each show
      for (const showData of extractedShows) {
        if (showData.title) {
          try {
            // If show has a URL, visit the page for more details
            if (showData.showUrl) {
              console.log(`Visiting show page: ${showData.showUrl}`);
              await page.goto(showData.showUrl, { waitUntil: 'networkidle2' });
              
              // Get detailed information
              const detailedInfo = await page.evaluate(() => {
                // Get more specific date information if available
                const dateElements = document.querySelectorAll('.date, .dates, .show-date, .event-date, time, .showtime');
                let detailedDateText = '';
                
                for (const el of dateElements) {
                  const text = el.textContent.trim();
                  if (text && text.length > detailedDateText.length) {
                    detailedDateText = text;
                  }
                }
                
                // Get full description
                const descElements = document.querySelectorAll('.description, .content, .entry-content, .show-description, article p');
                let fullDescription = '';
                
                for (const el of descElements) {
                  const text = el.textContent.trim();
                  if (text && text.length > fullDescription.length) {
                    fullDescription = text;
                  }
                }
                
                return {
                  detailedDateText,
                  fullDescription
                };
              });
              
              // Use the detailed information if available
              if (detailedInfo.detailedDateText) {
                showData.dateText = detailedInfo.detailedDateText;
              }
              
              if (detailedInfo.fullDescription) {
                showData.description = detailedInfo.fullDescription;
              }
            }
            
            // Parse the date
            const dateInfo = this.parseEventDate(showData.dateText);
            
            if (dateInfo) {
              // Create event object
              const eventId = this.generateEventId(showData.title, dateInfo.startDate);
              
              const event = this.createEventObject(
                eventId,
                showData.title,
                showData.description || `${showData.title} at ${this.name}`,
                dateInfo.startDate,
                dateInfo.endDate,
                showData.imageUrl,
                showData.showUrl || this.url
              );
              
              events.push(event);
              console.log(`✅ Added event: ${showData.title}`);
            } else {
              console.log(`⚠️ Could not parse date from: ${showData.dateText}`);
            }
          } catch (error) {
            console.error(`Error processing show ${showData.title}: ${error.message}`);
          }
        }
      }
      
      // If we haven't found any events, look for upcoming shows in the page content
      if (events.length === 0) {
        console.log('No structured events found. Looking for show information in page content...');
        
        // Extract shows from links
        const showLinks = await page.evaluate(() => {
          // Look for links that might point to shows
          const links = Array.from(document.querySelectorAll('a'));
          return links
            .filter(link => {
              const href = link.href || '';
              const text = link.textContent.trim();
              // Look for show-related links
              return (href.includes('show') || href.includes('event') || 
                     href.includes('performance') || href.includes('tickets') ||
                     text.includes('Show') || text.includes('show') ||
                     text.includes('Event') || text.includes('event'));
            })
            .map(link => ({
              url: link.href,
              text: link.textContent.trim()
            }));
        });
        
        console.log(`Found ${showLinks.length} potential show links`);
        
        // Visit up to 5 of these links to look for show details
        const linksToCheck = showLinks.slice(0, Math.min(5, showLinks.length));
        
        for (const link of linksToCheck) {
          try {
            console.log(`Checking show link: ${link.url}`);
            await page.goto(link.url, { waitUntil: 'networkidle2' });
            
            // Extract show information from the page
            const showInfo = await page.evaluate(() => {
              // Look for a title
              const titleElements = document.querySelectorAll('h1, h2, .title, .show-title, .event-title');
              let title = '';
              for (const el of titleElements) {
                const text = el.textContent.trim();
                if (text && (text.length > title.length || title === '')) {
                  title = text;
                }
              }
              
              // Look for dates
              const dateElements = document.querySelectorAll('.date, .dates, .show-date, .event-date, time, .datetime');
              let dateText = '';
              for (const el of dateElements) {
                const text = el.textContent.trim();
                if (text && (text.length > dateText.length || dateText === '')) {
                  dateText = text;
                }
              }
              
              // Look for description
              const descElements = document.querySelectorAll('p, .description, .content, .show-description');
              let description = '';
              for (const el of descElements) {
                const text = el.textContent.trim();
                if (text && (text.length > description.length || description === '')) {
                  description = text;
                }
              }
              
              // Look for images
              const imgElement = document.querySelector('.featured-image img, .show-image img, header img, .hero img, .wp-post-image');
              const imageUrl = imgElement ? imgElement.src : null;
              
              return {
                title,
                dateText,
                description,
                imageUrl
              };
            });
            
            // Only add if we found a title and date
            if (showInfo.title && showInfo.dateText) {
              // Parse date
              const dateInfo = this.parseEventDate(showInfo.dateText);
              
              if (dateInfo) {
                // Create event object
                const eventId = this.generateEventId(showInfo.title, dateInfo.startDate);
                
                const event = this.createEventObject(
                  eventId,
                  showInfo.title,
                  showInfo.description || `${showInfo.title} at ${this.name}`,
                  dateInfo.startDate,
                  dateInfo.endDate,
                  showInfo.imageUrl,
                  link.url
                );
                
                events.push(event);
                console.log(`✅ Added event from link: ${showInfo.title}`);
              }
            }
          } catch (error) {
            console.error(`Error processing link ${link.url}: ${error.message}`);
          }
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
        
        dateObj = new Date(year, month, day, 19, 30, 0); // Default to 7:30 PM for improv shows
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
          
          dateObj = new Date(year, month, day, 19, 30, 0); // Default to 7:30 PM for improv shows
        }
      }
      
      // Format: YYYY-MM-DD
      if (!dateObj) {
        const isoMatch = cleanDateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        
        if (isoMatch) {
          const year = parseInt(isoMatch[1], 10);
          const month = parseInt(isoMatch[2], 10) - 1; // 0-indexed month
          const day = parseInt(isoMatch[3], 10);
          
          dateObj = new Date(year, month, day, 19, 30, 0); // Default to 7:30 PM for improv shows
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
        // Improv shows typically last 1.5 hours
        const endDate = new Date(dateObj);
        endDate.setMinutes(endDate.getMinutes() + 90);
        
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
        address: "1502 Duranleau St",
        city: "Vancouver",
        state: "BC",
        country: "Canada",
        coordinates: {
          lat: 49.2727,
          lng: -123.1348
        },
        websiteUrl: "https://theimprovcentre.ca/",
        description: "The Improv Centre is Vancouver's premier improvisational theatre company, featuring comedy shows, classes, and corporate workshops."
      },
      category: "comedy",
      categories: ["comedy", "entertainment", "improv", "performance", "theatre"],
      sourceURL,
      officialWebsite: "https://theimprovcentre.ca/",
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

module.exports = ImprovCentreEvents;
