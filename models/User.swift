import Foundation

struct User: Identifiable, Codable {
    var id: String
    var name: String
    var profileImageURL: String?
    var email: String?
    var isVerified: Bool = false
    
    // For encoding/decoding
    enum CodingKeys: String, CodingKey {
        case id, name, profileImageURL, email, isVerified
    }
}
