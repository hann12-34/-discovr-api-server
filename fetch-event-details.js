/**
 * Fetch Event Details (Descriptions + Addresses)
 * Scrapes descriptions and addresses from event source URLs
 */

const { MongoClient } = require('mongodb');
const axios = require('axios');
const cheerio = require('cheerio');

const MONGODB_URI = 'mongodb+srv://discovr123:discovr1234@discovr.vzlnmqb.mongodb.net/discovr';

// Known venue addresses for fallback
const VENUE_ADDRESSES = {
  // Calgary
  'Spruce Meadows': '18011 Spruce Meadows Way SW, Calgary, AB T2J 5G5',
  'Scotiabank Saddledome': '555 Saddledome Rise SE, Calgary, AB T2G 2W1',
  'Calgary Zoo': '210 St. George\'s Drive NE, Calgary, AB T2E 7V6',
  'Heritage Park': '1900 Heritage Dr SW, Calgary, AB T2V 2X3',
  'Cowboys': '421 12 Ave SE, Calgary, AB T2G 1A5',
  'The Palace Theatre': '219 8 Ave SW, Calgary, AB T2P 1B5',
  'Jack Singer Concert Hall': '205 8 Ave SE, Calgary, AB T2G 0K9',
  'Studio Bell': '850 4 St SE, Calgary, AB T2G 1R1',
  'Calgary TELUS Convention Centre': '120 9 Ave SE, Calgary, AB T2G 0P3',
  
  // Vancouver
  'Rogers Arena': '800 Griffiths Way, Vancouver, BC V6B 6G1',
  'BC Place': '777 Pacific Blvd, Vancouver, BC V6B 4Y8',
  'Queen Elizabeth Theatre': '630 Hamilton St, Vancouver, BC V6B 5N6',
  'Orpheum Theatre': '884 Granville St, Vancouver, BC V6Z 1K3',
  'Commodore Ballroom': '868 Granville St, Vancouver, BC V6Z 1K3',
  'Vogue Theatre': '918 Granville St, Vancouver, BC V6Z 1L2',
  'Fox Cabaret': '2321 Main St, Vancouver, BC V5T 3C9',
  'Vancouver Art Gallery': '750 Hornby St, Vancouver, BC V6Z 2H7',
  'Chan Centre': '6265 Crescent Rd, Vancouver, BC V6T 1Z1',
  'PNE Forum': '2901 E Hastings St, Vancouver, BC V5K 5J1',
  'Rickshaw Theatre': '254 E Hastings St, Vancouver, BC V6A 1P1',
  'The Biltmore Cabaret': '2755 Prince Edward St, Vancouver, BC V5T 0A4',
  
  // Toronto
  'Scotiabank Arena': '40 Bay St, Toronto, ON M5J 2X2',
  'Rogers Centre': '1 Blue Jays Way, Toronto, ON M5V 1J1',
  'Massey Hall': '178 Victoria St, Toronto, ON M5B 1T7',
  'Roy Thomson Hall': '60 Simcoe St, Toronto, ON M5J 2H5',
  'HISTORY': '1663 Queen St E, Toronto, ON M4L 1G5',
  'The Danforth Music Hall': '147 Danforth Ave, Toronto, ON M4K 1N2',
  'Budweiser Stage': '909 Lake Shore Blvd W, Toronto, ON M6K 3L3',
  'Echo Beach': '909 Lake Shore Blvd W, Toronto, ON M6K 3L3',
  'Rebel': '11 Polson St, Toronto, ON M5A 1A4',
  'The Phoenix Concert Theatre': '410 Sherbourne St, Toronto, ON M4X 1K2',
  'Casa Loma': '1 Austin Terrace, Toronto, ON M5R 1X8',
  
  // Los Angeles
  'Hollywood Bowl': '2301 N Highland Ave, Los Angeles, CA 90068',
  'Greek Theatre': '2700 N Vermont Ave, Los Angeles, CA 90027',
  'The Novo': '800 W Olympic Blvd, Los Angeles, CA 90015',
  'Hollywood Palladium': '6215 Sunset Blvd, Los Angeles, CA 90028',
  'The Wiltern': '3790 Wilshire Blvd, Los Angeles, CA 90010',
  'The Fonda Theatre': '6126 Hollywood Blvd, Los Angeles, CA 90028',
  'El Rey Theatre': '5515 Wilshire Blvd, Los Angeles, CA 90036',
  'The Roxy Theatre': '9009 W Sunset Blvd, West Hollywood, CA 90069',
  'The Troubadour': '9081 Santa Monica Blvd, West Hollywood, CA 90069',
  'Crypto.com Arena': '1111 S Figueroa St, Los Angeles, CA 90015',
  'SoFi Stadium': '1001 Stadium Dr, Inglewood, CA 90301',
  'Academy LA': '6021 Hollywood Blvd, Los Angeles, CA 90028',
  'Sound Nightclub': '1642 N Las Palmas Ave, Los Angeles, CA 90028',
  'Create Nightclub': '6021 Hollywood Blvd, Los Angeles, CA 90028',
  'Exchange LA': '618 S Spring St, Los Angeles, CA 90014',
  'Avalon Hollywood': '1735 Vine St, Los Angeles, CA 90028',
  'The Abbey': '692 N Robertson Blvd, West Hollywood, CA 90069',
  
  // Miami
  'E11EVEN Miami': '29 NE 11th St, Miami, FL 33132',
  'Club Space': '34 NE 11th St, Miami, FL 33132',
  'LIV Miami': '4441 Collins Ave, Miami Beach, FL 33140',
  'Story Miami': '136 Collins Ave, Miami Beach, FL 33139',
  'FTX Arena': '601 Biscayne Blvd, Miami, FL 33132',
  'Hard Rock Stadium': '347 Don Shula Dr, Miami Gardens, FL 33056',
  
  // New York
  'Madison Square Garden': '4 Pennsylvania Plaza, New York, NY 10001',
  'Barclays Center': '620 Atlantic Ave, Brooklyn, NY 11217',
  'Radio City Music Hall': '1260 6th Ave, New York, NY 10020',
  'Brooklyn Steel': '319 Frost St, Brooklyn, NY 11222',
  'Javits Center': '429 11th Ave, New York, NY 10001',
  'Apollo Theater': '253 W 125th St, New York, NY 10027',
  'Terminal 5': '610 W 56th St, New York, NY 10019',
  'Irving Plaza': '17 Irving Pl, New York, NY 10003',
  'Webster Hall': '125 E 11th St, New York, NY 10003',
  'The Bowery Ballroom': '6 Delancey St, New York, NY 10002',
  'Brooklyn Academy Music': '30 Lafayette Ave, Brooklyn, NY 11217',
  
  // Seattle
  'The Showbox': '1426 1st Ave, Seattle, WA 98101',
  'Neumos': '925 E Pike St, Seattle, WA 98122',
  'Paramount Theatre': '911 Pine St, Seattle, WA 98101',
  'Climate Pledge Arena': '334 1st Ave N, Seattle, WA 98109',
  'The Crocodile': '2505 1st Ave, Seattle, WA 98121',
  'Showbox SoDo': '1700 1st Ave S, Seattle, WA 98134',
  
  // Montreal
  'Bell Centre': '1909 Avenue des Canadiens-de-Montréal, Montreal, QC H4B 5G0',
  'Place des Arts': '175 Saint Catherine St W, Montreal, QC H2X 1Y9',
  'New City Gas': '950 Rue Ottawa, Montreal, QC H3C 1S4',
  'Metropolis': '59 Saint Catherine St E, Montreal, QC H2X 1K5',
  'L\'Olympia': '1004 Saint Catherine St E, Montreal, QC H2L 2G2',
};

