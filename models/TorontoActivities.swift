import Foundation
import SwiftUI

// Extension to add Toronto activities to the system
extension SeasonalActivity {
    static var torontoActivities: [SeasonalActivity] {
        print("⚠️ WARNING: Attempted to access Toronto sample data which has been disabled. Using empty array instead.")
        return []
    }
}
