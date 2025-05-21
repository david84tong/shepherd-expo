import Foundation
import React
import WidgetKit

@objc(WidgetDataSync)
class WidgetDataSync: NSObject {
  
  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc func updateWidgetData(_ data: [String: Any]) {
    // Get the app group identifier for shared container
    let appGroupId = "group.second.round.shepherd.widget"
    
    // Access the shared container
    if let sharedDefaults = UserDefaults(suiteName: appGroupId) {
      // Extract data from the passed dictionary
      let currentStreak = data["currentStreak"] as? Int ?? 0
      let lastActivityDate = data["lastActivityDate"] as? String
      
      // Save the data to the shared container
      sharedDefaults.set(currentStreak, forKey: "currentStreak")
      sharedDefaults.set(lastActivityDate, forKey: "lastActivityDate")
      
      // Notify the widget to update
      WidgetCenter.shared.reloadAllTimelines()
      
      print("Widget data updated: streak=\(currentStreak), lastActivity=\(String(describing: lastActivityDate))")
    } else {
      print("Failed to access shared UserDefaults for widget")
    }
  }
} 