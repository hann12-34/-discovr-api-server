import Foundation
import SwiftUI
import Combine

/// Model for a user-created collection of favorite art events
struct FavoriteCollection: Identifiable, Codable, Equatable {
    let id: String
    var name: String
    var description: String
    var eventIds: [String]
    var color: CollectionColor
    var tags: [String]
    var createdAt: Date
    var updatedAt: Date
    
    /// Initialize a new collection
    init(
        id: String = UUID().uuidString,
        name: String,
        description: String = "",
        eventIds: [String] = [],
        color: CollectionColor = .random,
        tags: [String] = [],
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.eventIds = eventIds
        self.color = color
        self.tags = tags
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
    
    /// Add an event to collection
    mutating func addEvent(id: String) {
        if !eventIds.contains(id) {
            eventIds.append(id)
            updatedAt = Date()
        }
    }
    
    /// Remove an event from collection
    mutating func removeEvent(id: String) {
        eventIds.removeAll(where: { $0 == id })
        updatedAt = Date()
    }
    
    /// Static equality comparison
    static func == (lhs: FavoriteCollection, rhs: FavoriteCollection) -> Bool {
        return lhs.id == rhs.id
    }
}

/// Predefined collection colors
enum CollectionColor: String, CaseIterable, Codable {
    case purple = "purple"
    case pink = "pink"
    case blue = "blue"
    case green = "green"
    case yellow = "yellow"
    case orange = "orange"
    case red = "red"
    case teal = "teal"
    
    /// Get a random color
    static var random: CollectionColor {
        CollectionColor.allCases.randomElement() ?? .purple
    }
    
    /// Color representation
    var color: Color {
        switch self {
        case .purple: return Color(red: 0.7, green: 0, blue: 1)
        case .pink: return Color(red: 1, green: 0, blue: 0.7)
        case .blue: return Color(red: 0, green: 0.5, blue: 1)
        case .green: return Color(red: 0, green: 0.8, blue: 0.4)
        case .yellow: return Color(red: 1, green: 0.8, blue: 0)
        case .orange: return Color(red: 1, green: 0.6, blue: 0)
        case .red: return Color(red: 1, green: 0.2, blue: 0.2)
        case .teal: return Color(red: 0, green: 0.7, blue: 0.7)
        }
    }
    
    /// Color name for display
    var displayName: String {
        rawValue.capitalized
    }
    
    /// Icon name
    var iconName: String {
        switch self {
        case .purple: return "sparkles"
        case .pink: return "heart"
        case .blue: return "drop"
        case .green: return "leaf"
        case .yellow: return "sun.max"
        case .orange: return "flame"
        case .red: return "wand.and.stars"
        case .teal: return "moon.stars"
        }
    }
}

/// Manager for handling favorite collections
class FavoriteCollectionsManager: ObservableObject {
    /// Shared instance
    static let shared = FavoriteCollectionsManager()
    
    /// Published collections
    @Published private(set) var collections: [FavoriteCollection] = []
    
    /// Publisher for collection changes
    let collectionsPublisher = PassthroughSubject<[FavoriteCollection], Never>()
    
    /// Key for UserDefaults storage
    private let collectionsKey = "favorite_art_collections"
    
    /// Initialize with stored collections
    private init() {
        loadCollections()
    }
    
    /// Load collections from storage
    private func loadCollections() {
        if let data = UserDefaults.standard.data(forKey: collectionsKey),
           let decodedCollections = try? JSONDecoder().decode([FavoriteCollection].self, from: data) {
            collections = decodedCollections
        } else {
            // Create default collections if none exist
            collections = [
                FavoriteCollection(name: "Must See", description: "My top priority art exhibitions", color: .purple),
                FavoriteCollection(name: "Weekend Plans", description: "Exhibitions to visit on weekends", color: .blue)
            ]
            saveCollections()
        }
    }
    
    /// Save collections to storage
    private func saveCollections() {
        if let encoded = try? JSONEncoder().encode(collections) {
            UserDefaults.standard.set(encoded, forKey: collectionsKey)
        }
    }
    
    /// Create a new collection
    func createCollection(name: String, description: String, color: CollectionColor) -> FavoriteCollection {
        let newCollection = FavoriteCollection(name: name, description: description, color: color)
        collections.append(newCollection)
        saveCollections()
        collectionsPublisher.send(collections)
        
        // Track analytics
        ArtGalleryAnalyticsHelper.trackCollectionCreated(id: newCollection.id, name: name)
        
        return newCollection
    }
    
    /// Update an existing collection
    func updateCollection(_ collection: FavoriteCollection) {
        if let index = collections.firstIndex(where: { $0.id == collection.id }) {
            collections[index] = collection
            collections[index].updatedAt = Date()
            saveCollections()
            collectionsPublisher.send(collections)
            
            // Track analytics
            ArtGalleryAnalyticsHelper.trackCollectionUpdated(id: collection.id, name: collection.name)
        }
    }
    
    /// Delete a collection
    func deleteCollection(id: String) {
        collections.removeAll(where: { $0.id == id })
        saveCollections()
        collectionsPublisher.send(collections)
        
        // Track analytics
        ArtGalleryAnalyticsHelper.trackCollectionDeleted(id: id)
    }
    
    /// Add an event to a collection
    func addEvent(eventId: String, eventName: String, toCollectionId collectionId: String) {
        if let index = collections.firstIndex(where: { $0.id == collectionId }) {
            collections[index].addEvent(id: eventId)
            saveCollections()
            collectionsPublisher.send(collections)
            
            // Track analytics
            ArtGalleryAnalyticsHelper.trackEventAddedToCollection(
                eventId: eventId, 
                eventName: eventName, 
                collectionId: collectionId, 
                collectionName: collections[index].name
            )
        }
    }
    
    /// Remove an event from a collection
    func removeEvent(eventId: String, fromCollectionId collectionId: String) {
        if let index = collections.firstIndex(where: { $0.id == collectionId }) {
            collections[index].removeEvent(id: eventId)
            saveCollections()
            collectionsPublisher.send(collections)
        }
    }
    
    /// Get all collections containing a specific event
    func collectionsContainingEvent(eventId: String) -> [FavoriteCollection] {
        return collections.filter { $0.eventIds.contains(eventId) }
    }
    
    /// Check if an event is in a specific collection
    func isEventInCollection(eventId: String, collectionId: String) -> Bool {
        guard let collection = collections.first(where: { $0.id == collectionId }) else {
            return false
        }
        return collection.eventIds.contains(eventId)
    }
    
    /// Get a collection by its ID
    func getCollection(id: String) -> FavoriteCollection? {
        return collections.first(where: { $0.id == id })
    }
    
    /// Get all collection IDs that contain a specific event
    func getCollectionIds(forEventId eventId: String) -> [String] {
        return collections
            .filter { collection in collection.eventIds.contains(eventId) }
            .map { $0.id }
    }
}
