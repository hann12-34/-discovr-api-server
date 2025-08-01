/**
 * HelloBC Events Scraper
 * 
 * This scraper provides information about events from HelloBC (British Columbia's official tourism website)
 * Source: https://www.hellobc.com/things-to-do/events/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const slugify = require('slugify');

class HelloBCEventsScraper {
  constructor() {
    this.name = 'HelloBC Events';
    this.url = 'https://www.hellobc.com/things-to-do/events/';
    this.sourceIdentifier = 'hellobc-events';
    
    // This isn't a traditional venue but rather a source/aggregator of events across BC
    // However, we'll create a "virtual venue" to maintain consistency with the scraper structure
    this.venue = {
      name: "HelloBC Events",
      id: "hellobc-events",
      address: "Multiple locations across British Columbia",
      city: "Vancouver",
      state: "BC",
      country: "Canada",
      websiteUrl: "https://www.hellobc.com/things-to-do/events/",
      description: "HelloBC is British Columbia's official tourism website, providing comprehensive information about events, festivals, and activities across the province. It showcases a curated selection of notable events from Vancouver and beyond to highlight the best experiences for tourists and locals alike."
    };

  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting HelloBC Events scraper...');
    const events = [];
    
    try {
      // Get events from the main events page
      console.log('Fetching events from HelloBC website...');
      const mainPageEvents = await this.fetchEventsFromMainPage();
      
      // Process each event to get detailed information
      const eventPromises = mainPageEvents.map(url => this.fetchEventDetails(url));
      const eventResults = await Promise.all(eventPromises);
      
      // Filter out null events (those that were skipped due to being generic)
      const validEvents = eventResults.filter(event => event !== null);
      
      // Add events to the result
      events.push(...validEvents);
      
      console.log(`✅ Found ${events.length} valid events from HelloBC (filtered out ${eventResults.length - validEvents.length} generic entries)`);
      
      return events;

    } catch (error) {
      console.error(`❌ Error in HelloBC Events scraper: ${error.message}`);
      return events;
    }
  }

  /**
   * Fetch events from the main HelloBC events page
   */
  async fetchEventsFromMainPage() {
    const eventUrls = [];

    try {
      // Fetch the main events page
      const response = await axios.get(this.url);
      const $ = cheerio.load(response.data);

      // Find event links by targeting the event cards specifically
      $('.js-event-card').each((i, element) => {
        // Get the event title
        const title = $(element).find('h4').text().trim();
        
        // Skip if no title or if title looks like a social media button
        if (!title || title.includes('Share') || title.includes('Pin') || title.includes('Logo')) {
          return;
        }
        
        // Find the link within the event card
        const link = $(element).closest('a');
        let href = link.attr('href');
        
        // If no direct link, try to find a link within the card
        if (!href) {
          href = $(element).find('a').attr('href');
        }

        // If still no link, look for parent links
        if (!href) {
          href = $(element).parent().closest('a').attr('href');
        }

        // Process the URL if found
        if (href) {
          // Make sure it's an event page and not a category page
          if (href.includes('/events/') || href.includes('/event/')) {
            // Convert relative URLs to absolute
            const eventUrl = href.startsWith('http') ? href : `https://www.hellobc.com${href}`;
            
            // Skip known non-event URLs
            if (eventUrl.includes('pinterest.com') || 
                eventUrl.includes('facebook.com') || 
                eventUrl.includes('twitter.com') || 
                eventUrl.includes('instagram.com')) {
              return;
            }

            // Avoid duplicates
            if (!eventUrls.includes(eventUrl)) {
              eventUrls.push(eventUrl);
              console.log(`Found event: ${title} at ${eventUrl}`);
            }
          }
        }
      });

      console.log(`Found ${eventUrls.length} event links on the main page`);

      // If we didn't find any events with the first method, try a more general approach
      if (eventUrls.length === 0) {
        // Look for links that might be events
        $('a').each((i, element) => {
          const href = $(element).attr('href');
          const text = $(element).text().trim();
          
          // Skip empty links, social media links, or navigation links
          if (!href || !text || 
              href.includes('pinterest.com') || 
              href.includes('facebook.com') || 
              href.includes('twitter.com') || 
              href.includes('instagram.com') ||
              text.length < 3) {
            return;
          }
          
          // Look for event-like URLs
          if ((href.includes('/events/') || href.includes('/event/')) && 
              !href.endsWith('/events/') && 
              !href.endsWith('/event/')) {
            
            const eventUrl = href.startsWith('http') ? href : `https://www.hellobc.com${href}`;
            
            if (!eventUrls.includes(eventUrl)) {
              eventUrls.push(eventUrl);
              console.log(`Found event (alternate method): ${text} at ${eventUrl}`);
            }
          }
        });

        console.log(`Found ${eventUrls.length} event links with alternate selector`);
      }

      // If we still don't have enough events, try one more approach with the event card class
      if (eventUrls.length < 5) {
        $('.box.side').each((i, element) => {
          const title = $(element).find('h4').text().trim();
          if (title && title.length > 3) {
            // Try to find a link associated with this event card
            let href = $(element).find('a').attr('href');
            
            if (href) {
              const eventUrl = href.startsWith('http') ? href : `https://www.hellobc.com${href}`;
              
              if (!eventUrls.includes(eventUrl)) {
                eventUrls.push(eventUrl);
                console.log(`Found event (box method): ${title} at ${eventUrl}`);
              }
            }
          }
        });
        
        console.log(`Found ${eventUrls.length} total event links after all methods`);
      }

      // Limit to 15 events for testing
      return eventUrls.slice(0, 15);

    } catch (error) {
      console.error(`❌ Error fetching events from main page: ${error.message}`);
      return eventUrls;
    }
  }

  /**
   * Fetch details for a specific event
   */
  async fetchEventDetails(eventUrl) {
    try {
      console.log(`Fetching details for event: ${eventUrl}`);

      // Fetch the event page
      const response = await axios.get(eventUrl);
      const $ = cheerio.load(response.data);

      // Extract event details
      // First try to get the title from the h1, then try other heading elements
      let title = $('h1').first().text().trim();
      
      // If no title found or it's too generic, try other heading elements
      if (!title || title.length < 3 || title.toLowerCase().includes('logo') || title.toLowerCase().includes('share')) {
        title = $('h2').first().text().trim() || $('h3').first().text().trim() || $('h4').first().text().trim();
      }
      
      // If still no good title, try to get it from the meta tags
      if (!title || title.length < 3) {
        title = $('meta[property="og:title"]').attr('content') || 
                $('meta[name="title"]').attr('content') || 
                $('title').text().trim();
      }
      
      // Clean up the title
      title = title.replace('HelloBC', '').replace('| British Columbia', '').trim();
      
      // If title is still not good, skip this event
      if (!title || title.length < 3 || 
          title.toLowerCase().includes('logo') || 
          title.toLowerCase().includes('share') || 
          title.toLowerCase().includes('pin')) {
        console.log(`❌ Could not find a valid title for ${eventUrl}`);
        return null;
      }

      // Try to find the event date
      let dateText = '';
      
      // Look for date elements with specific classes or attributes
      $('.date, .event-date, [itemprop="startDate"], .calendar-date, .event-time, time').each((i, element) => {
        const text = $(element).text().trim();
        if (text && !dateText && text.length > 3) {
          dateText = text;
        }
      });

      // If we couldn't find a specific date element, look for date patterns in the text
      if (!dateText) {
        const pageText = $('body').text();
        // Look for date patterns like "July 4, 2025" or "July 4-10, 2025"
        const datePattern = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*[-–]\s*\d{1,2}(?:st|nd|rd|th)?)?\s*,\s*\d{4}\b/gi;
        const dateMatches = pageText.match(datePattern);
        if (dateMatches && dateMatches.length > 0) {
          dateText = dateMatches[0];
        }
      }

      // Parse the date - this is a simplified approach
      let startDate = new Date();
      let endDate = new Date();
      endDate.setHours(23, 59, 59);
      
      // If we found a date, try to parse it
      if (dateText) {
        // Try to parse the date text
        const parsedDate = new Date(dateText);
        if (!isNaN(parsedDate.getTime())) {
          startDate = parsedDate;
          // Set end date to the same day by default
          endDate = new Date(parsedDate);
          endDate.setHours(23, 59, 59);
        } else {
          // Check if it's a date range
          const dateRangeMatch = dateText.match(/([A-Za-z]+\s+\d{1,2})\s*[-–]\s*(\d{1,2})\s*,\s*(\d{4})/);
          if (dateRangeMatch) {
            const startDateText = `${dateRangeMatch[1]}, ${dateRangeMatch[3]}`;
            const endDateText = `${dateRangeMatch[2]}, ${dateRangeMatch[3]}`;
            
            const parsedStartDate = new Date(startDateText);
            const parsedEndDate = new Date(endDateText);
            
            if (!isNaN(parsedStartDate.getTime()) && !isNaN(parsedEndDate.getTime())) {
              startDate = parsedStartDate;
              endDate = parsedEndDate;
              endDate.setHours(23, 59, 59);
            }
          }
        }
      }

      // Extract description
      let description = '';
      
      // First try to get the meta description
      const metaDescription = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content');
      if (metaDescription && metaDescription.length > 50) {
        description = metaDescription + '\n\n';
      }
      
      // Then look for substantial paragraphs
      $('p, [itemprop="description"], .description, .event-description').each((i, element) => {
        const text = $(element).text().trim();
        if (text && text.length > 50 && !text.includes('©') && !text.includes('copyright')) {
          description += text + '\n\n';
        }
      });
      
      // If description is still too short, try to get more content
      if (description.length < 100) {
        $('.content, .event-content, article').each((i, element) => {
          const text = $(element).text().trim();
          if (text && text.length > 100) {
            description += text + '\n\n';
          }
        });
      }

      // Extract location
      let location = {
        name: '',
        address: '',
        city: 'Vancouver', // Default to Vancouver if we can't find specific location
        state: 'BC',
        country: 'Canada'
      };

      // Look for location information
      $('[itemprop="location"], .location, .venue, .address, .event-location').each((i, element) => {
        const text = $(element).text().trim();
        if (text) {
          location.name = text;

          // Try to extract city from location
          const cityMatch = text.match(/\b(?:Vancouver|Victoria|Whistler|Kelowna|Richmond|Burnaby|Surrey|Malahat|Oliver|Ladner)\b/);
          if (cityMatch) {
            location.city = cityMatch[0];
          }
        }
      });
      
      // If we couldn't find a location name, use the title
      if (!location.name) {
        // Check if the event title contains a location
        const locationMatch = title.match(/\bat\s+(.+?)\b/i);
        if (locationMatch) {
          location.name = locationMatch[1];
        } else {
          // Extract city from the title if possible
          const cityMatch = title.match(/\b(?:Vancouver|Victoria|Whistler|Kelowna|Richmond|Burnaby|Surrey|Malahat|Oliver|Ladner)\b/);
          if (cityMatch) {
            location.city = cityMatch[0];
            location.name = `${cityMatch[0]} Venue`;
          } else if (location.address) {
            location.name = location.address.split(',')[0];
          } else {
            // Only use as last resort with clear indication it's approximate
            location.name = 'Venue (Location details pending)';
          }
        }
      }

      // Extract image
      let imageUrl = null;
      
      // First try to get the OpenGraph image
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) {
        imageUrl = ogImage;
      } else {
        // Look for large images
        $('img').each((i, element) => {
          const src = $(element).attr('src');
          const srcset = $(element).attr('srcset');
          const alt = $(element).attr('alt');
          const width = $(element).attr('width');
          const height = $(element).attr('height');
          
          // Skip small images, icons, logos, and social media buttons
          if (src && !imageUrl && 
              !src.includes('logo') && 
              !src.includes('icon') && 
              !src.includes('share') && 
              !src.includes('social') &&
              (!width || parseInt(width) > 200) && 
              (!height || parseInt(height) > 200)) {
            imageUrl = src.startsWith('http') ? src : `https://www.hellobc.com${src}`;
          } else if (srcset && !imageUrl) {
            // Get the largest image from srcset
            const srcsetParts = srcset.split(',');
            if (srcsetParts.length > 0) {
              const lastSrc = srcsetParts[srcsetParts.length - 1].trim().split(' ')[0];
              imageUrl = lastSrc.startsWith('http') ? lastSrc : `https://www.hellobc.com${lastSrc}`;
            }
          }
        });
      }

      // Extract categories
      const categories = ['festival', 'event', 'tourism', 'british columbia'];
      
      // Look for category tags
      $('.category, .tag, .event-type, .event-category').each((i, element) => {
        const category = $(element).text().trim().toLowerCase();
        if (category && !categories.includes(category)) {
          categories.push(category);
        }
      });

      // Add city as a category
      if (location.city && !categories.includes(location.city.toLowerCase())) {
        categories.push(location.city.toLowerCase());
      }
      
      // Add categories based on the title
      if (title.toLowerCase().includes('music') || title.toLowerCase().includes('concert')) {
        categories.push('music', 'concert');
      }
      if (title.toLowerCase().includes('art') || title.toLowerCase().includes('exhibition')) {
        categories.push('art', 'exhibition');
      }
      if (title.toLowerCase().includes('food') || title.toLowerCase().includes('culinary')) {
        categories.push('food', 'culinary');
      }
      if (title.toLowerCase().includes('market')) {
        categories.push('market', 'shopping');
      }

      // Skip generic, non-specific event titles
      const genericTitles = [
        'events calendar', 'live music', 'plan your visit', 'events', 
        'calendar', 'schedule', 'maverick events', 'event at the', 'bc place event',
        'richmond night', 'khatsahlano str', 'special event', 'cancun nites'
      ];
      
      if (genericTitles.some(generic => title.toLowerCase().includes(generic))) {
        console.log(`⏭️ Skipping generic event title: ${title}`);
        return null;
      }

      // Generate a unique ID for the event
      const slugifiedTitle = slugify(title, { lower: true, strict: true });
      const eventId = `hellobc-${slugifiedTitle}`;

      // Create venue object with meaningful name
      const venueName = location.name || (location.address ? location.address.split(',')[0] : `${location.city} Event Location`);
      const venue = {
        name: venueName,
        id: `${location.city.toLowerCase().replace(/\s+/g, '-')}-${slugify(venueName, { lower: true, strict: true })}`,
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country
      };

      // Create the event object
      return {
        id: eventId,
        title: title,
        description: description.trim(),
        startDate: startDate,
        endDate: endDate,
        venue: venue,
        category: categories[0],
        categories: categories,
        sourceURL: eventUrl,
        officialWebsite: eventUrl,
        image: imageUrl,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error(`❌ Error fetching event details: ${error.message}`);
      return null;
    }
  }
}

// Export an instance of the class rather than the class definition
// Export an instance of the class rather than the class definition
module.exports = new HelloBCEventsScraper();
