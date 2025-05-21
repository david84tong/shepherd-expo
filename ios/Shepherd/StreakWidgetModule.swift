import Foundation
import WidgetKit

@objc(StreakWidgetModule)
class StreakWidgetModule: NSObject {
  
  @objc
  func updateStreak(_ streak: NSNumber) {
    
    
    if let userDefaults = UserDefaults(suiteName: "group.shepherd.widget.streak") {
      
      
      // Get current value before update
      let currentStreak = userDefaults.integer(forKey: "streak")
      
      
      // Set new value
      userDefaults.set(streak.intValue, forKey: "streak")
      userDefaults.synchronize()
      
      // Verify the value was set
      let savedStreak = userDefaults.integer(forKey: "streak")
      
      
      // Force widget refresh using multiple methods
      DispatchQueue.main.async {
        // Method 1: Reload specific widget
        WidgetCenter.shared.reloadTimelines(ofKind: "ShepherdStreakWidget")
        
        
        // Method 2: Reload all widgets
        WidgetCenter.shared.reloadAllTimelines()
        
        
        // Method 3: Invalidate configuration
        if let configuration = ConfigurationAppIntent() {
          WidgetCenter.shared.reloadTimelines(ofKind: "ShepherdStreakWidget", in: [configuration])
          
        }
        
        // Method 4: Force another reload after a short delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
          WidgetCenter.shared.reloadTimelines(ofKind: "ShepherdStreakWidget")
          
        }
      }
    } else {
      print("StreakWidgetModule: Failed to access UserDefaults")
    }
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
} 