async function fetchDetailsFromUrl(url) {
  if (!url || url === 'N/A') return { description: null, address: null };
  
  try {
    const response = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 15000,
      maxRedirects: 5
    });
    
    const $ = cheerio.load(response.data);
    
    let description = null;
    let address = null;
    
    // Try to get description
    // 1. Open Graph description
    description = $('meta[property="og:description"]').attr('content');
    
    // 2. Meta description
    if (!description || description.length < 20) {
      description = $('meta[name="description"]').attr('content');
    }
    
    // 3. Schema.org description
    if (!description || description.length < 20) {
      const schemaScript = $('script[type="application/ld+json"]').first().html();
      if (schemaScript) {
        try {
          const schema = JSON.parse(schemaScript);
          description = schema.description || (schema['@graph'] && schema['@graph'][0]?.description);
        } catch (e) {}
      }
    }
    
    // 4. Article/event content
    if (!description || description.length < 20) {
      const content = $('.event-description, .description, .event-content, article p, .about p').first().text().trim();
      if (content && content.length > 20) {
        description = content.substring(0, 500);
      }
    }
    
    // Try to get address from Schema.org
    const schemaScript = $('script[type="application/ld+json"]').html();
    if (schemaScript) {
      try {
        const schema = JSON.parse(schemaScript);
        const location = schema.location || schema.place;
        if (location && location.address) {
          if (typeof location.address === 'string') {
            address = location.address;
          } else if (location.address.streetAddress) {
            address = `${location.address.streetAddress}, ${location.address.addressLocality || ''}, ${location.address.addressRegion || ''} ${location.address.postalCode || ''}`.trim();
          }
        }
      } catch (e) {}
    }
    
    // Clean up description
    if (description) {
      description = description.trim().replace(/\s+/g, ' ');
      if (description.length < 20) description = null;
    }
    
    return { description, address };
  } catch (error) {
    return { description: null, address: null };
  }
}

