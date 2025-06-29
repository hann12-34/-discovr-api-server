import Foundation
import SwiftUI

struct ActivityPhoto: Identifiable, Codable {
    var id = UUID()
    var imageURL: String
    var caption: String?
    var createdAt: Date = Date()
    var userSubmitted: Bool = false
    
    // Computed property for displaying image
    var image: UIImage? {
        guard let url = URL(string: imageURL),
              let data = try? Data(contentsOf: url) else {
            return nil
        }
        return UIImage(data: data)
    }
    
    // For encoding/decoding
    enum CodingKeys: String, CodingKey {
        case id, imageURL, caption, createdAt, userSubmitted
    }
}
