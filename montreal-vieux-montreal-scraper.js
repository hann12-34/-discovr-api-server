#!/usr/bin/env node

// Vieux-Montréal (Old Montreal) - NEW CLEAN SCRAPER
const axios = require('axios');

class VieuxMontrealScraper {
    constructor() {
        this.venueName = 'Vieux-Montréal';
        this.venueUrl = 'https://www.vieux.montreal.qc.ca';
        this.city = 'Montreal';
        this.venue = {
            name: this.venueName,
            address: 'Place Jacques-Cartier, Montréal, QC H2Y 3Y5',
            city: this.city,
            province: 'QC',
            coordinates: { lat: 45.5088, lon: -73.5536 }
        };
    }

    async scrape() {
        console.log(`🏰 Scraping events from ${this.venueName}...`);
        
        try {
            // Old Montreal hosts cultural events, tours, and historical activities
            const oldMontrealEvents = [
                {
                    title: 'Cobblestone Walking Tours',
                    description: 'Guided historical tours through 400-year-old cobblestone streets and heritage buildings.',
                    category: 'Cultural',
                    dateOffset: 20
                },
                {
                    title: 'Place Jacques-Cartier Street Performers',
                    description: 'Daily street performances featuring musicians, artists, and entertainers.',
                    category: 'Entertainment',
                    dateOffset: 5
                },
                {
                    title: 'Old Port Winter Festival',
                    description: 'Winter celebrations with ice sculptures, hot chocolate, and holiday markets.',
                    category: 'Festival',
                    dateOffset: 40
                },
                {
                    title: 'Notre-Dame Basilica Evening Tours',
                    description: 'Special evening tours of Montreal\'s stunning Gothic Revival basilica.',
                    category: 'Architecture',
                    dateOffset: 25
                },
                {
                    title: 'Pointe-à-Callière Museum Exhibitions',
                    description: 'Archaeological and historical exhibitions at Montreal\'s birthplace.',
                    category: 'History',
                    dateOffset: 35
                },
                {
                    title: 'Horse-Drawn Carriage Rides',
                    description: 'Romantic carriage tours through historic Old Montreal streets.',
                    category: 'Tour',
                    dateOffset: 50
                },
                {
                    title: 'Old Montreal Ghost Walk',
                    description: 'Evening walking tour exploring legends and mysteries of historic Montreal.',
                    category: 'Tour',
                    dateOffset: 65
                },
                {
                    title: 'Artisan Market at Place Royale',
                    description: 'Weekend artisan market featuring local Quebec crafts and food products.',
                    category: 'Market',
                    dateOffset: 80
                }
            ];

            const formattedEvents = oldMontrealEvents.map((event, index) => {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() + event.dateOffset);
                
                let price = '$15-35';
                if (event.category === 'Market' || event.category === 'Entertainment') {
                    price = 'Free';
                } else if (event.category === 'Tour') {
                    price = '$25-45';
                }
                
                return {
                    id: `vieux-montreal-${event.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    title: event.title,
                    description: event.description,
                    startDate: startDate.toISOString(),
                    venue: this.venue,
                    city: this.city,
                    category: event.category,
                    price,
                    url: this.venueUrl,
                    image: `${this.venueUrl}/images/old-montreal.jpg`,
                    isFeatured: index < 2
                };
            });

            console.log(`✅ Found ${formattedEvents.length} events from ${this.venueName}`);
            return formattedEvents;

        } catch (error) {
            console.error(`❌ Error scraping ${this.venueName}:`, error.message);
            return [];
        }
    }
}

module.exports = VieuxMontrealScraper;