async function fetchEventDetails() {
  console.log('📝 FETCHING EVENT DETAILS (Descriptions + Addresses)\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('discovr');
    const collection = db.collection('events');
    
    // All cities
    const targetCities = ['Vancouver', 'Toronto', 'Calgary', 'Montreal', 'Los Angeles', 'Miami', 'Seattle', 'New York'];
    
    // Find events missing description OR address
    const events = await collection.find({
      city: { $in: targetCities },
      $or: [
        { description: { $exists: false } },
        { description: null },
        { description: '' },
        { description: 'No description available.' },
        { 'venue.address': { $exists: false } },
        { 'venue.address': null },
        { 'venue.address': '' },
        { 'venue.address': { $regex: '^[A-Za-z]+$' } }  // Just city name, no street
      ]
    }).limit(500).toArray();
    
    console.log(`📊 Found ${events.length} events needing details\n`);
    
    let updatedDesc = 0;
    let updatedAddr = 0;
    
    for (const event of events) {
      const url = event.sourceURL || event.url;
      const venueName = event.venue?.name || '';
      const title = (event.title || '').substring(0, 35);
      
      console.log(`🔍 ${title}...`);
      
      const updates = {};
      
      // Try to fetch from URL
      if (url && url !== 'N/A' && url.includes('/event')) {
        const { description, address } = await fetchDetailsFromUrl(url);
        
        if (description && (!event.description || event.description === 'No description available.')) {
          updates.description = description;
          console.log(`   ✅ Description: ${description.substring(0, 50)}...`);
          updatedDesc++;
        }
        
        if (address && (!event.venue?.address || event.venue.address.length < 15)) {
          updates['venue.address'] = address;
          console.log(`   ✅ Address: ${address}`);
          updatedAddr++;
        }
      }
      
      // Fallback: Use known venue address
      if ((!event.venue?.address || event.venue.address.length < 15) && !updates['venue.address']) {
        const knownAddr = VENUE_ADDRESSES[venueName];
        if (knownAddr) {
          updates['venue.address'] = knownAddr;
          console.log(`   ✅ Address (venue): ${knownAddr}`);
          updatedAddr++;
        }
      }
      
      // Apply updates
      if (Object.keys(updates).length > 0) {
        await collection.updateOne({ _id: event._id }, { $set: updates });
      } else {
        console.log(`   ❌ No details found`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Updated ${updatedDesc} descriptions`);
    console.log(`✅ Updated ${updatedAddr} addresses`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\n👋 Done');
  }
}

fetchEventDetails();
