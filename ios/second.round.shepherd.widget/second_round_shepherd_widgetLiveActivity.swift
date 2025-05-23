//
//  second_round_shepherd_widgetLiveActivity.swift
//  second.round.shepherd.widget
//
//  Created by Dante Kim on 5/21/25.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct second_round_shepherd_widgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct second_round_shepherd_widgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: second_round_shepherd_widgetAttributes.self) { context in
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

extension second_round_shepherd_widgetAttributes {
    fileprivate static var preview: second_round_shepherd_widgetAttributes {
        second_round_shepherd_widgetAttributes(name: "World")
    }
}

extension second_round_shepherd_widgetAttributes.ContentState {
    fileprivate static var smiley: second_round_shepherd_widgetAttributes.ContentState {
        second_round_shepherd_widgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: second_round_shepherd_widgetAttributes.ContentState {
         second_round_shepherd_widgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: second_round_shepherd_widgetAttributes.preview) {
   second_round_shepherd_widgetLiveActivity()
} contentStates: {
    second_round_shepherd_widgetAttributes.ContentState.smiley
    second_round_shepherd_widgetAttributes.ContentState.starEyes
}
