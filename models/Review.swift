import Foundation
import SwiftUI

struct Review: Identifiable {
    let id: UUID
    let userId: String
    let userName: String
    let activityId: UUID
    var rating: Int
    var comment: String
    var photos: [UIImage]
    var likes: Int
    var isVerified: Bool
    var isEdited: Bool
    let date: Date
    
    var hasPhotos: Bool {
        !photos.isEmpty
    }
    
    init(id: UUID = UUID(),
         userId: String,
         userName: String,
         activityId: UUID,
         rating: Int,
         comment: String,
         photos: [UIImage] = [],
         likes: Int = 0,
         isVerified: Bool = false,
         isEdited: Bool = false,
         date: Date = Date()) {
        self.id = id
        self.userId = userId
        self.userName = userName
        self.activityId = activityId
        self.rating = rating
        self.comment = comment
        self.photos = photos
        self.likes = likes
        self.isVerified = isVerified
        self.isEdited = isEdited
        self.date = date
    }
} 