//
//  ShepherdStreakWidget.swift
//  ShepherdStreakWidget
//
//  Created by Shriram Vasudevan on 5/18/25.
//

import WidgetKit
import SwiftUI

// MARK: - Widget Data Model
struct StreakData {
    let currentStreak: Int
    let lastActivityDate: Date?
    
    var streakState: StreakState {
        if currentStreak == 0 {
            return .noStreak
        }
        
        guard let lastActivityDate = lastActivityDate else {
            return .active(days: currentStreak)
        }
        
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let lastActivity = calendar.startOfDay(for: lastActivityDate)
        
        // Check if the last activity was today or yesterday
        if calendar.isDateInToday(lastActivity) {
            return .active(days: currentStreak) // Activity today, streak is active
        } else if calendar.isDateInYesterday(lastActivity) {
            return .atRisk(days: currentStreak) // Activity yesterday, streak at risk
        } else {
            let components = calendar.dateComponents([.day], from: lastActivity, to: today)
            if let days = components.day, days > 1 {
                // More than 1 day since last activity, streak is broken
                return .broken(daysMissed: days - 1)
            } else {
                return .active(days: currentStreak) // Fallback
            }
        }
    }
}

// MARK: - Streak State Enum
enum StreakState {
    case noStreak
    case active(days: Int)
    case atRisk(days: Int)
    case broken(daysMissed: Int)
    
    var labelText: String {
        switch self {
        case .noStreak:
            return "Start your first streak!"
        case .active(let days):
            return "\(days) day streak"
        case .atRisk(let days):
            return "\(days) day streak - at risk!"
        case .broken(let daysMissed):
            return "Streak broken: \(daysMissed) days missed"
        }
    }
    
    var backgroundImageName: String {
        switch self {
        case .noStreak:
            return "streak_0"  // Image for 0 day streak
        case .active(let days):
            // Cap the streak display at 8 days
            let cappedDays = min(days, 8)
            return "streak_\(cappedDays)"
        case .atRisk, .broken:
            // For broken streaks, use the inactivity images (1-3 days)
            let daysMissed: Int
            if case .broken(let missed) = self {
                daysMissed = min(missed, 3)  // Cap at 3 days of inactivity
            } else {
                daysMissed = 1  // For atRisk, show 1 day inactive
            }
            return "inactive_\(daysMissed)"
        }
    }
    
    var iconName: String {
        switch self {
        case .noStreak:
            return "flame.slash"
        case .active:
            return "flame.fill"
        case .atRisk:
            return "flame"
        case .broken:
            return "flame.slash"
        }
    }
    
    var iconColor: Color {
        switch self {
        case .noStreak:
            return .gray
        case .active:
            return .orange
        case .atRisk:
            return .yellow
        case .broken:
            return .gray
        }
    }
}

// MARK: - Time Provider
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> StreakEntry {
        StreakEntry(date: Date(), streakData: StreakData(currentStreak: 3, lastActivityDate: Date()))
    }

    func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> ()) {
        let entry = StreakEntry(date: Date(), streakData: loadStreakData())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let streakData = loadStreakData()
        let entry = StreakEntry(date: Date(), streakData: streakData)
        
        // Update once per day at midnight
        let midnight = Calendar.current.startOfDay(for: Date().addingTimeInterval(86400))
        let timeline = Timeline(entries: [entry], policy: .after(midnight))
        completion(timeline)
    }
    
    private func loadStreakData() -> StreakData {
        let defaults = UserDefaults(suiteName: "group.shepherd.widget.streak")
        let streak = defaults?.integer(forKey: "currentStreak") ?? 0
        
        var lastActivityDate: Date? = nil
        if let dateString = defaults?.string(forKey: "lastActivityDate"),
           !dateString.isEmpty {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            lastActivityDate = formatter.date(from: dateString)
        }
        
        return StreakData(currentStreak: streak, lastActivityDate: lastActivityDate)
    }
}

// MARK: - Widget Entry
struct StreakEntry: TimelineEntry {
    let date: Date
    let streakData: StreakData
}

// MARK: - Widget View
struct ShepherdStreakWidgetEntryView : View {
    var entry: StreakEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        let state = entry.streakData.streakState
        
        // Get the recommended widget size for the current family
        let widgetSize = WidgetFamily.systemSmall.getRecommendedSize()
        
        ZStack {
            // Background Image with explicit frame and content mode
            Image(state.backgroundImageName)
                .resizable()
                // .border(Color.black, width: 4)
                .scaledToFill()
                .frame(width: widgetSize.width + 15, height: widgetSize.height + 15)
                .clipped()
            
            // Content overlay
            VStack(spacing: 8) {
                Image(systemName: state.iconName)
                    .font(.system(size: 33))
                    .foregroundColor(state.iconColor)
                
                Text(state.labelText)
                    .font(.system(size: 14, weight: .semibold))
                    .multilineTextAlignment(.center)
                    .foregroundColor(.primary)
                    .minimumScaleFactor(0.5) // Allow text to scale down if needed
                
                if case .atRisk = state {
                    Text("Open app now!")
                        .font(.system(size: 12))
                        .foregroundColor(.red)
                } else if case .broken = state {
                    Text("Restart your journey")
                        .font(.system(size: 12))
                        .foregroundColor(.blue)
                }
            }
            .padding()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .edgesIgnoringSafeArea(.all)
        .background(Color.clear)
    }
}

// Extension to get recommended widget sizes
extension WidgetFamily {
    func getRecommendedSize() -> CGSize {
        switch self {
        case .systemSmall:
            // Standard small widget size (2x2)
            return CGSize(width: 169, height: 169)
        default:
            return CGSize(width: 169, height: 169)
        }
    }
}

// MARK: - Widget Configuration
struct ShepherdStreakWidget: Widget {
    let kind: String = "ShepherdStreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            ShepherdStreakWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Shepherd Streak")
        .description("Keep track of your daily streak")
        .supportedFamilies([.systemSmall])
    }
}

// Preview Provider
#Preview {
    Group {
        // Active streak
        ShepherdStreakWidgetEntryView(entry: StreakEntry(
            date: Date(),
            streakData: StreakData(currentStreak: 5, lastActivityDate: Date())
        ))
        .previewContext(WidgetPreviewContext(family: .systemSmall))
        .previewDisplayName("Active Streak")
        
        // At risk streak
        ShepherdStreakWidgetEntryView(entry: StreakEntry(
            date: Date(),
            streakData: StreakData(currentStreak: 7, lastActivityDate: Calendar.current.date(byAdding: .day, value: -1, to: Date())!)
        ))
        .previewContext(WidgetPreviewContext(family: .systemSmall))
        .previewDisplayName("At Risk")
    }
}
