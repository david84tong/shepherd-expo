//
//  ShepherdStreakWidget.swift
//  ShepherdStreakWidget
//
//  Created by DavidG on 07/05/25.
//

import WidgetKit
import SwiftUI

struct Provider: AppIntentTimelineProvider {
    let userDefaults = UserDefaults(suiteName: "group.shepherd.widget.streak")
    
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), configuration: ConfigurationAppIntent(), streak: 0)
    }

    func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
        
        if let userDefaults = userDefaults {
            
            let streak = userDefaults.integer(forKey: "streak")
            
            return SimpleEntry(date: Date(), configuration: configuration, streak: streak)
        } else {
            
            return SimpleEntry(date: Date(), configuration: configuration, streak: 0)
        }
    }
    
    func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
        
        if let userDefaults = userDefaults {
            let streak = userDefaults.integer(forKey: "streak")
            
            let entry = SimpleEntry(date: Date(), configuration: configuration, streak: streak)
            
            // Create entries for more frequent updates
            let entries = [
                entry,
                SimpleEntry(date: Date().addingTimeInterval(15), configuration: configuration, streak: streak),
                SimpleEntry(date: Date().addingTimeInterval(30), configuration: configuration, streak: streak),
                SimpleEntry(date: Date().addingTimeInterval(45), configuration: configuration, streak: streak)
            ]
            
            // Use .atEnd policy with a shorter interval
            return Timeline(entries: entries, policy: .after(Date().addingTimeInterval(15)))
        } else {
            
            let entry = SimpleEntry(date: Date(), configuration: configuration, streak: 0)
            return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15)))
        }
    }

//    func relevances() async -> WidgetRelevances<ConfigurationAppIntent> {
//        // Generate a list containing the contexts this widget is relevant in.
//    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let configuration: ConfigurationAppIntent
    let streak: Int
}

struct ShepherdStreakWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        VStack {
            Text("Shepherd Streak")
                .font(.headline)
            
            Text("\(entry.streak) days")
                .font(.system(size: 24, weight: .bold))
            
            Text("Keep going!")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding()
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
        .description("Shows your current workout streak.")
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
    SimpleEntry(date: .now, configuration: .smiley, streak: 7)
}
