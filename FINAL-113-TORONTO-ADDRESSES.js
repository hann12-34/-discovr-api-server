const fs = require('fs');
const path = require('path');

// Final batch of Toronto venue addresses
const finalBatch = {
  // Specific venues that were missed
  'afro-fest': 'Woodbine Park, Toronto, ON M4L 3W6',
  'air-canada-centre': '40 Bay St, Toronto, ON M5J 2X2', // Now Scotiabank Arena
  'all-saints-church': '315 Dundas St W, Toronto, ON M5T 1G6',
  'annex-hotel': '384 Bloor St W, Toronto, ON M5S 1X4',
  'antenna-documentary': '401 Richmond St W Suite 219, Toronto, ON M5V 3A8',
  'art-bar': '180 Shaw St, Toronto, ON M6J 2W5',
  'ashbridges-bay': '1561 Lake Shore Blvd E, Toronto, ON M4L 3W7',
  'balzacs': 'Distillery District, Toronto, ON M5A 3C4',
  'betty-oliphant': '404 Jarvis St, Toronto, ON M4Y 2G6',
  'big-on-bloor': '1900 Bloor St W, Etobicoke, ON M6R 2Z3',
  'bird-construction': '5700 Yonge St, North York, ON M2M 4K2',
  'bloor-hot-docs': '506 Bloor St W, Toronto, ON M5S 1Y3',
  'canary-restaurant': '6 Church St, Toronto, ON M5E 1M1',
  'cavalry': '399 Church St, Toronto, ON M5B 2J5',
  'central-commerce': '761 Bay St, Toronto, ON M5G 1M4',
  'cineplex-yonge-dundas': '10 Dundas St E, Toronto, ON M5B 2G9',
  'claude-watson': '40 McCaul St, Toronto, ON M5T 1V9',
  'cloud-gardens': '14 Temperance St, Toronto, ON M5H 1Y2',
  'college-street-bar': '574 College St, Toronto, ON M6G 1B3',
  'commerce-court': '199 Bay St, Toronto, ON M5L 1G2',
  'common-sort': '1275 Dundas St W, Toronto, ON M6J 1X7',
  'crows-nest': '58 The Esplanade, Toronto, ON M5E 1A6',
  'cumberland-terrace': '159 Cumberland St, Toronto, ON M5R 1A2',
  'czehoski': '2704 Dundas St W, Toronto, ON M6P 1Y3',
  'daniels-spectrum': '585 Dundas St E, Toronto, ON M5A 2B7',
  'del-teatro': '29 Stanley Ave, Toronto, ON M6K 2H4',
  'design-and-construction': '40 St George St, Toronto, ON M5S 2E4',
  'desmond-tutu': '66 Christie St, Toronto, ON M6G 3B3',
  'distillery-cafe': '1 Trinity St Building 46, Toronto, ON M5A 3C4',
  'docks': '11 Polson St, Toronto, ON M5A 1A4',
  'dominion-hotel': '500 Queen St E, Toronto, ON M5A 1V2',
  'double-double-land': '950 Dupont St, Toronto, ON M6H 1Z1',
  'dragon-city': '280 Spadina Ave, Toronto, ON M5T 3A5',
  'dundas-west-fest': '1193 Dundas St W, Toronto, ON M6J 1X3',
  'east-end-arts': '1352 Gerrard St E, Toronto, ON M4L 1Z2',
  'elizabeth-ryan-house': '1547 Bayview Ave, Toronto, ON M4G 3B5',
  'evergreen-brick-works': '550 Bayview Ave, Toronto, ON M4W 3X8',
  'experimental-cafe': '672 Dupont St, Toronto, ON M6G 1Z6',
  'ez-rock': '250 Richmond St W, Toronto, ON M5V 1W7',
  'feather-factory': '1301 Gerrard St E, Toronto, ON M4L 1Y7',
  'first-canadian': '100 King St W, Toronto, ON M5X 1A9',
  'fleck-dance': '207 Queens Quay W, Toronto, ON M5J 1A7',
  'fly-nightclub': '8 Gloucester St, Toronto, ON M4Y 1L5',
  'forno-cultura': '609 King St W, Toronto, ON M5V 1M5',
  'gallery-44': '401 Richmond St W Suite 120, Toronto, ON M5V 3A8',
  'gardiner-expressway': 'Gardiner Expressway, Toronto, ON',
  'garrison-common': '221 Fort York Blvd, Toronto, ON M5V 3A7',
  'glad-day-bookshop': '499 Church St, Toronto, ON M4Y 2C6',
  'green-room': '296 Brunswick Ave, Toronto, ON M5S 2M8',
  'harbord-diggers': '469 Harbord St, Toronto, ON M6G 1H2',
  'harbour-commission': '60 Harbour St, Toronto, ON M5J 1B7',
  'harbourfront-stage': '235 Queens Quay W, Toronto, ON M5J 2G8',
  'hart-house-choir': '7 Hart House Cir, Toronto, ON M5S 3H3',
  'havana-room': '494 College St, Toronto, ON M6G 1A4',
  'hbc-queen': '176 Yonge St, Toronto, ON M5C 2L7',
  'hdtv-headquarters': '299 Queen St W, Toronto, ON M5V 2Z5',
  'heartwood-concert': '167 Danforth Ave, Toronto, ON M4K 1N2',
  'heliconian-club': '35 Hazelton Ave, Toronto, ON M5R 2E3',
  'hockey-hall-fame': '30 Yonge St, Toronto, ON M5E 1X8',
  'honest-eds': '581 Bloor St W, Toronto, ON M6G 1K3',
  'hub14': '14 Kensington Ave, Toronto, ON M5T 2J8',
  'humber-bay': '2 Humber Bay Park Rd E, Etobicoke, ON M8V 3X7',
  'hummingbird-centre': '1 Front St E, Toronto, ON M5E 1B2',
  'hush-hush': '674 Queen St W, Toronto, ON M6J 1E7',
  'jack-layton-ferry': '1 Bay St, Toronto, ON M5J 2E4',
  'jazz-spectrum': '918 Bathurst St, Toronto, ON M5R 3G5',
  'jilly-nightclub': '102 John St, Toronto, ON M5H 2A1',
  'jimmys-coffee': '191 Baldwin St, Toronto, ON M5T 1L8',
  'joe-beef': '2491 Notre-Dame St W, Montreal, QC H3J 1N4', // Wrong city
  'lakeshore-swim': '9 Colonel Samuel Smith Park Dr, Etobicoke, ON M8V 4B6',
  'lanka-grocery': '1584 Danforth Ave, Toronto, ON M4J 1N6',
  'lee-funeral': '1026 Danforth Ave, Toronto, ON M4J 1M3',
  'lillian-smith': '239 College St, Toronto, ON M5T 1R5',
  'little-italy': '524 College St, Toronto, ON M6G 1A9',
  'living-arts': '4141 Living Arts Dr, Mississauga, ON L5B 4B8', // Mississauga not Toronto
  'madison-avenue': '14 Madison Ave, Toronto, ON M5R 2S1',
  'margaret-mcaughey': '777 St Clair Ave W, Toronto, ON M6C 1B5',
  'masonic-temple': '888 Yonge St, Toronto, ON M4W 2J2',
  'matahari-grill': '39 Baldwin St, Toronto, ON M5T 1L1',
  'mayworks-festival': '1265 Military Trail, Scarborough, ON M1C 1A4',
  'mid-peninsula': 'Toronto Island Park, ON M5J 2E4',
  'mile-end': '97 Bernard Ave W, Montreal, QC H2T 2K4', // Wrong city
  'mimico-arena': '47 Station Rd, Etobicoke, ON M8V 3R5',
  'nathans-famous': '1 Blue Jays Way, Toronto, ON M5V 1J4',
  'newmindspace': '401 Richmond St W, Toronto, ON M5V 3A8',
  'oconnor-community': '40 St Clair Ave E, Toronto, ON M4T 1M9',
  'open-roof-festival': '99 Sudbury St, Toronto, ON M6J 3S7',
  'opera-atelier': '18 Tank House Ln, Toronto, ON M5A 3C4',
  'paddys-market': '238 Ossington Ave, Toronto, ON M6J 3A3',
  'palmerston-library': '560 Palmerston Ave, Toronto, ON M6G 2P6',
  'panasonic-theatre': '651 Yonge St, Toronto, ON M4Y 1Z9',
  'pancake-house': '2177 Avenue Rd, North York, ON M5M 4B1',
  'paradise-theatre': '1006 Bloor St W, Toronto, ON M6H 1M2',
  'park-gallery': '1313 Queen St E, Toronto, ON M4L 1C2',
  'pauper-pub': '539 Bloor St W, Toronto, ON M5S 1Y6',
  'peacock-alley': '214 King St W, Toronto, ON M5H 1K5',
  'pearl-diver': '100 Adelaide St E, Toronto, ON M5C 1K9',
  'peleton-cafe': '275 Bloor St W Unit 102, Toronto, ON M5S 1W2',
  'penderel-theatre': '127 Carlton St, Toronto, ON M5A 2K1',
  'people-places': '401 Richmond St W, Toronto, ON M5V 3A8',
  'plate-gallery': '18 Hazelton Ave, Toronto, ON M5R 2E2',
  'queens-park': '1 Queens Park Crescent, Toronto, ON M5S 2C5',
  'rainbow-cinemas': '2000 McGill College Ave, Montreal, QC H3A 3H3', // Wrong
  'raptor-raptors': '40 Bay St, Toronto, ON M5J 2X2',
  'red-sandcastle': '349 Broadview Ave, Toronto, ON M4M 2H3',
  'remix-lounge': '579 Yonge St, Toronto, ON M4Y 1Z4',
  'republic-nightclub': '79 Richmond St W, Toronto, ON M5H 1Z2',
  'rev-motor': '70 Claremont St, Toronto, ON M6J 2M7',
  'royal-conservatory': '273 Bloor St W, Toronto, ON M5S 1W2',
  'scadding-court': '707 Dundas St W, Toronto, ON M5T 2W6',
  'selby-hotel': '592 Sherbourne St, Toronto, ON M4X 1L4',
  'shakespeare-pub': '202 Ontario St, Toronto, ON M5A 2V5',
  'sonic-boom': '215 Spadina Ave, Toronto, ON M5T 2C7',
  'spin-table-tennis': '461 King St W, Toronto, ON M5V 1K7',
  'steamworks': '540 King St W, Toronto, ON M5V 1M3',
  'streetcar-crowsnest': '345 Carlaw Ave, Toronto, ON M4M 2T1',
  'sugar-mountain': '182 Ossington Ave, Toronto, ON M6J 2Z8',
  'tafelmusik': '427 Bloor St W, Toronto, ON M5S 1X7',
  'tdsb-continuing': '835 Yonge St, Toronto, ON M4W 2H1',
  'tempo-food-drink': '581 College St, Toronto, ON M6G 1B2',
  'tennis-center': '1 Shoreham Dr, North York, ON M3N 3A6',
  'terroni-queen': '720 Queen St W, Toronto, ON M6J 1E8',
  'the-annex': '384 Bloor St W, Toronto, ON M5S 1X4',
  'the-box': '4 Fort York Blvd, Toronto, ON M5V 3Y2',
  'the-commons': '281 Broadview Ave, Toronto, ON M4M 2G7',
  'the-lab': '672 Dupont St, Toronto, ON M6G 1Z6',
  'the-stop': '1884 Davenport Rd, Toronto, ON M6N 4Y2',
  'the-studio': '90 De Grassi St, Toronto, ON M4M 2K2',
  'the-underground': '115 The Esplanade, Toronto, ON M5E 1Y7',
  'timmins-square': 'Timmins St & Dupont St, Toronto, ON M6H 2L5',
  'toronto-ca-all': 'City Hall, 100 Queen St W, Toronto, ON M5H 2N2',
  'toronto-centre-arts': '5040 Yonge St, North York, ON M2N 6R8',
  'toronto-com': '1 Queens Wharf Rd, Toronto, ON M5V 3A8',
  'toronto-history': '260 Adelaide St E, Toronto, ON M5A 1N1',
  'toronto-star': '1 Yonge St, Toronto, ON M5E 1E6',
  'toronto-union': '65 Front St W, Toronto, ON M5J 1E6',
  'waterfront-trail': 'Queens Quay, Toronto, ON M5J 2L3'
};

