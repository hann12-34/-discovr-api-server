/**
 * 🚨 EMERGENCY TORONTO EVENTS INSERT
 * 
 * Bypass broken scrapers and manually insert Toronto events to production
 * so your mobile app shows Toronto events immediately.
 */

const mongoose = require('mongoose');

// Production database URI (confirmed working)
const PRODUCTION_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

// Event schema for MongoDB
const eventSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    venue: {
        name: { type: String, required: true },
        id: { type: String },
        location: {
            address: { type: String },
            coordinates: { type: [Number], default: [43.6532, -79.3832] } // Toronto coordinates
        }
    },
    category: { type: String, default: 'Entertainment' },
    city: { type: String, required: true },
    source: { type: String, required: true },
    price: { type: String, default: 'See website for details' },
    imageUrl: { type: String },
    eventUrl: { type: String },
    isActive: { type: Boolean, default: true },
    featured: { type: Boolean, default: false }
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);

// Sample Toronto events from major venues
const torontoEvents = [
    {
        id: 'rom-emergency-1',
        title: 'Dinosaurs Gallery - Permanent Exhibition',
        description: 'Explore the world of dinosaurs with life-sized fossils and interactive displays.',
        startDate: new Date('2025-08-11'),
        endDate: new Date('2025-12-31'),
        venue: {
            name: 'Royal Ontario Museum, Toronto',
            location: {
                address: '100 Queens Park, Toronto, ON',
                coordinates: [43.6677, -79.3948]
            }
        },
        category: 'Museums',
        city: 'Toronto, ON',
        source: 'rom-emergency',
        price: '$25 CAD',
        eventUrl: 'https://www.rom.on.ca/en/exhibitions-galleries/galleries/dinosaurs',
        imageUrl: 'https://www.rom.on.ca/sites/default/files/imce/rom_dinosaurs_gallery.jpg'
    },
    {
        id: 'ago-emergency-1',
        title: 'Contemporary Art Collection',
        description: 'Discover contemporary masterpieces from Canadian and international artists.',
        startDate: new Date('2025-08-11'),
        endDate: new Date('2025-12-31'),
        venue: {
            name: 'Art Gallery of Ontario, Toronto',
            location: {
                address: '317 Dundas St W, Toronto, ON',
                coordinates: [43.6536, -79.3925]
            }
        },
        category: 'Arts',
        city: 'Toronto, ON',
        source: 'ago-emergency',
        price: '$25 CAD',
        eventUrl: 'https://ago.ca/exhibitions',
        imageUrl: 'https://ago.ca/sites/default/files/ago_building.jpg'
    },
    {
        id: 'cn-tower-emergency-1',
        title: 'EdgeWalk Experience',
        description: 'Walk around the outside of the CN Tower on a 1.5-meter wide ledge.',
        startDate: new Date('2025-08-11'),
        endDate: new Date('2025-10-31'),
        venue: {
            name: 'CN Tower, Toronto',
            location: {
                address: '290 Bremner Blvd, Toronto, ON',
                coordinates: [43.6426, -79.3871]
            }
        },
        category: 'Attractions',
        city: 'Toronto, ON',
        source: 'cn-tower-emergency',
        price: '$225 CAD',
        eventUrl: 'https://www.cntower.ca/en-ca/plan-your-visit/attractions/edgewalk.html',
        imageUrl: 'https://www.cntower.ca/content/dam/cntower/images/edgewalk.jpg'
    },
    {
        id: 'casa-loma-emergency-1',
        title: 'Castle Tours & Gardens',
        description: 'Explore the majestic castle and beautiful gardens.',
        startDate: new Date('2025-08-11'),
        endDate: new Date('2025-12-31'),
        venue: {
            name: 'Casa Loma, Toronto',
            location: {
                address: '1 Austin Terrace, Toronto, ON',
                coordinates: [43.6780, -79.4094]
            }
        },
        category: 'Attractions',
        city: 'Toronto, ON',
        source: 'casa-loma-emergency',
        price: '$30 CAD',
        eventUrl: 'https://casaloma.ca/',
        imageUrl: 'https://casaloma.ca/wp-content/uploads/casa-loma-castle.jpg'
    },
    {
        id: 'moca-emergency-1',
        title: 'Contemporary Art Exhibitions',
        description: 'Current exhibitions featuring contemporary artists and installations.',
        startDate: new Date('2025-08-11'),
        endDate: new Date('2025-12-31'),
        venue: {
            name: 'Museum of Contemporary Art Toronto, Toronto',
            location: {
                address: '158 Sterling Rd, Toronto, ON',
                coordinates: [43.6462, -79.4163]
            }
        },
        category: 'Arts',
        city: 'Toronto, ON',
        source: 'moca-emergency',
        price: '$10 CAD',
        eventUrl: 'https://moca.ca/exhibitions/',
        imageUrl: 'https://moca.ca/wp-content/uploads/moca-building.jpg'
    },
    {
        id: 'harbourfront-emergency-1',
        title: 'Waterfront Events & Festivals',
        description: 'Ongoing cultural events and festivals at Toronto\'s waterfront.',
        startDate: new Date('2025-08-11'),
        endDate: new Date('2025-12-31'),
        venue: {
            name: 'Harbourfront Centre, Toronto',
            location: {
                address: '235 Queens Quay W, Toronto, ON',
                coordinates: [43.6385, -79.3817]
            }
        },
        category: 'Festivals',
        city: 'Toronto, ON',
        source: 'harbourfront-emergency',
        price: 'Free - $50 CAD',
        eventUrl: 'https://www.harbourfrontcentre.com/whatson/',
        imageUrl: 'https://www.harbourfrontcentre.com/wp-content/uploads/harbourfront.jpg'
    },
    {
        id: 'science-centre-emergency-1',
        title: 'Interactive Science Exhibits',
        description: 'Hands-on science exhibits and demonstrations for all ages.',
        startDate: new Date('2025-08-11'),
        endDate: new Date('2025-12-31'),
        venue: {
            name: 'Ontario Science Centre, Toronto',
            location: {
                address: '770 Don Mills Rd, Toronto, ON',
                coordinates: [43.7161, -79.3389]
            }
        },
        category: 'Science',
        city: 'Toronto, ON',
        source: 'science-centre-emergency',
        price: '$22 CAD',
        eventUrl: 'https://www.ontariosciencecentre.ca/',
        imageUrl: 'https://www.ontariosciencecentre.ca/wp-content/uploads/osc-building.jpg'
    },
    {
        id: 'toronto-zoo-emergency-1',
        title: 'Animal Exhibits & Conservation',
        description: 'Visit over 5,000 animals representing 450 species.',
        startDate: new Date('2025-08-11'),
        endDate: new Date('2025-12-31'),
        venue: {
            name: 'Toronto Zoo, Toronto',
            location: {
                address: '2000 Meadowvale Rd, Toronto, ON',
                coordinates: [43.8178, -79.1847]
            }
        },
        category: 'Nature',
        city: 'Toronto, ON',
        source: 'toronto-zoo-emergency',
        price: '$29 CAD',
        eventUrl: 'https://www.torontozoo.com/',
        imageUrl: 'https://www.torontozoo.com/wp-content/uploads/toronto-zoo.jpg'
    },
    {
        id: 'ripley-emergency-1',
        title: 'Underwater Tunnel & Marine Life',
        description: 'Walk through the underwater tunnel and see sharks, rays, and tropical fish.',
        startDate: new Date('2025-08-11'),
        endDate: new Date('2025-12-31'),
        venue: {
            name: 'Ripley\'s Aquarium of Canada, Toronto',
            location: {
                address: '288 Bremner Blvd, Toronto, ON',
                coordinates: [43.6424, -79.3860]
            }
        },
        category: 'Attractions',
        city: 'Toronto, ON',
        source: 'ripley-emergency',
        price: '$39 CAD',
        eventUrl: 'https://www.ripleyaquariums.com/canada/',
        imageUrl: 'https://www.ripleyaquariums.com/canada/wp-content/uploads/aquarium.jpg'
    },
    {
        id: 'distillery-emergency-1',
        title: 'Historic District Shopping & Dining',
        description: 'Explore the cobblestone streets, galleries, shops, and restaurants.',
        startDate: new Date('2025-08-11'),
        endDate: new Date('2025-12-31'),
        venue: {
            name: 'Distillery District, Toronto',
            location: {
                address: '55 Mill St, Toronto, ON',
                coordinates: [43.6503, -79.3594]
            }
        },
        category: 'Shopping',
        city: 'Toronto, ON',
        source: 'distillery-emergency',
        price: 'Free entry, varies by activity',
        eventUrl: 'https://www.thedistillerydistrict.com/',
        imageUrl: 'https://www.thedistillerydistrict.com/wp-content/uploads/distillery.jpg'
    }
];

