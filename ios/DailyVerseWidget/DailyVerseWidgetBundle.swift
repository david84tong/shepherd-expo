//
//  DailyVerseWidgetBundle.swift
//  DailyVerseWidget
//
//  Created by Dev on 20/06/2025.
//

import WidgetKit
import SwiftUI

@main
struct DailyVerseWidgetBundle: WidgetBundle {
    var body: some Widget {
        DailyVerseWidget()
        DailyVerseWidgetControl()
        DailyVerseWidgetLiveActivity()
    }
}
