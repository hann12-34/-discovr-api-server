import Foundation
import SwiftUI

// Extension to add Calgary activities to the system
extension SeasonalActivity {
    static var calgaryActivities: [SeasonalActivity] {
        print("⚠️ WARNING: Attempted to access Calgary sample data which has been disabled. Using empty array instead.")
        return []
    }
}
