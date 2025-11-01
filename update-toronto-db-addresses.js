/**
 * Update Toronto events in database with proper street addresses
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/?retryWrites=true&w=majority&appName=Discovr';

const torontoVenueAddresses = {
  'Scotiabank Arena (Air Canada Centre)': '40 Bay Street, Toronto, ON M5J 2X2',
  'Alexandra Park Community Centre': '90 Dennison Avenue, Toronto, ON M6H 1P8',
  'Alumnae Theatre': '70 Berkeley Street, Toronto, ON M5A 2W7',
  'Aluna Theatre': 'Various Locations, Toronto, ON',
  'Array Music': '60 Atlantic Avenue, Toronto, ON M6K 1X9',
  'Art Gallery of York University': '4700 Keele Street, Toronto, ON M3J 1P3',
  'Artscape Daniels Launchpad': '130 Queens Quay E, Toronto, ON M5A 0P6',
  'Artscape Youngplace': '180 Shaw Street, Toronto, ON M6J 2W5',
  'Bad Dog Theatre': '875 Bloor Street W, Toronto, ON M6G 1M4',
  'Balzacs Coffee': 'Various Locations, Toronto, ON',
  'Bata Shoe Museum': '327 Bloor Street W, Toronto, ON M5S 1W7',
  'Beguiling Books': '601 Markham Street, Toronto, ON M6G 2L7',
  'Bellwoods Brewery': '124 Ossington Avenue, Toronto, ON M6J 2Z5',
  'Berkeley Street Theatre': '26 Berkeley Street, Toronto, ON M5A 2W3',
  'Billy Bishop Airport': '2 Eireann Quay, Toronto, ON M5V 1A1',
  'Bloor Street Culture Corridor': 'Bloor Street, Toronto, ON',
  'Bloor Yorkville': 'Bloor Street between Avenue Road and Yonge, Toronto, ON',
  'Buddies in Bad Times Theatre': '12 Alexander Street, Toronto, ON M4Y 1B4',
  'Canada Life Centre': '100 Queen Street W, Toronto, ON M5H 2N2',
  'Canadian Opera Company': '227 Front Street E, Toronto, ON M5A 1E8',
  'Casa del Popolo': '1574 Queen Street W, Toronto, ON M6R 1A6',
  'Casa Loma': '1 Austin Terrace, Toronto, ON M5R 1X8',
  'Crow\'s Theatre': '345 Carlaw Avenue, Toronto, ON M4M 2T1',
  'Danforth Music Hall': '147 Danforth Avenue, Toronto, ON M4K 1N2',
  'Distillery District': '55 Mill Street, Toronto, ON M5A 3C4',
  'Factory Theatre': '125 Bathurst Street, Toronto, ON M5V 2R2',
  'Harbourfront Centre': '235 Queens Quay W, Toronto, ON M5J 2G8',
  'Hanlan\'s Point': 'Toronto Islands, Toronto, ON M5J 2E4',
  'High Park': '1873 Bloor Street W, Toronto, ON M6R 2Z3',
  'Massey Hall': '178 Victoria Street, Toronto, ON M5B 1T7',
  'Meridian Hall': '1 Front Street E, Toronto, ON M5E 1B2',
  'Nathan Phillips Square': '100 Queen Street W, Toronto, ON M5H 2N2',
  'Opera House': '735 Queen Street E, Toronto, ON M4M 1H1',
  'Princess of Wales Theatre': '300 King Street W, Toronto, ON M5V 1J2',
  'Ripley\'s Aquarium': '288 Bremner Boulevard, Toronto, ON M5V 3L9',
  'Rogers Centre': '1 Blue Jays Way, Toronto, ON M5V 1J1',
  'ROM': '100 Queens Park, Toronto, ON M5S 2C6',
  'Royal Ontario Museum': '100 Queens Park, Toronto, ON M5S 2C6',
  'Roy Thomson Hall': '60 Simcoe Street, Toronto, ON M5J 2H5',
  'Scotiabank Arena': '40 Bay Street, Toronto, ON M5J 2X2',
  'St. Paul\'s Basilica': '83 Power Street, Toronto, ON M5A 3A8',
  'Toronto Islands': 'Toronto Islands, Toronto, ON M5J 2E4'
};

async function updateTorontoAddresses() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    let totalUpdated = 0;
    
    for (const [venueName, address] of Object.entries(torontoVenueAddresses)) {
      const result = await collection.updateMany(
        {
          city: 'Toronto',
          'venue.name': venueName,
          $or: [
            { 'venue.address': 'Toronto' },
            { 'venue.address': 'Toronto, ON' },
            { 'venue.address': { $exists: false } },
            { 'venue.address': null }
          ]
        },
        {
          $set: {
            'venue.address': address
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ ${venueName}: ${result.modifiedCount} events`);
        totalUpdated += result.modifiedCount;
      }
    }
    
    console.log(`\n🎉 Updated ${totalUpdated} Toronto events with proper addresses!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

updateTorontoAddresses();
