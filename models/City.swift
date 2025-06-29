import Foundation
import CoreLocation

struct City: Identifiable, Equatable, Hashable, Codable {
    let id = UUID()
    let name: String
    let region: String
    let country: String
    let coordinate: CLLocationCoordinate2D
    let timeZone: TimeZone
    let imageURL: URL?
    
    // Full location string for display
    var fullName: String {
        return "\(name), \(region)"
    }
    
    // Helper for map regions
    func mapRegion(span: Double = 0.1) -> MKCoordinateRegion {
        return MKCoordinateRegion(
            center: coordinate,
            span: MKCoordinateSpan(latitudeDelta: span, longitudeDelta: span)
        )
    }
    
    // Conform to Codable protocol for CLLocationCoordinate2D
    enum CodingKeys: String, CodingKey {
        case name, region, country, latitude, longitude, timeZoneName, imageURLString
    }
    
    init(name: String, region: String, country: String, latitude: Double, longitude: Double, timeZone: TimeZone, imageURL: URL? = nil) {
        self.name = name
        self.region = region
        self.country = country
        self.coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        self.timeZone = timeZone
        self.imageURL = imageURL
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        name = try container.decode(String.self, forKey: .name)
        region = try container.decode(String.self, forKey: .region)
        country = try container.decode(String.self, forKey: .country)
        let latitude = try container.decode(Double.self, forKey: .latitude)
        let longitude = try container.decode(Double.self, forKey: .longitude)
        coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
        let timeZoneName = try container.decode(String.self, forKey: .timeZoneName)
        timeZone = TimeZone(identifier: timeZoneName) ?? TimeZone.current
        let imageURLString = try container.decodeIfPresent(String.self, forKey: .imageURLString)
        imageURL = imageURLString != nil ? URL(string: imageURLString!) : nil
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(name, forKey: .name)
        try container.encode(region, forKey: .region)
        try container.encode(country, forKey: .country)
        try container.encode(coordinate.latitude, forKey: .latitude)
        try container.encode(coordinate.longitude, forKey: .longitude)
        try container.encode(timeZone.identifier, forKey: .timeZoneName)
        try container.encodeIfPresent(imageURL?.absoluteString, forKey: .imageURLString)
    }
    
    // Default city definitions
    static let vancouver = City(
        name: "Vancouver", 
        region: "BC", 
        country: "Canada",
        latitude: 49.2827, 
        longitude: -123.1207,
        timeZone: TimeZone(identifier: "America/Vancouver")!,
        imageURL: URL(string: "https://images.unsplash.com/photo-1560814304-4f05b62af116")
    )
    
    static let toronto = City(
        name: "Toronto", 
        region: "ON", 
        country: "Canada",
        latitude: 43.6532, 
        longitude: -79.3832,
        timeZone: TimeZone(identifier: "America/Toronto")!,
        imageURL: URL(string: "https://images.unsplash.com/photo-1517090504586-fde19ea6066f")
    )
    
    static let montreal = City(
        name: "Montreal", 
        region: "QC", 
        country: "Canada",
        latitude: 45.5017, 
        longitude: -73.5673,
        timeZone: TimeZone(identifier: "America/Montreal")!,
        imageURL: URL(string: "https://images.unsplash.com/photo-1519178614-68673b201f36")
    )
    
    static let calgary = City(
        name: "Calgary", 
        region: "AB", 
        country: "Canada",
        latitude: 51.0447, 
        longitude: -114.0719,
        timeZone: TimeZone(identifier: "America/Edmonton")!,
        imageURL: URL(string: "https://images.unsplash.com/photo-1558025749-0ac3ba20baed")
    )
    
    static let seattle = City(
        name: "Seattle", 
        region: "WA", 
        country: "USA",
        latitude: 47.6062, 
        longitude: -122.3321,
        timeZone: TimeZone(identifier: "America/Los_Angeles")!,
        imageURL: URL(string: "https://images.unsplash.com/photo-1438401171849-74ac270044ee")
    )
    
    static let availableCities = [vancouver, toronto, montreal, calgary, seattle]
}

// Extend CL types to support Equatable
extension CLLocationCoordinate2D: Equatable {
    public static func == (lhs: CLLocationCoordinate2D, rhs: CLLocationCoordinate2D) -> Bool {
        return lhs.latitude == rhs.latitude && lhs.longitude == rhs.longitude
    }
}

extension CLLocationCoordinate2D: Hashable {
    public func hash(into hasher: inout Hasher) {
        hasher.combine(latitude)
        hasher.combine(longitude)
    }
}
