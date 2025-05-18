//
//  ShepherdStreakWidget.swift
//  ShepherdStreakWidget
//
//  Created by DavidG on 07/05/25.
//

import WidgetKit
import SwiftUI

enum StreakStatus {
    case notStarted
    case inactive1Day
    case inactive2Days
    case inactive3PlusDays
    case streak1Day
    case streak2Day
    case streak3PlusDays
}

struct Provider: AppIntentTimelineProvider {
    let userDefaults = UserDefaults(suiteName: "group.shepherd.widget.streak")
    
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: ConfigurationAppIntent(), streak: 0, lastActivityDate: nil, status: .notStarted)
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
        let streak = userDefaults?.integer(forKey: "streak") ?? 0
        let lastActivityDateString = userDefaults?.string(forKey: "lastActivityDate")
        
        // Parse date if available
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let lastActivityDate = lastActivityDateString != nil ? dateFormatter.date(from: lastActivityDateString!) : nil
        
        // Calculate streak status
        let status = calculateStreakStatus(streak: streak, lastActivityDate: lastActivityDate)
        
        return SimpleEntry(date: Date(), configuration: configuration, streak: streak, lastActivityDate: lastActivityDate, status: status)
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
        let streak = userDefaults?.integer(forKey: "streak") ?? 0
        let lastActivityDateString = userDefaults?.string(forKey: "lastActivityDate")
        
        // Parse date if available
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let lastActivityDate = lastActivityDateString != nil ? dateFormatter.date(from: lastActivityDateString!) : nil
        
        // Calculate streak status
        let status = calculateStreakStatus(streak: streak, lastActivityDate: lastActivityDate)
        
        let entry = SimpleEntry(date: Date(), configuration: configuration, streak: streak, lastActivityDate: lastActivityDate, status: status)
        
        // Update every 4 hours
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 4, to: Date())!
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }
    
    // Helper function to calculate streak status
    func calculateStreakStatus(streak: Int, lastActivityDate: Date?) -> StreakStatus {
        // Case 1: User has never used the app (no lastActivityDate)
        if lastActivityDate == nil {
            return .notStarted
        }
        
        // Case 2: User has a streak
        if streak > 0 {
            switch streak {
            case 1:
                return .streak1Day
            case 2:
                return .streak2Day
            default:
                return .streak3PlusDays
            }
        }
        
        // Case 3: User had a streak but lost it
        // Calculate days since last activity
        if let lastActivity = lastActivityDate {
            let calendar = Calendar.current
            let daysSinceLastActivity = calendar.dateComponents([.day], from: lastActivity, to: Date()).day ?? 0
            
            switch daysSinceLastActivity {
            case 0...1:
                return .inactive1Day
            case 2:
                return .inactive2Days
            default:
                return .inactive3PlusDays
            }
        }
        
        // Default case
        return .notStarted
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let configuration: ConfigurationAppIntent
    let streak: Int
    let lastActivityDate: Date?
    let status: StreakStatus
}

struct ShepherdStreakWidgetEntryView : View {
    var entry: Provider.Entry
    
    // Helper computed properties for UI
    var backgroundColor: Color {
        switch entry.status {
        case .notStarted:
            return Color(.systemGray6)
        case .inactive1Day:
            return Color(.systemOrange).opacity(0.2)
        case .inactive2Days:
            return Color(.systemOrange).opacity(0.3)
        case .inactive3PlusDays:
            return Color(.systemRed).opacity(0.2)
        case .streak1Day:
            return Color(.systemGreen).opacity(0.2)
        case .streak2Day:
            return Color(.systemGreen).opacity(0.3)
        case .streak3PlusDays:
            return Color(.systemGreen).opacity(0.4)
        }
    }
    
    var lambImage: String {
        switch entry.status {
        case .notStarted:
            return "lamb_neutral"
        case .inactive1Day:
            return "lamb_concerned"
        case .inactive2Days:
            return "lamb_sad"
        case .inactive3PlusDays:
            return "lamb_crying"
        case .streak1Day:
            return "lamb_happy"
        case .streak2Day:
            return "lamb_very_happy"
        case .streak3PlusDays:
            return "lamb_excited"
        }
    }
    
    var titleText: String {
        switch entry.status {
        case .notStarted:
            return "Start Your Journey"
        case .inactive1Day:
            return "Missing You"
        case .inactive2Days:
            return "Come Back Soon"
        case .inactive3PlusDays:
            return "Your Lamb Needs You"
        case .streak1Day:
            return "1 Day Streak!"
        case .streak2Day:
            return "2 Day Streak!"
        case .streak3PlusDays:
            return "\(entry.streak) Day Streak!"
        }
    }
    
    var messageText: String {
        switch entry.status {
        case .notStarted:
            return "Tap to begin your first day with the Shepherd"
        case .inactive1Day:
            return "You missed a day. Tap to keep your streak going!"
        case .inactive2Days:
            return "Your lamb is getting lonely. Come back soon!"
        case .inactive3PlusDays:
            return "Your lamb is sad. Please come check in!"
        case .streak1Day:
            return "Great start! Come back tomorrow for day 2."
        case .streak2Day:
            return "You're building momentum! Keep it up!"
        case .streak3PlusDays:
            return "Amazing dedication! Your lamb is thriving!"
        }
    }

    var body: some View {
        ZStack {
            backgroundColor
                .ignoresSafeArea()
            
            VStack {
                Text(titleText)
                    .font(.headline)
                    .padding(.top, 8)
                
                // Placeholder for lamb image
                // In production, these would be actual images from your asset catalog
                Image(systemName: "heart.fill")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 40, height: 40)
                    .padding(.vertical, 5)
                
                if entry.status != .notStarted {
                    Text("\(entry.streak) days")
                        .font(.system(size: 20, weight: .bold))
                }
                
                Text(messageText)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 8)
                    .padding(.bottom, 8)
            }
            .padding()
        }
    }
}

struct ShepherdStreakWidget: Widget {
    let kind: String = "ShepherdStreakWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { entry in
            ShepherdStreakWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Shepherd Streak")
        .description("Keep track of your daily Bible reading streak.")
        .supportedFamilies([.systemSmall])
    }
}

extension ConfigurationAppIntent {
    fileprivate static var smiley: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()
        intent.favoriteEmoji = "😀"
        return intent
    }
    
    fileprivate static var starEyes: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()
        intent.favoriteEmoji = "🤩"
        return intent
    }
}

#Preview(as: .systemSmall) {
    ShepherdStreakWidget()
} timeline: {
    SimpleEntry(date: .now, configuration: .smiley, streak: 7, lastActivityDate: Date(), status: .streak3PlusDays)
    SimpleEntry(date: .now, configuration: .smiley, streak: 0, lastActivityDate: nil, status: .notStarted)
    SimpleEntry(date: .now, configuration: .smiley, streak: 0, lastActivityDate: Date().addingTimeInterval(-86400), status: .inactive1Day)
}
