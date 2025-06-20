//
//  DailyVerseWidgetLiveActivity.swift
//  DailyVerseWidget
//
//  Created by Dev on 20/06/2025.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct DailyVerseWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct DailyVerseWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DailyVerseWidgetAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension DailyVerseWidgetAttributes {
    fileprivate static var preview: DailyVerseWidgetAttributes {
        DailyVerseWidgetAttributes(name: "World")
    }
}

extension DailyVerseWidgetAttributes.ContentState {
    fileprivate static var smiley: DailyVerseWidgetAttributes.ContentState {
        DailyVerseWidgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: DailyVerseWidgetAttributes.ContentState {
         DailyVerseWidgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: DailyVerseWidgetAttributes.preview) {
   DailyVerseWidgetLiveActivity()
} contentStates: {
    DailyVerseWidgetAttributes.ContentState.smiley
    DailyVerseWidgetAttributes.ContentState.starEyes
}
