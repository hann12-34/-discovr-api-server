/**
 * Penthouse Nightclub Events Scraper
 * Scrapes events from Penthouse Nightclub Vancouver
 * Website: http://www.penthousenightclub.com/events/
 */

const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

const PenthouseNightclubEvents = {
  name: 'Penthouse Nightclub',
  url: 'http://www.penthousenightclub.com/events/',
  
  /**
   * Scrape events from Penthouse Nightclub
   */
  async scrape() {
    console.log('🔍 Scraping events from Penthouse Nightclub...');
    
    try {
      const response = await axios.get(this.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const events = [];

      // Look for specific event sections
      $('h3, h4, .event, [class*="event"]').each((index, element) => {
        const $element = $(element);
        const text = $element.text().trim();
        
        // Look for event-related content
        if (text.toLowerCase().includes('night') || 
            text.toLowerCase().includes('show') || 
            text.toLowerCase().includes('tour') ||
            text.toLowerCase().includes('amateur') ||
            text.toLowerCase().includes('secrets')) {
          
          const $parent = $element.parent();
          const description = $parent.text().trim();
          
          // Extract event details
          const eventTitle = text;
          const eventDescription = description.length > text.length ? description : text;
          
          const event = {
            id: crypto.createHash('md5').update(`penthouse-${eventTitle}`).digest('hex'),
            title: `Vancouver - ${eventTitle}`,
            description: eventDescription,
            venue: 'Penthouse Nightclub',
            location: '1019 Seymour Street, Vancouver, BC V6B 3M4',
            date: this.extractDate(eventDescription) || this.getNextEventDate(eventTitle),
            time: this.extractTime(eventDescription) || '9:00 PM',
            price: this.extractPrice(eventDescription) || 'Contact venue',
            url: this.url,
            source: 'penthouse-nightclub',
            category: 'nightlife',
            tags: ['nightlife', 'adult entertainment', 'vancouver', 'downtown'],
            image: null
          };
          
          events.push(event);
        }
      });

      // Add recurring events based on the website content
      const recurringEvents = [
        {
          title: 'Vancouver - Amateur Night',
          description: 'BEGINNERS BARE ALL - Watch future entertainers debut their dance moves. Last THURSDAY of every month!',
          schedule: 'last-thursday'
        },
        {
          title: 'Vancouver - Secrets Tour',
          description: 'Join "Secrets of the Penthouse", Forbidden Vancouver\'s behind-the-scenes guided tour of the legendary Vancouver nightclub, followed by dinner and a cabaret show.',
          schedule: 'weekly'
        },
        {
          title: 'Vancouver - The Original Strip',
          description: 'Step into Vancouver\'s Original Strip, the infamous Penthouse Nightclub. Come for the exotic dancing, cabaret, burlesque.',
          schedule: 'nightly'
        }
      ];

      for (const recurring of recurringEvents) {
        const eventDate = this.getRecurringEventDate(recurring.schedule);
        
        const event = {
          id: crypto.createHash('md5').update(`penthouse-${recurring.title}-${eventDate.toISOString()}`).digest('hex'),
          title: recurring.title,
          description: recurring.description,
          venue: 'Penthouse Nightclub',
          location: '1019 Seymour Street, Vancouver, BC V6B 3M4',
          date: eventDate,
          time: '9:00 PM',
          price: 'Contact venue',
          url: this.url,
          source: 'penthouse-nightclub',
          category: 'nightlife',
          tags: ['nightlife', 'adult entertainment', 'vancouver', 'downtown', 'recurring'],
          image: null,
          recurring: true
        };
        
        events.push(event);
      }

      // Remove duplicates
      const uniqueEvents = [];
      for (const event of events) {
        const isDuplicate = uniqueEvents.some(existing => 
          existing.title === event.title && 
          Math.abs(existing.date.getTime() - event.date.getTime()) < 24 * 60 * 60 * 1000
        );
        
        if (!isDuplicate) {
          uniqueEvents.push(event);
        }
      }

      console.log(`✅ Found ${uniqueEvents.length} events from Penthouse Nightclub`);
      return uniqueEvents;

    } catch (error) {
      console.error('❌ Error scraping Penthouse Nightclub:', error.message);
      
      // Return fallback events if scraping fails
      return this.getFallbackEvents();
    }
  },

  /**
   * Get fallback events if scraping fails
   */
  getFallbackEvents() {
    console.log('ℹ️ Using fallback events for Penthouse Nightclub');
    
    const fallbackEvents = [
      {
        title: 'Vancouver - Amateur Night',
        description: 'Monthly amateur night at Penthouse Nightclub - last Thursday of every month',
        schedule: 'last-thursday'
      },
      {
        title: 'Vancouver - Weekend Entertainment',
        description: 'Weekend nightlife and entertainment at Vancouver\'s legendary Penthouse Nightclub',
        schedule: 'weekend'
      }
    ];

    return fallbackEvents.map(event => ({
      id: crypto.createHash('md5').update(`penthouse-fallback-${event.title}`).digest('hex'),
      title: event.title,
      description: event.description,
      venue: 'Penthouse Nightclub',
      location: '1019 Seymour Street, Vancouver, BC V6B 3M4',
      date: this.getRecurringEventDate(event.schedule),
      time: '9:00 PM',
      price: 'Contact venue',
      url: this.url,
      source: 'penthouse-nightclub',
      category: 'nightlife',
      tags: ['nightlife', 'adult entertainment', 'vancouver', 'downtown'],
      image: null,
      fallback: true
    }));
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
          if (!isNaN(date.getTime()) && date > new Date()) {
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
      /cover/i
    ];

    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (pattern.source.includes('free')) {
          return 'Free';
        }
        if (pattern.source.includes('cover')) {
          return 'Cover charge applies';
        }
        return `$${match[1] || match[0]}`;
      }
    }
    return null;
  },

  /**
   * Get next event date based on event title
   */
  getNextEventDate(title) {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('amateur') && titleLower.includes('night')) {
      return this.getLastThursdayOfMonth();
    }
    
    if (titleLower.includes('weekend') || titleLower.includes('saturday')) {
      return this.getNextWeekday('saturday');
    }
    
    if (titleLower.includes('friday')) {
      return this.getNextWeekday('friday');
    }
    
    // Default to next weekend
    return this.getNextWeekday('friday');
  },

  /**
   * Get recurring event date based on schedule
   */
  getRecurringEventDate(schedule) {
    switch (schedule) {
      case 'last-thursday':
        return this.getLastThursdayOfMonth();
      case 'weekly':
        return this.getNextWeekday('friday');
      case 'weekend':
        return this.getNextWeekday('saturday');
      case 'nightly':
        return this.getNextWeekday('friday');
      default:
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  },

  /**
   * Get last Thursday of current month
   */
  getLastThursdayOfMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Get last day of month
    const lastDay = new Date(year, month + 1, 0);
    
    // Find last Thursday
    while (lastDay.getDay() !== 4) { // 4 = Thursday
      lastDay.setDate(lastDay.getDate() - 1);
    }
    
    // If it's already passed, get next month's last Thursday
    if (lastDay < now) {
      const nextMonth = new Date(year, month + 2, 0);
      while (nextMonth.getDay() !== 4) {
        nextMonth.setDate(nextMonth.getDate() - 1);
      }
      return nextMonth;
    }
    
    return lastDay;
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

module.exports = PenthouseNightclubEvents;
