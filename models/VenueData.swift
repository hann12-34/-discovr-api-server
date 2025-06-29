import Foundation

struct VenueData {
    static let venues: [Venue] = [
        // Music Venues & Concert Halls
        Venue(name: "Commodore Ballroom", url: "https://www.commodoreballroom.com/", category: .musicVenue, region: .vancouver),
        Venue(name: "Fox Cabaret", url: "https://www.foxcabaret.com/", category: .musicVenue, region: .vancouver),
        Venue(name: "Fortune Sound Club", url: "https://www.fortunesoundclub.com/", category: .musicVenue, region: .vancouver),
        Venue(name: "Orpheum Theatre", url: "https://vancouvercivictheatres.com/venues/orpheum", category: .musicVenue, region: .vancouver),
        Venue(name: "The Rickshaw Theatre", url: "https://www.rickshawtheatre.com/", category: .musicVenue, region: .vancouver),
        Venue(name: "The Biltmore Cabaret", url: "https://www.thebiltmorecabaret.com/", category: .musicVenue, region: .vancouver),
        Venue(name: "Rogers Arena", url: "https://www.rogersarena.com/", category: .musicVenue, region: .vancouver),
        Venue(name: "The Vogue Theatre", url: "https://voguetheatre.com/", category: .musicVenue, region: .vancouver),
        Venue(name: "Queen Elizabeth Theatre", url: "https://vancouvercivictheatres.com/venues/queen-elizabeth-theatre/", category: .musicVenue, region: .vancouver),
        Venue(name: "The Cultch", url: "https://thecultch.com/", category: .musicVenue, region: .vancouver),
        
        // Nightclubs & Dance Venues
        Venue(name: "The Red Room", url: "https://redroomvancouver.com/", category: .nightclub, region: .vancouver),
        Venue(name: "Harbour Event Centre", url: "https://harboureventcentre.com/", category: .nightclub, region: .vancouver),
        Venue(name: "VENUE Nightclub", url: "https://venuelive.ca/", category: .nightclub, region: .vancouver),
        Venue(name: "Celebrities Nightclub", url: "https://www.celebritiesnightclub.com/", category: .nightclub, region: .vancouver),
        Venue(name: "The Roxy", url: "https://www.roxyvan.com/", category: .nightclub, region: .vancouver),
        Venue(name: "Levels Nightclub", url: "https://www.levelsvancouver.com/", category: .nightclub, region: .vancouver),
        Venue(name: "Gorg-O-Mish", url: "https://www.gorgomish.com/", category: .nightclub, region: .vancouver),
        Venue(name: "Bar None", url: "https://barnone.ca/", category: .nightclub, region: .vancouver),
        Venue(name: "Cabana Lounge", url: "https://cabanaclub.ca/", category: .nightclub, region: .vancouver),
        Venue(name: "Mansion Nightclub", url: "https://mansionclub.ca/", category: .nightclub, region: .vancouver),
        
        // Hidden Bars & Speakeasies
        Venue(name: "Laowai", url: "https://laowai.ca/", category: .hiddenBar, region: .vancouver),
        Venue(name: "The Keefer Bar", url: "https://thekeeferbar.com/", category: .hiddenBar, region: .vancouver),
        Venue(name: "Key Party", url: "https://narrowgroup.ca/project/key-party/", category: .hiddenBar, region: .vancouver),
        Venue(name: "The Narrow Lounge", url: "https://narrowlounge.com/", category: .hiddenBar, region: .vancouver),
        Venue(name: "Hello Goodbye Bar", url: "https://hellogoodbyebar.com/", category: .hiddenBar, region: .vancouver),
        Venue(name: "Arcana Spirit Lounge", url: "https://www.arcanabar.com/", category: .hiddenBar, region: .vancouver),
        Venue(name: "The Diamond", url: "https://thediamondgastown.ca/", category: .hiddenBar, region: .vancouver),
        Venue(name: "Prohibition", url: "https://prohibitionrhg.com/", category: .hiddenBar, region: .vancouver),
        Venue(name: "Chupito", url: "https://www.chupito.ca/", category: .hiddenBar, region: .vancouver),
        Venue(name: "Bagheera", url: "https://www.bagheerayvr.com/", category: .hiddenBar, region: .vancouver),
        
        // Irish Pubs & Sports Bars
        Venue(name: "The Irish Heather", url: "https://www.irishheather.com/", category: .irishPub, region: .vancouver),
        Venue(name: "The Blarney Stone", url: "https://blarneystone.ca/", category: .irishPub, region: .vancouver),
        Venue(name: "Johnnie Fox's", url: "https://johnniefox.ca/", category: .irishPub, region: .vancouver),
        Venue(name: "Malone's Taphouse", url: "https://www.malones.bc.ca/", category: .irishPub, region: .vancouver),
        Venue(name: "The Wolf & Hound", url: "https://www.thewolfandhound.ca/", category: .irishPub, region: .vancouver),
        Venue(name: "Shamrock Storehouse", url: "https://www.theshamrock.ca/", category: .irishPub, region: .vancouver),
        Venue(name: "The Pint", url: "https://vancouver.thepint.ca/", category: .irishPub, region: .vancouver),
        Venue(name: "Dublin Calling", url: "https://dublincalling.com/vancouver/", category: .irishPub, region: .vancouver),
        Venue(name: "Lions Pub", url: "https://www.lionspub.ca/", category: .irishPub, region: .vancouver),
        Venue(name: "The Lamplighter", url: "https://donnellygroup.ca/lamplighter/", category: .irishPub, region: .vancouver),
        
        // Craft Breweries & Taprooms
        Venue(name: "Steamworks Brewing", url: "https://steamworks.com/brew-pub/", category: .brewery, region: .vancouver),
        Venue(name: "Yaletown Brewing Company", url: "https://yaletown.beer/", category: .brewery, region: .vancouver),
        Venue(name: "Red Truck Beer Company", url: "https://redtruckbeer.com/", category: .brewery, region: .vancouver),
        Venue(name: "Electric Bicycle Brewing", url: "https://electricbicyclebrewing.com/", category: .brewery, region: .vancouver),
        Venue(name: "Main Street Brewing", url: "https://mainstreetbeer.ca/", category: .brewery, region: .vancouver),
        Venue(name: "Parallel 49 Brewing", url: "https://parallel49brewing.ca/", category: .brewery, region: .vancouver),
        Venue(name: "Brassneck Brewery", url: "https://brassneck.ca/", category: .brewery, region: .vancouver),
        Venue(name: "R&B Brewing", url: "https://randbbrewing.com/", category: .brewery, region: .vancouver),
        Venue(name: "Strathcona Beer Company", url: "https://strathconabeer.com/", category: .brewery, region: .vancouver),
        Venue(name: "33 Acres Brewing", url: "https://33acresbrewing.com/", category: .brewery, region: .vancouver),
        
        // Cocktail Lounges & Upscale Bars
        Venue(name: "OPUS Bar", url: "https://opushotel.com/dine/opus-bar/", category: .cocktailLounge, region: .vancouver),
        Venue(name: "L'Abattoir", url: "https://www.labattoir.ca/bar/", category: .cocktailLounge, region: .vancouver),
        Venue(name: "Botanist", url: "https://www.botanistrestaurant.com/", category: .cocktailLounge, region: .vancouver),
        Venue(name: "Guilt & Co.", url: "https://www.guiltandco.com/", category: .cocktailLounge, region: .vancouver),
        Venue(name: "The Shameful Tiki Room", url: "https://shamefultikiroom.com/", category: .cocktailLounge, region: .vancouver),
        Venue(name: "1931 Gallery Bistro", url: "https://1931gallery.com/", category: .cocktailLounge, region: .vancouver),
        Venue(name: "Reflections", url: "https://www.rosewoodhotels.com/en/hotel-georgia-vancouver/dining/reflections", category: .cocktailLounge, region: .vancouver),
        Venue(name: "The Lobby Lounge", url: "https://www.lobbyloungerawbar.com/", category: .cocktailLounge, region: .vancouver),
        Venue(name: "Jungle Room", url: "https://jungleroomyvr.com/", category: .cocktailLounge, region: .vancouver),
        Venue(name: "Karma Lounge", url: "https://www.paradoxhotelvancouver.com/karma-lounge/", category: .cocktailLounge, region: .vancouver),
        
        // Jazz & Blues Venues
        Venue(name: "Frankie's Jazz Club", url: "https://www.frankiesjazzclub.ca/", category: .jazzBlues, region: .vancouver),
        Venue(name: "The 2nd Floor Gastown", url: "https://www.waterstreetcafe.ca/2nd-floor-gastown", category: .jazzBlues, region: .vancouver),
        Venue(name: "Pat's Pub", url: "https://patspub.ca/", category: .jazzBlues, region: .vancouver),
        Venue(name: "Tyrant Studios", url: "https://tyrantstudios.ca/", category: .jazzBlues, region: .vancouver),
        Venue(name: "LanaLou's", url: "https://lanalous.com/", category: .jazzBlues, region: .vancouver),
        Venue(name: "The Cascade Room", url: "https://www.thecascade.ca/", category: .jazzBlues, region: .vancouver),
        
        // LGBTQ+ Venues & Drag Shows
        Venue(name: "Numbers Cabaret", url: "https://numbers.ca/", category: .lgbtq, region: .vancouver),
        Venue(name: "The Fountainhead Pub", url: "https://www.thefountainheadpub.com/", category: .lgbtq, region: .vancouver),
        Venue(name: "The Junction", url: "https://www.junctionpub.com/", category: .lgbtq, region: .vancouver),
        Venue(name: "Pumpjack Pub", url: "https://pumpjackpub.com/", category: .lgbtq, region: .vancouver),
        Venue(name: "1181 Bar & Lounge", url: "https://www.1181.ca/", category: .lgbtq, region: .vancouver),
        Venue(name: "XY", url: "https://www.xyvancouver.com/", category: .lgbtq, region: .vancouver),
        
        // Comedy Clubs & Open Mic Venues
        Venue(name: "Underground Comedy Club", url: "https://www.ugcomedy.com/", category: .comedy, region: .vancouver),
        Venue(name: "The Improv Centre", url: "https://theimprovcentre.ca/", category: .comedy, region: .vancouver),
        Venue(name: "Comedy After Dark", url: "https://comedyafterdark.ca/", category: .comedy, region: .vancouver),
        Venue(name: "The Comedy Ring", url: "https://thecomedyring.com/", category: .comedy, region: .vancouver),
        
        // Tech & Innovation Events
        Venue(name: "BC Tech Association", url: "https://wearebctech.com/events/bc-tech-events/", category: .tech, region: .vancouver),
        Venue(name: "Web Summit Vancouver", url: "https://vancouver.websummit.com/", category: .tech, region: .vancouver),
        Venue(name: "Vancouver Tech Week", url: "https://vancouvertechweek.org/", category: .tech, region: .vancouver),
        Venue(name: "BC Technology Events Calendar", url: "https://www.bctechnology.com/events/calendar.cfm", category: .tech, region: .vancouver),
        
        // Film Festivals & Cinema
        Venue(name: "Vancouver International Film Festival (VIFF)", url: "https://viff.org/festival/", category: .filmFestival, region: .vancouver),
        Venue(name: "VIFF Centre", url: "https://viff.org/", category: .filmFestival, region: .vancouver),
        Venue(name: "DOXA Documentary Film Festival", url: "https://www.doxafestival.ca/", category: .filmFestival, region: .vancouver),
        Venue(name: "Vancouver Asian Film Festival", url: "https://vaff.org/", category: .filmFestival, region: .vancouver),
        Venue(name: "Vancouver Queer Film Festival", url: "https://outonscreen.com/", category: .filmFestival, region: .vancouver),
        
        // Add Vancouver Island venues
        Venue(name: "Royal Theatre", url: "https://royaltheatre.bc.ca/", category: .musicVenue, region: .vancouverIsland),
        Venue(name: "McPherson Playhouse", url: "https://mcpherson.ca/", category: .musicVenue, region: .vancouverIsland),
        Venue(name: "Sugar Nightclub", url: "https://sugarnightclub.com/", category: .nightclub, region: .vancouverIsland),
        
        // Add Sea to Sky venues
        Venue(name: "Sea to Sky Gondola", url: "https://seatoskygondola.com/", category: .outdoorAttraction, region: .seaToSky),
        Venue(name: "Britannia Mine Museum", url: "https://britanniamuseum.org/", category: .museum, region: .seaToSky),
        
        // Add other regions and more venues as needed
        // This is just a subset of the full list
        
        // A few of each major venue type for each region to demonstrate
    ]
}
