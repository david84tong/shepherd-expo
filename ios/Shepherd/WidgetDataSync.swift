//
//  WidgetDataSync.swift
//  Shepherd
//
//  Created for Shepherd
//

import Foundation
import WidgetKit

@objc(WidgetDataSync)
class WidgetDataSync: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc(updateWidgetData:)
  func updateWidgetData(_ data: NSDictionary) -> Void {
    let sharedDefaults = UserDefaults(suiteName: "group.shepherd.widget.streak")
    
    if let streak = data["currentStreak"] as? NSNumber {
      sharedDefaults?.set(streak.intValue, forKey: "streak")
    }
    
    if let lastActivityDate = data["lastActivityDate"] as? String {
      sharedDefaults?.set(lastActivityDate, forKey: "lastActivityDate")
    }
    
    sharedDefaults?.synchronize()
    
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
} 