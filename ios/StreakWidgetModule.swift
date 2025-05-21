import Foundation
import WidgetKit // ← Import WidgetKit to access WidgetCenter

@objc(StreakWidgetModule)
class StreakWidgetModule: NSObject {

  @objc
  func updateStreak(_ streak: NSNumber) {
    print("StreakWidgetModule: Updating streak to \(streak)")
    
    if let userDefaults = UserDefaults(suiteName: "group.shepherd.widget.streak") {
      userDefaults.set(streak.intValue, forKey: "streak")
      userDefaults.synchronize()
      print("StreakWidgetModule: Successfully updated streak in UserDefaults")

      // ✅ THIS is the crucial line to refresh the widget instantly
      WidgetCenter.shared.reloadTimelines(ofKind: "ShepherdStreakWidget")
      print("StreakWidgetModule: Triggered widget timeline reload")
    } else {
      print("StreakWidgetModule: Failed to access UserDefaults")
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
