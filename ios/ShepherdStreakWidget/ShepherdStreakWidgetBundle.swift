//
//  ShepherdStreakWidgetBundle.swift
//  ShepherdStreakWidget
//
//  Created by DavidG on 07/05/25.
//

import WidgetKit
import SwiftUI

@main
struct ShepherdStreakWidgetBundle: WidgetBundle {
    var body: some Widget {
        ShepherdStreakWidget()
        ShepherdStreakWidgetControl()
        ShepherdStreakWidgetLiveActivity()
    }
}