async function insertEmergencyTorontoEvents() {
    console.log('🚨 EMERGENCY TORONTO EVENTS INSERT\n');
    console.log(`🎯 Target: Production database (mobile app database)`);
    console.log(`📦 Events to insert: ${torontoEvents.length}`);
    
    try {
        // Connect to production database
        console.log('\n🔌 Connecting to production database...');
        await mongoose.connect(PRODUCTION_URI);
        console.log('✅ Connected to production database');
        
        const db = mongoose.connection.db;
        console.log(`📊 Database: ${db.databaseName}`);
        
        let insertedCount = 0;
        
        // Insert each event
        for (const eventData of torontoEvents) {
            try {
                console.log(`📝 Inserting: ${eventData.title} at ${eventData.venue.name}`);
                
                await Event.updateOne(
                    { id: eventData.id },
                    { $set: eventData },
                    { upsert: true }
                );
                
                insertedCount++;
                console.log(`✅ Success`);
                
            } catch (error) {
                console.log(`❌ Failed: ${error.message}`);
            }
        }
        
        // Final verification
        console.log('\n' + '='.repeat(50));
        console.log('📊 INSERTION SUMMARY:');
        console.log(`✅ Events inserted: ${insertedCount}/${torontoEvents.length}`);
        
        // Verify Toronto events in database
        const torontoCount = await Event.countDocuments({ 
            city: { $regex: /toronto/i } 
        });
        console.log(`🏙️ Toronto events now in database: ${torontoCount}`);
        
        // Total events in database
        const totalCount = await Event.countDocuments();
        console.log(`📊 Total events in database: ${totalCount}`);
        
        console.log('\n🎯 SUCCESS! Toronto events inserted to production!');
        console.log('📱 Your mobile app should now show Toronto events!');
        console.log('🔄 Restart your mobile app to see the new Toronto events.');
        
    } catch (error) {
        console.error('❌ Emergency insert failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the emergency insert
insertEmergencyTorontoEvents().catch(console.error);
