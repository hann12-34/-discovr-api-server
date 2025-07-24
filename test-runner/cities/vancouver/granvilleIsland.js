/**
 * Granville Island Events Scraper
 * 
 * This scraper extracts events from Granville Island's website:
 * https://granvilleisland.com/upcoming-events
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class GranvilleIslandScraper {
  constructor() {
    this.name = 'Granville Island';
    this.url = 'https://granvilleisland.com/upcoming-events';
    this.sourceIdentifier = 'granville-island';
    
    // Define venue with proper object structure
    this.venue = {
      name: 'Granville Island',
      id: 'granville-island',
      address: '1661 Duranleau St',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6H 3S3',
      coordinates: {
        lat: 49.2707,
        lng: -123.1340
      },
      websiteUrl: 'https://granvilleisland.com'
    };
  }

  /**
   * Extract event details from a specific event page
   * @param {string} url - Event page URL
   * @param {object} basicInfo - Basic event info already extracted
   * @returns {Promise<object>} - Complete event details
   */
  async scrapeEventPage(url, basicInfo) {
    try {
      console.log(`🔍 Scraping details from: ${url}`);
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      
      // Extract event time and location
      let startDate = null;
      let endDate = null;
      let location = 'Granville Island';
      let imageUrl = null;
      let description = basicInfo.description;
      let category = 'culture';
      
      // Look for date and time
      const dateTimeText = $('.page-title-meta').text().trim();
      if (dateTimeText) {
        console.log(`📅 Found date info: ${dateTimeText}`);
        // Extract date and time using regex
        const dateMatch = dateTimeText.match(/(\w+\s\d+,\s\d{4})/);
        const timeMatch = dateTimeText.match(/(\d+:\d+\s?[ap]m)\s*-\s*(\d+:\d+\s?[ap]m)/i);
        
        if (dateMatch && dateMatch[1]) {
          const dateStr = dateMatch[1];
          
          // Create date object
          startDate = new Date(dateStr);
          endDate = new Date(dateStr);
          
          // Add time if available
          if (timeMatch && timeMatch[1] && timeMatch[2]) {
            const startTimeStr = timeMatch[1];
            const endTimeStr = timeMatch[2];
            
            // Extract hours and minutes from start time
            const startTimeParts = startTimeStr.match(/(\d+):(\d+)\s*([ap]m)/i);
            if (startTimeParts) {
              let startHours = parseInt(startTimeParts[1]);
              const startMinutes = parseInt(startTimeParts[2]);
              const startPeriod = startTimeParts[3].toLowerCase();
              
              // Convert to 24-hour format
              if (startPeriod === 'pm' && startHours < 12) startHours += 12;
              if (startPeriod === 'am' && startHours === 12) startHours = 0;
              
              startDate.setHours(startHours, startMinutes, 0);
            }
            
            // Extract hours and minutes from end time
            const endTimeParts = endTimeStr.match(/(\d+):(\d+)\s*([ap]m)/i);
            if (endTimeParts) {
              let endHours = parseInt(endTimeParts[1]);
              const endMinutes = parseInt(endTimeParts[2]);
              const endPeriod = endTimeParts[3].toLowerCase();
              
              // Convert to 24-hour format
              if (endPeriod === 'pm' && endHours < 12) endHours += 12;
              if (endPeriod === 'am' && endHours === 12) endHours = 0;
              
              endDate.setHours(endHours, endMinutes, 0);
            }
          } else {
            // Default times if not specified
            startDate.setHours(10, 0, 0);
            endDate.setHours(18, 0, 0);
          }
        }
      }
      
      // Extract more detailed description
      const fullDescription = $('.field--name-body').text().trim();
      if (fullDescription) {
        description = fullDescription;
      }
      
      // Extract image
      const imageElement = $('.field--name-field-image img');
      if (imageElement.length > 0) {
        imageUrl = $(imageElement).attr('src');
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = 'https://granvilleisland.com' + imageUrl;
        }
      }
      
      // Extract specific venue location within Granville Island
      const locationElement = $('.field--name-field-event-location');
      if (locationElement.length > 0) {
        const specificLocation = locationElement.text().trim();
        if (specificLocation) {
          location = specificLocation + ', Granville Island';
        }
      }
      
      // Determine category from content
      const contentText = (description + ' ' + basicInfo.title).toLowerCase();
      if (contentText.includes('art') || contentText.includes('exhibition') || contentText.includes('gallery')) {
        category = 'art';
      } else if (contentText.includes('music') || contentText.includes('jazz') || contentText.includes('concert')) {
        category = 'music';
      } else if (contentText.includes('theatre') || contentText.includes('performance') || contentText.includes('comedy')) {
        category = 'performance';
      } else if (contentText.includes('market') || contentText.includes('food')) {
        category = 'food';
      }
      
      // Create complete event object with venue as a proper object
      return {
        ...basicInfo,
        startDate: startDate || new Date(),
        endDate: endDate || new Date(),
        venue: {
          ...this.venue,
          name: location || this.venue.name // Use specific location if available
        },
        category: category,
        image: imageUrl,
        lastUpdated: new Date()
      };
      
    } catch (error) {
      console.error(`❌ Error scraping event page ${url}: ${error.message}`);
      return basicInfo;
    }
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Granville Island events scraper...');
    const events = [];
    
    try {
      // Fetch the main events page
      const { data } = await axios.get(this.url);
      const $ = cheerio.load(data);
      
      // Find all event links
      const eventLinks = [];
      $('a[href*="/event/"]').each((i, element) => {
        const href = $(element).attr('href');
        if (href && href.includes('/event/') && !eventLinks.includes(href)) {
          eventLinks.push(href);
        }
      });
      
      console.log(`🔗 Found ${eventLinks.length} event links`);
      
      // Process each event link (limit to avoid rate limiting)
      const uniqueLinks = [...new Set(eventLinks)];
      
      for (const eventPath of uniqueLinks) {
        try {
          // Extract basic info from the main page
          let eventTitle = $(`a[href="${eventPath}"]`).first().text().trim();
          // Clean up the event title - sometimes it appears twice
          if (!eventTitle) {
            // Try to extract from header element that contains the link
            const headerWithLink = $(`h3:has(a[href="${eventPath}"])`);
            if (headerWithLink.length > 0) {
              eventTitle = $(headerWithLink).text().trim();
            }
          }
          
          // Further title cleanup - remove duplicates if title appears twice
          if (eventTitle.includes(eventTitle.split('\n')[0].trim() + '\n')) {
            eventTitle = eventTitle.split('\n')[0].trim();
          }
          
          const eventURL = eventPath.startsWith('http') ? eventPath : `https://granvilleisland.com${eventPath}`;
          
          // Generate a unique ID based on the event URL
          const eventId = `granville-island-${eventPath.split('/').pop()}`;
          
          // Extract basic description from the link context
          let basicDescription = '';
          $(`a[href="${eventPath}"]`).closest('div').find('p').each((i, el) => {
            basicDescription += $(el).text().trim() + ' ';
          });
          
          if (!basicDescription) {
            basicDescription = 'Event at Granville Island. Visit the website for more details.';
          }
          
          // Extract event title from event path if we still don't have it
          if (!eventTitle) {
            // Extract from URL path - format like "the-mousetrap" to "The Mousetrap"
            const pathTitle = eventPath.split('/').pop();
            if (pathTitle) {
              eventTitle = pathTitle
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }
          }
          
          // Create basic event info
          const basicEventInfo = {
            id: eventId,
            title: eventTitle || 'Granville Island Event',
            description: basicDescription.trim(),
            sourceURL: eventURL,
            officialWebsite: eventURL,
            recurring: null,
            categories: ['culture', 'entertainment']
          };
          
          // Fetch detailed event info
          const completeEvent = await this.scrapeEventPage(eventURL, basicEventInfo);
          events.push(completeEvent);
          console.log(`✅ Processed event: ${completeEvent.title}`);
          
          // Polite delay to avoid hammering the server
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`❌ Error processing event link ${eventPath}: ${error.message}`);
          continue;
        }
      }
      
      console.log(`🎉 Successfully scraped ${events.length} events from Granville Island`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Granville Island scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new GranvilleIslandScraper();
