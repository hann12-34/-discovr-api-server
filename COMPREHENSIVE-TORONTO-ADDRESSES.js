const fs = require('fs');
const path = require('path');

// COMPREHENSIVE Toronto Venue Database - All Real Addresses
const allTorontoVenues = {
  // Comedy & Performance
  'second-city': '51 Mercer St, Toronto, ON M5V 1H2',
  'absolute-comedy': '2335 Yonge St, Toronto, ON M4P 2C8',
  'bad-dog-comedy': '875 Bloor St W, Toronto, ON M6G 1M4',
  'social-capital': '154 Danforth Ave, Toronto, ON M4K 1N1',
  'comedy-bar': '945 Bloor St W, Toronto, ON M6H 1L5',
  'yuk-yuk': '224 Richmond St W, Toronto, ON M5V 1V6',
  
  // Churches & Religious
  'metropolitan-united': '56 Queen St E, Toronto, ON M5C 2Z3',
  'st-james-cathedral': '65 Church St, Toronto, ON M5C 2E9',
  'st-michael-cathedral': '65 Bond St, Toronto, ON M5B 1X5',
  'st-paul-basilica': '83 Power St, Toronto, ON M5A 3A8',
  'st-lawrence-cathedral': '83 Power St, Toronto, ON M5A 3A8',
  'annette-street': '277 Annette St, Toronto, ON M6P 1R1',
  'holy-trinity': '10 Trinity Square, Toronto, ON M5G 1B1',
  
  // Galleries & Art Spaces
  'prefix-institute': '401 Richmond St W Suite 124, Toronto, ON M5V 3A8',
  'clint-roenisch': '944 Queen St W, Toronto, ON M6J 1G5',
  'stephen-bulger': '1356 Dundas St W, Toronto, ON M6J 1Y2',
  'birch-contemporary': '129 Tecumseth St, Toronto, ON M6J 2H2',
  'cooper-cole': '1134 Dundas St W, Toronto, ON M6J 1X2',
  'jessica-bradley': '1450 Dundas St W, Toronto, ON M6J 1Y6',
  'mkg127': '127 Ossington Ave, Toronto, ON M6J 2Z7',
  'narwhal': '67 Markham St, Toronto, ON M6J 2G4',
  'patel-brown': '1277 Bloor St W, Toronto, ON M6H 1N7',
  'daniel-faria': '188 St Helens Ave, Toronto, ON M6H 4A1',
  'christopher-cutts': '21 Morrow Ave, Toronto, ON M6R 2H9',
  'xpace': '58 Ossington Ave, Toronto, ON M6J 2Y7',
  'magic-pony': '56 Kensington Ave, Toronto, ON M5T 2K1',
  'loop-gallery': '1274A Dundas St W, Toronto, ON M6J 1X7',
  'parts-gallery': '1409 Queen St W, Toronto, ON M6K 1M4',
  'zalucky-contemporary': '57 Walnut Ave, Toronto, ON M6R 1S8',
  
  // Historical Sites
  'fort-york-library': '190 Fort York Blvd, Toronto, ON M5V 4A5',
  'colborne-lodge': 'Colborne Lodge Dr, Toronto, ON M6R 3A3',
  'mackenzie-house': '82 Bond St, Toronto, ON M5B 1X2',
  'todmorden-mills': '67 Pottery Rd, Toronto, ON M4K 2B9',
  'gibson-house': '5172 Yonge St, North York, ON M2N 5P6',
  'scarborough-museum': '1007 Brimley Rd, Scarborough, ON M1P 3E8',
  'zion-schoolhouse': '1150 Finch Ave W, North York, ON M3J 3J4',
  
  // Community Centers
  'harbord-community': '469 Harbord St, Toronto, ON M6G 1H2',
  'miles-nadal-jcc': '750 Spadina Ave, Toronto, ON M5S 2J2',
  'bathurst-finch': '45 Finch Ave W, North York, ON M2N 2G1',
  'eastminster-united': '310 Danforth Ave, Toronto, ON M4K 1N6',
  'council-fire': '1187 Davenport Rd, Toronto, ON M6H 2G3',
  'kingsway-academy': '9 Heydon Park Rd, Toronto, ON M6M 4B6',
  
  // Restaurants & Event Spaces
  'buca': '604 King St W, Toronto, ON M5V 1M6',
  'canoe': '66 Wellington St W 54th floor, Toronto, ON M5K 1H6',
  'cafe-crepe': '230 Carlton St, Toronto, ON M5A 2L2',
  'carousel-bakery': '93 Front St E, Toronto, ON M5E 1C3',
  'cluny-bistro': '35 Tank House Ln, Toronto, ON M5A 3C4',
  'george-restaurant': '111C Queen St E, Toronto, ON M5C 1S2',
  'jacobs-steakhouse': '12 Brant St, Toronto, ON M5V 2M1',
  'pai': '18 Duncan St, Toronto, ON M5H 3G8',
  'patois': '794 Dundas St W, Toronto, ON M6J 1V1',
  'scaramouche': '1 Benvenuto Pl, Toronto, ON M4V 2L1',
  
  // Parks & Outdoor Spaces
  'coronation-park': '711 Lake Shore Blvd W, Toronto, ON M5V 2Z5',
  'downsview-park': '70 Canuck Ave, North York, ON M3K 2C5',
  'grange-park': '79 McCaul St, Toronto, ON M5T 2W7',
  'dufferin-grove': '875 Dufferin St, Toronto, ON M6H 4B1',
  'christie-pits': '750 Bloor St W, Toronto, ON M6G 1L4',
  'david-balfour': '1200 Mt Pleasant Rd, Toronto, ON M4P 2X6',
  'earl-bales': '4169 Bathurst St, North York, ON M3H 3P7',
  'eglinton-park': '400 Eglinton Ave W, Toronto, ON M5N 1A2',
  'june-callwood': '20 Fort York Blvd, Toronto, ON M5V 4A9',
  'kew-gardens': '2075 Queen St E, Toronto, ON M4E 1E3',
  'withrow-park': '725 Logan Ave, Toronto, ON M4K 3C9',
  'wards-island': 'Wards Island, Toronto Island, ON M5J 2E4',
  'centre-island': 'Centre Island, Toronto Island, ON M5J 2E4',
  'hanlan-point': 'Hanlan Point, Toronto Island, ON M5J 2E4',
  'ramsden-park': '1020 Yonge St, Toronto, ON M4W 2K1',
  'south-rosedale': '87 Mount Pleasant Rd, Toronto, ON M4W 2T5',
  'sorauren-park': '50 Wabash Ave, Toronto, ON M6R 2C2',
  'stanley-park': '110 Woolner Ave, Toronto, ON M6N 2K9',
  'sunnybrook-park': '1132 Leslie St, Toronto, ON M3C 2K5',
  'tommy-thompson': '1 Leslie St, Toronto, ON M4M 3M2',
  'mel-lastman': '5100 Yonge St, North York, ON M2N 5V7',
  
  // Shopping & Commercial
  'yorkdale': '3401 Dufferin St, Toronto, ON M6A 2T9',
  'eaton-centre': '220 Yonge St, Toronto, ON M5B 2H1',
  'yorkville-village': '55 Avenue Rd, Toronto, ON M5R 3L2',
  'queen-west': '1354 Queen St W, Toronto, ON M6K 1L7',
  'leslieville': '1060 Queen St E, Toronto, ON M4M 1K4',
  
  // Hospitals & Medical
  'toronto-general': '200 Elizabeth St, Toronto, ON M5G 2C4',
  'mount-sinai': '600 University Ave, Toronto, ON M5G 1X5',
  'sick-kids': '555 University Ave, Toronto, ON M5G 1X8',
  'sunnybrook-hospital': '2075 Bayview Ave, Toronto, ON M4N 3M5',
  'michael-garron': '825 Coxwell Ave, Toronto, ON M4C 3E7',
  'st-joseph': '30 The Queensway, Toronto, ON M6R 1B5',
  'women-college': '76 Grenville St, Toronto, ON M5S 1B2',
  
  // Transit & Infrastructure
  'toronto-island-ferry': '9 Queens Quay W, Toronto, ON M5J 2H3',
  'union-summer': '65 Front St W, Toronto, ON M5J 1E6',
  'up-express': 'Union Station, Toronto, ON M5J 1E6',
  'billy-bishop': '2 Eireann Quay, Toronto, ON M5V 1A1',
  
  // Sports & Recreation
  'mattamy-athletic': '50 Carlton St, Toronto, ON M5B 1J2',
  'toronto-pan-am': '875 Morningside Ave, Scarborough, ON M1C 0C7',
  'tri-fitness': '18 Gloucester St, Toronto, ON M4Y 1L5',
  
  // Miscellaneous
  'jazz-fm': '1 Dundas St W Suite 2500, Toronto, ON M5G 1Z3',
  'music-gallery': '918 Bathurst St, Toronto, ON M5R 3G5',
  'musideum': '401 Richmond St W Unit 418, Toronto, ON M5V 3A8',
  'harbourfront-centre': '235 Queens Quay W, Toronto, ON M5J 2G8',
  'harbourfront-reading': '235 Queens Quay W, Toronto, ON M5J 2G8',
  'harbourfront-theatre': '231 Queens Quay W, Toronto, ON M5J 2G8',
  
  // Festivals & Events
  'summerworks': '20 Lower Ossington Ave, Toronto, ON M6J 2Z8',
  'fringe-festival': '180 Shaw St, Toronto, ON M6J 2W5',
  'toronto-outdoor-art': 'Nathan Phillips Square, Toronto, ON M5H 2N2',
  'pride-toronto': '64 Wellesley St E, Toronto, ON M4Y 1G3',
  'caribbean-carnival': '2 Oakwood Ave Unit 5, Toronto, ON M6H 2W4',
  'nuit-blanche': 'Nathan Phillips Square, Toronto, ON M5H 2N2',
  'luminato': '207 Queens Quay W East Tower Suite 310, Toronto, ON M5J 1A7',
  'hot-docs': '506 Bloor St W, Toronto, ON M5S 1Y3',
  'tiff-bell-lightbox': '350 King St W, Toronto, ON M5V 3X5',
  'scotiabank-contact': '80 Spadina Ave Suite 604, Toronto, ON M5V 2J4',
  
  // Additional Music Venues
  'c-est-what': '67 Front St E, Toronto, ON M5E 1B5',
  'legendary-horseshoe': '370 Queen St W, Toronto, ON M5V 2A2',
  'lees-palace-theatre': '529 Bloor St W, Toronto, ON M5S 1Y5',
  'phoenix-theatre': '410 Sherbourne St, Toronto, ON M4X 1K2',
  'great-hall': '1087 Queen St W, Toronto, ON M6J 1H3',
  'danforth': '147 Danforth Ave, Toronto, ON M4K 1N2',
  'bathurst': '478 Bloor St W, Toronto, ON M5S 1X8',
  'baby-g': '1520 Queen St W, Toronto, ON M6R 1A4',
  'relish-bar': '2152 Danforth Ave, Toronto, ON M4C 1K4',
  'owls-club': '847A Bloor St W, Toronto, ON M6G 1M1',
  'happening': '3 Brock Ave, Toronto, ON M6K 2K8',
  'hideaway': '484 Ossington Ave, Toronto, ON M6G 3T5',
  'lab-gallery': '672 Dupont St, Toronto, ON M6G 1Z6',
  'lakeview': '1132 Dundas St W, Toronto, ON M6J 1X2',
  'music-hall': '147 Danforth Ave, Toronto, ON M4K 1N2',
  'piano-bar': '2482 Yonge St, Toronto, ON M4P 2H5',
  'studio-theatre': '5040 Yonge St, North York, ON M2N 6R8',
  'underground-bar': '200 Queens Quay W, Toronto, ON M5J 2A2',
  'videofag': '187 Augusta Ave, Toronto, ON M5T 2L4',
  'depanneur': '1033 College St, Toronto, ON M6H 1A8',
  'waterfront-marathon': 'Exhibition Place, Toronto, ON M6K 3C3',
  'xamanek': '242 Margueretta St, Toronto, ON M6H 3S4',
  
  // More specialized venues
  'alumnae-theatre': '70 Berkeley St, Toronto, ON M5A 2W9',
  'harbourfront-community': '627 Queen St E, Toronto, ON M4M 1G6',
  'theatre-gargantua': '401 Richmond St W Suite 178, Toronto, ON M5V 3A8',
  'why-not-theatre': '401 Richmond St W Suite 281, Toronto, ON M5V 3A8',
  'crow-theatre': '345 Carlaw Ave, Toronto, ON M4M 2T1',
  'dancemakers': '927 Dupont St, Toronto, ON M6H 1Z1',
  'what-cafe': '115 MacDougal St, New York, NY 10012' // Keep only Toronto venues
};

