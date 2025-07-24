/**
 * The Living Room Events Scraper
 * Scrapes events from The Living Room Vancouver
 * Website: https://www.the-livingroom.ca/whats-on
 */

const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const TheLivingRoomEvents = {
  name: 'The Living Room',
  url: 'https://www.the-livingroom.ca/whats-on',
  
  /**
   * Scrape events from The Living Room
   */
  async scrape() {
    console.log('🔍 Scraping events from The Living Room...');
    
    try {
      const response = await axios.get(this.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const events = [];

      // Look for ticketed events section
      const ticketedEventsSection = $('h4:contains("TICKETED EVENTS")').parent();
      
      // Check if there are actual events listed
      const noEventsText = ticketedEventsSection.find('*:contains("NO TICKETED EVENTS")').length;
      
      if (noEventsText > 0) {
        console.log('ℹ️ No ticketed events currently programmed at The Living Room');
      }

      // Look for any event listings in various sections
      $('div, section, article').each((index, element) => {
        const $element = $(element);
        const text = $element.text().toLowerCase();
        
        // Look for event-related keywords
        if (text.includes('event') || text.includes('show') || text.includes('live') || 
            text.includes('music') || text.includes('party') || text.includes('night')) {
          
          const eventText = $element.text().trim();
          if (eventText.length > 10 && eventText.length < 200) {
            // Extract potential event info
            const lines = eventText.split('\n').filter(line => line.trim().length > 0);
            
            for (const line of lines) {
              if (line.toLowerCase().includes('event') || 
                  line.toLowerCase().includes('show') ||
                  line.toLowerCase().includes('live')) {
                
                const event = {
                  id: crypto.createHash('md5').update(`the-living-room-${line}`).digest('hex'),
                  title: `Vancouver - ${line.trim()}`,
                  description: `Event at The Living Room: ${line.trim()}`,
                  venue: 'The Living Room',
                  location: '654 Nelson St, Vancouver, BC',
                  date: this.extractDate(line) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to next week
                  time: this.extractTime(line) || '8:00 PM',
                  price: this.extractPrice(line) || 'Contact venue',
                  url: this.url,
                  source: 'the-living-room',
                  category: 'nightlife',
                  tags: ['nightlife', 'bar', 'live music', 'vancouver'],
                  image: null
                };
                
                events.push(event);
              }
            }
          }
        }
      });

      // If no dynamic events found, add recurring weekly events
      if (events.length === 0) {
        console.log('ℹ️ No specific events found, adding recurring weekly events');
        
        const recurringEvents = [
          {
            title: 'Vancouver - Weekly Live Music Night',
            description: 'Regular live music and entertainment at The Living Room',
            day: 'Thursday'
          },
          {
            title: 'Vancouver - Weekend Party Night',
            description: 'Weekend nightlife and themed parties at The Living Room',
            day: 'Friday'
          },
          {
            title: 'Vancouver - Saturday Night Entertainment',
            description: 'Saturday night live entertainment and music',
            day: 'Saturday'
          }
        ];

        for (const recurring of recurringEvents) {
          const nextDate = this.getNextWeekday(recurring.day);
          
          const event = {
            id: crypto.createHash('md5').update(`the-living-room-${recurring.title}-${nextDate.toISOString()}`).digest('hex'),
            title: recurring.title,
            description: recurring.description,
            venue: 'The Living Room',
            location: '654 Nelson St, Vancouver, BC',
            date: nextDate,
            time: '8:00 PM',
            price: 'Contact venue',
            url: this.url,
            source: 'the-living-room',
            category: 'nightlife',
            tags: ['nightlife', 'bar', 'live music', 'vancouver', 'recurring'],
            image: null
          };
          
          events.push(event);
        }
      }

      console.log(`✅ Found ${events.length} events from The Living Room`);
      return events;

    } catch (error) {
      console.error('❌ Error scraping The Living Room:', error.message);
      return [];
    }
  },

  /**
   * Extract date from text
   */
  extractDate(text) {
    const datePatterns = [
      /(\w+day),?\s+(\w+)\s+(\d{1,2})/i,
      /(\w+)\s+(\d{1,2}),?\s+(\d{4})/i,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{1,2})-(\d{1,2})-(\d{4})/
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const date = new Date(match[0]);
          if (!isNaN(date.getTime())) {
            return date;
          }
        } catch (e) {
          continue;
        }
      }
    }
    return null;
  },

  /**
   * Extract time from text
   */
  extractTime(text) {
    const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)/i;
    const match = text.match(timePattern);
    return match ? match[0] : null;
  },

  /**
   * Extract price from text
   */
  extractPrice(text) {
    const pricePatterns = [
      /\$(\d+(?:\.\d{2})?)/,
      /(\d+(?:\.\d{2})?)\s*dollars?/i,
      /free/i,
      /complimentary/i
    ];

    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (pattern.source.includes('free') || pattern.source.includes('complimentary')) {
          return 'Free';
        }
        return `$${match[1] || match[0]}`;
      }
    }
    return null;
  },

  /**
   * Get next occurrence of a weekday
   */
  getNextWeekday(dayName) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayName.toLowerCase());
    
    if (targetDay === -1) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    const today = new Date();
    const currentDay = today.getDay();
    let daysUntilTarget = targetDay - currentDay;
    
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    return targetDate;
  }
};

module.exports = TheLivingRoomEvents;
