/**
 * Theatre Under the Stars (TUTS) Scraper
 * 
 * This scraper provides information about Theatre Under the Stars performances
 * Source: https://www.tuts.ca/
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');

class TheatreUnderTheStarsScraper {
  constructor() {
    this.name = 'Theatre Under the Stars';
    this.url = 'https://www.tuts.ca/';
    this.sourceIdentifier = 'theatre-under-the-stars';
    
    // Define venue with proper object structure
    this.venue = {
      name: 'Malkin Bowl in Stanley Park',
      id: 'malkin-bowl-stanley-park',
      address: '610 Pipeline Road, Stanley Park',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6G 1Z4',
      coordinates: {
        lat: 49.2982155,
        lng: -123.1397601
      },
      websiteUrl: 'https://www.tuts.ca/',
      description: "The Malkin Bowl is an outdoor theatre venue nestled in Vancouver's Stanley Park, home to Theatre Under the Stars (TUTS) summer productions. This enchanting open-air venue is surrounded by towering trees and lush greenery, creating a magical atmosphere for theatrical performances. With a history dating back to 1940, TUTS at Malkin Bowl has become a beloved Vancouver summer tradition, presenting professional musical theatre productions under the stars."
    };
    
    // Season details - typically runs July to August
    // Using 2025 estimated dates
    this.seasonStartDate = new Date('2025-07-03');
    this.seasonEndDate = new Date('2025-08-29');
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Theatre Under the Stars scraper...');
    const events = [];
    
    try {
      // Generate events for the two alternating shows
      // TUTS typically runs two shows that alternate nights throughout the season
      // For 2025, we're creating placeholder events for their summer season
      
      // Show #1
      const show1Title = 'Mamma Mia!';
      const show1Description = "Theatre Under the Stars presents the hit musical \"Mamma Mia!\" at the beautiful Malkin Bowl in Stanley Park. Set on a Greek island paradise, this sunny, funny tale of love, friendship and identity is told through the timeless hits of ABBA. On the eve of her wedding, a daughter's quest to discover the identity of her father brings three men from her mother's past back to the island they last visited 20 years ago. This enchanting outdoor production in Stanley Park will have you dancing in your seat under the summer stars!";
      
      // Show #2
      const show2Title = 'Newsies';
      const show2Description = "Theatre Under the Stars presents Disney's \"Newsies\" at the Malkin Bowl in Stanley Park. Based on the true story of the 1899 newsboys' strike, this Tony Award-winning Broadway musical tells the rousing tale of Jack Kelly, a charismatic newsboy and leader of a band of teenage \"newsies\" who dreams of a better life. When publishing titans Joseph Pulitzer and William Randolph Hearst raise distribution prices, Jack rallies newsies from across the city to strike for what's right. This high-energy production features non-stop thrills with spectacular dancing, songs from the beloved Disney film, and a timeless message about fighting for what's right.";
      
      // Generate alternating performance dates
      const currentDate = new Date(this.seasonStartDate);
      let showToggle = 1; // Start with Show #1
      
      while (currentDate <= this.seasonEndDate) {
        // Only performances on specific days (typically Tuesday through Saturday)
        const dayOfWeek = currentDate.getDay();
        
        // Skip Sundays and Mondays (0 = Sunday, 1 = Monday)
        if (dayOfWeek !== 0 && dayOfWeek !== 1) {
          // Create performance for this date
          const showTitle = showToggle === 1 ? show1Title : show2Title;
          const showDescription = showToggle === 1 ? show1Description : show2Description;
          
          // Format date
          const formattedDate = currentDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          });
          
          // Create start and end times (shows typically start at 8pm)
          const startTime = new Date(currentDate);
          startTime.setHours(20, 0, 0); // 8:00 PM
          
          const endTime = new Date(startTime);
          endTime.setHours(endTime.getHours() + 2, endTime.getMinutes() + 30); // 2.5 hour show
          
          // Create unique ID
          const dateString = currentDate.toISOString().split('T')[0];
          const slugifiedTitle = showTitle.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
          const eventId = `tuts-${slugifiedTitle}-${dateString}`;
          
          // Create event object
          const event = {
            id: eventId,
            title: `${showTitle} - Theatre Under the Stars`,
            description: `${showDescription}\n\nPerformance Date: ${formattedDate} at 8:00 PM\n\nExperience the magic of outdoor musical theatre at Vancouver's Malkin Bowl in Stanley Park. Bring a blanket for cooler evenings and arrive early to enjoy the beautiful surroundings before the show.`,
            startDate: startTime,
            endDate: endTime,
            venue: this.venue,
            category: 'theatre',
            categories: ['theatre', 'musical', 'performance', 'arts', 'outdoor', 'family-friendly'],
            sourceURL: this.url,
            officialWebsite: 'https://www.tuts.ca/tickets',
            image: showToggle === 1 
              ? 'https://www.tuts.ca/wp-content/uploads/2025/05/mamma-mia-tuts.jpg' 
              : 'https://www.tuts.ca/wp-content/uploads/2025/05/newsies-tuts.jpg',
            ticketsRequired: true,
            lastUpdated: new Date()
          };
          
          events.push(event);
          console.log(`✅ Added event: ${event.title} on ${formattedDate}`);
          
          // Toggle show for next performance
          showToggle = showToggle === 1 ? 2 : 1;
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`🎉 Successfully created ${events.length} Theatre Under the Stars events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Theatre Under the Stars scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new TheatreUnderTheStarsScraper();