// Remove wrong cities
delete finalBatch['joe-beef'];
delete finalBatch['mile-end'];
delete finalBatch['living-arts'];
delete finalBatch['rainbow-cinemas'];

const scrapersDir = path.join(__dirname, 'scrapers', 'cities', 'Toronto');
const files = fs.readdirSync(scrapersDir).filter(f => f.endsWith('.js'));

console.log('🔧 Final Toronto address update (last 113)...\n');

let updated = 0;

for (const file of files) {
  const filePath = path.join(scrapersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.match(/VENUE_ADDRESS\s*=\s*['"`]Toronto,?\s*ON['"`]/)) {
    continue;
  }
  
  let realAddress = null;
  const fileName = file.toLowerCase();
  
  for (const [key, address] of Object.entries(finalBatch)) {
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
    console.log(`✅ ${file} → ${realAddress}`);
    updated++;
  }
}

console.log(`\n✅ Updated ${updated} more scrapers`);

const remaining = files.filter(f => {
  const content = fs.readFileSync(path.join(scrapersDir, f), 'utf8');
  return content.match(/VENUE_ADDRESS\s*=\s*['"`]Toronto,?\s*ON['"`]/);
}).length;

console.log(`\n📊 FINAL STATUS:`);
console.log(`   Total scrapers: ${files.length}`);
console.log(`   With real addresses: ${files.length - remaining}`);
console.log(`   Still generic: ${remaining}`);
console.log(`   Coverage: ${((files.length - remaining)/files.length*100).toFixed(1)}%`);
