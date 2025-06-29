import Foundation

struct ActivityList: Identifiable, Codable {
    let id: UUID
    let userId: String
    let name: String
    var description: String
    var activities: [SeasonalActivity]
    var isPublic: Bool
    let createdAt: Date
    var updatedAt: Date
    var likes: Int
    var tags: [String]
    var coverImage: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId
        case name
        case description
        case activities
        case isPublic
        case createdAt
        case updatedAt
        case likes
        case tags
        case coverImage
    }
    
    // Computed Properties
    var activityCount: Int {
        activities.count
    }
    
    var primarySeason: SeasonalActivity.Season? {
        let seasonCounts = Dictionary(grouping: activities, by: { $0.season })
            .mapValues { $0.count }
        return seasonCounts.max(by: { $0.value < $1.value })?.key
    }
    
    var totalDuration: TimeInterval {
        let sortedActivities = activities.sorted { $0.dateRange.start < $1.dateRange.start }
        guard let firstStart = sortedActivities.first?.dateRange.start,
              let lastEnd = sortedActivities.last?.dateRange.end else {
            return 0
        }
        return lastEnd.timeIntervalSince(firstStart)
    }
    
    // Helper Methods
    func containsActivity(_ activity: SeasonalActivity) -> Bool {
        activities.contains { $0.id == activity.id }
    }
    
    func activitiesInSeason(_ season: SeasonalActivity.Season) -> [SeasonalActivity] {
        activities.filter { $0.season == season }
    }
    
    func activitiesWithRequirement(_ requirement: SeasonalActivity.Requirement) -> [SeasonalActivity] {
        activities.filter { $0.requirements.contains(requirement) }
    }
    
    // Mutating Methods
    mutating func addActivity(_ activity: SeasonalActivity) {
        guard !containsActivity(activity) else { return }
        activities.append(activity)
        updatedAt = Date()
    }
    
    mutating func removeActivity(_ activity: SeasonalActivity) {
        activities.removeAll { $0.id == activity.id }
        updatedAt = Date()
    }
    
    mutating func addTag(_ tag: String) {
        guard !tags.contains(tag) else { return }
        tags.append(tag)
        updatedAt = Date()
    }
    
    mutating func removeTag(_ tag: String) {
        tags.removeAll { $0 == tag }
        updatedAt = Date()
    }
    
    mutating func togglePublic() {
        isPublic.toggle()
        updatedAt = Date()
    }
    
    mutating func incrementLikes() {
        likes += 1
        updatedAt = Date()
    }
} 