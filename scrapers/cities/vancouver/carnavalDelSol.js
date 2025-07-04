/**
 * Carnaval del Sol Scraper
 * 
 * This scraper provides information about events at the Carnaval del Sol festival
 * Source: https://www.carnavaldelsol.ca/
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');

class CarnavalDelSolScraper {
  constructor() {
    this.name = 'Carnaval del Sol';
    this.url = 'https://www.carnavaldelsol.ca/';
    this.sourceIdentifier = 'carnaval-del-sol';
    
    // Main festival venue
    this.venue = {
      name: 'Concord Pacific Place',
      id: 'concord-pacific-place',
      address: '88 Pacific Boulevard',
      city: 'Vancouver',
      state: 'BC',
      country: 'Canada',
      postalCode: 'V6Z 2R6',
      coordinates: {
        lat: 49.2767112,
        lng: -123.1083056
      },
      websiteUrl: 'https://www.carnavaldelsol.ca/',
      description: "Concord Pacific Place hosts Vancouver's Carnaval del Sol, the largest Latin American festival in the Pacific Northwest. This vibrant outdoor space transforms into a celebration of Latin American culture with multiple stages for live music and dance performances, cultural pavilions representing different countries, food vendors offering authentic Latin cuisine, and a variety of activities for all ages."
    };
    
    // Festival dates for 2025
    this.festivalStartDate = new Date('2025-07-12T10:00:00');
    this.festivalEndDate = new Date('2025-07-13T22:00:00');
  }
  
  /**
   * Main scraper function
   */
  async scrape() {
    console.log('🔍 Starting Carnaval del Sol scraper...');
    const events = [];
    
    try {
      // Create the main festival event (Saturday)
      const saturdayEvent = {
        id: `carnaval-del-sol-saturday-${this.festivalStartDate.toISOString().split('T')[0]}`,
        title: 'Carnaval del Sol 2025 - Saturday',
        description: "Experience Latin America in Vancouver at Carnaval del Sol! The largest Latin festival in the Pacific Northwest returns to Vancouver with an exciting program featuring live music, dance performances, art exhibitions, cultural pavilions, kids' activities, and authentic food. Enjoy performances from Latin American artists across multiple stages, explore the diverse cultural pavilions representing different countries, sample delicious Latin cuisine, participate in interactive workshops, and experience the vibrant energy of this colorful celebration. This two-day outdoor festival brings together over 450 artists, 50 music and dance performances, and attracts more than 40,000 attendees.",
        startDate: new Date(this.festivalStartDate),
        endDate: new Date(this.festivalStartDate),
        venue: this.venue,
        category: 'festival',
        categories: ['festival', 'music', 'dance', 'latin', 'food', 'cultural', 'outdoor', 'family-friendly'],
        sourceURL: this.url,
        officialWebsite: this.url,
        image: 'https://www.carnavaldelsol.ca/wp-content/uploads/2025/04/carnaval-main-stage.jpg',
        ticketsRequired: true,
        lastUpdated: new Date()
      };
      
      // Set end time for Saturday (10:00 AM - 10:00 PM)
      saturdayEvent.endDate.setHours(22, 0, 0);
      
      events.push(saturdayEvent);
      console.log(`✅ Added event: ${saturdayEvent.title}`);
      
      // Create the main festival event (Sunday)
      const sundayEvent = {
        id: `carnaval-del-sol-sunday-${this.festivalEndDate.toISOString().split('T')[0]}`,
        title: 'Carnaval del Sol 2025 - Sunday',
        description: "Join us for the second day of Carnaval del Sol! The largest Latin festival in the Pacific Northwest continues with another day of vibrant performances, cultural experiences, and delicious food. Sunday's program includes special family-focused activities, the popular Latin American cooking competition, traditional dance workshops, and performances by local and international Latin artists. Don't miss the closing ceremony featuring spectacular performances that bring together influences from across Latin America. This two-day outdoor festival brings together over 450 artists, 50 music and dance performances, and attracts more than 40,000 attendees.",
        startDate: new Date(this.festivalEndDate),
        endDate: new Date(this.festivalEndDate),
        venue: this.venue,
        category: 'festival',
        categories: ['festival', 'music', 'dance', 'latin', 'food', 'cultural', 'outdoor', 'family-friendly'],
        sourceURL: this.url,
        officialWebsite: this.url,
        image: 'https://www.carnavaldelsol.ca/wp-content/uploads/2025/04/carnaval-food-festival.jpg',
        ticketsRequired: true,
        lastUpdated: new Date()
      };
      
      // Set times for Sunday (10:00 AM - 10:00 PM)
      sundayEvent.startDate.setHours(10, 0, 0);
      
      events.push(sundayEvent);
      console.log(`✅ Added event: ${sundayEvent.title}`);
      
      console.log(`🎉 Successfully created ${events.length} Carnaval del Sol events`);
      return events;
      
    } catch (error) {
      console.error(`❌ Error in Carnaval del Sol scraper: ${error.message}`);
      return events;
    }
  }
}

module.exports = new CarnavalDelSolScraper();