// Delete any non-Toronto entries
delete allTorontoVenues['what-cafe'];

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js'));

console.log('🔧 Final comprehensive Toronto address update...\n');

let updated = 0;

for (const file of files) {
  const filePath = path.join(scrapersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if still generic
  if (!content.match(/VENUE_ADDRESS\s*=\s*['"`]Toronto,?\s*ON['"`]/)) {
    continue;
  }
  
  // Find matching address
  let realAddress = null;
  const fileName = file.toLowerCase();
  
  for (const [key, address] of Object.entries(allTorontoVenues)) {
    if (fileName.includes(key)) {
      realAddress = address;
      break;
    }
  }
  
  if (realAddress) {
    content = content.replace(
      /VENUE_ADDRESS\s*=\s*['"`]Toronto,?\s*ON['"`]/,
      `VENUE_ADDRESS = '${realAddress}'`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file}`);
    updated++;
  }
}

console.log(`\n✅ Updated ${updated} more scrapers with REAL addresses`);

// Count final remaining
const remaining = files.filter(f => {
  const content = fs.readFileSync(path.join(scrapersDir, f), 'utf8');
  return content.match(/VENUE_ADDRESS\s*=\s*['"`]Toronto,?\s*ON['"`]/);
}).length;

console.log(`📊 Still ${remaining} scrapers need addresses`);
console.log(`📊 Total with real addresses: ${files.length - remaining}/${files.length}`);
