import Foundation
import SwiftUI

struct Venue: Identifiable, Codable {
    var id = UUID()
    var name: String
    var url: String
    var category: VenueCategory
    var region: VenueRegion
    
    enum VenueCategory: String, Codable, CaseIterable {
        case musicVenue = "Music Venues & Concert Halls"
        case nightclub = "Nightclubs & Dance Venues"
        case hiddenBar = "Hidden Bars & Speakeasies"
        case irishPub = "Irish Pubs & Sports Bars"
        case brewery = "Craft Breweries & Taprooms"
        case cocktailLounge = "Cocktail Lounges & Upscale Bars"
        case jazzBlues = "Jazz & Blues Venues"
        case lgbtq = "LGBTQ+ Venues & Drag Shows"
        case comedy = "Comedy Clubs & Open Mic Venues"
        case tech = "Tech & Innovation Events"
        case filmFestival = "Film Festivals & Cinema"
        case outdoorAttraction = "Outdoor Attractions & Parks"
        case museum = "Museums & Cultural Venues"
        case festival = "Festivals & Annual Events"
        case nightMarket = "Night Markets & Food Events"
        case shopping = "Shopping & Markets"
        case sports = "Sports Venues"
        case eventResource = "Event Resources & Calendars"
        case electronic = "Electronic Music & Rave Scene"
        case hackathon = "Hackathons & Coding Events"
        case latinDance = "Latin Dance & Events"
        case burlesque = "Burlesque & Performance Art"
        case rooftopBar = "Rooftop Bars & Patios"
        case undergroundMusic = "Underground & DIY Music Venues"
        case literaryEvent = "Literary Events & Book Festivals"
        case chineseCulture = "Chinese Cultural Events"
        case karaoke = "Karaoke Venues"
        case streetFestival = "Unique Annual Street Festivals (2025)"
        case burnaby = "Burnaby Venues"
        case surrey = "Surrey Venues"
        case richmond = "Richmond Venues"
        case langley = "Langley Venues"
        case coquitlam = "Coquitlam & Tri-Cities Venues"
        case other = "Other"
    }
    
    enum VenueRegion: String, Codable, CaseIterable {
        case vancouver = "Vancouver"
        case vancouverIsland = "Vancouver Island"
        case seaToSky = "Sea to Sky Corridor"
        case squamish = "Squamish"
        case whistler = "Whistler"
        case burnaby = "Burnaby"
        case surrey = "Surrey"
        case richmond = "Richmond"
        case langley = "Langley"
        case coquitlam = "Coquitlam & Tri-Cities"
        case sunshineCoast = "Sunshine Coast"
        case other = "Other"
    }
}
