//
//  DailyVerseWidget.swift
//  DailyVerseWidget
//
//  Created by MAC on 13/06/2025.
//
import WidgetKit
import SwiftUI

// 1. Data model for the widget's entry
struct DevotionalEntry: TimelineEntry {
    let date: Date
    let status: SharedDevotional.Status
    let bibleReference: String?
    let verse: String?
    let image: UIImage?
}

// 2. Data structure for UserDefaults
struct SharedDevotional: Codable {
    enum Status: String, Codable {
        case loggedOut
        case noVerseAvailable
        case verseAvailable
    }
    
    let status: Status
    let bibleReference: String?
    let verse: String?
    let imageData: Data?
}

// 3. Timeline Provider
struct Provider: TimelineProvider {
    // A placeholder view for the widget gallery.
    func placeholder(in context: Context) -> DevotionalEntry {
        DevotionalEntry(
            date: Date(),
            status: .loggedOut,
            bibleReference: nil,
            verse: nil,
            image: nil
        )
    }

    // A snapshot of the widget's current state for transient situations.
    func getSnapshot(in context: Context, completion: @escaping (DevotionalEntry) -> ()) {
        let entry = readEntryFromUserDefaults()
        completion(entry)
    }

    // The timeline of entries for the widget to display.
    func getTimeline(in context:Context, completion: @escaping (Timeline<DevotionalEntry>) -> ()) {
        let entry = readEntryFromUserDefaults()
        // Refresh the widget every hour. The main app is responsible for updating the content.
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    // Helper to read data from shared UserDefaults
    private func readEntryFromUserDefaults() -> DevotionalEntry {
        // IMPORTANT: Replace "group.com.shepherd.app" with your actual App Group ID.
        guard let userDefaults = UserDefaults(suiteName: "group.com.shepherd.app"),
              let savedData = userDefaults.data(forKey: "dailyVerse"),
              let sharedDevotional = try? JSONDecoder().decode(SharedDevotional.self, from: savedData) else {
            // If anything fails, return the default logged-out state.
            return DevotionalEntry(date: Date(), status: .loggedOut, bibleReference: nil, verse: nil, image: nil)
        }
        
        let image = sharedDevotional.imageData != nil ? UIImage(data: sharedDevotional.imageData!) : nil
        
        return DevotionalEntry(
            date: Date(),
            status: sharedDevotional.status,
            bibleReference: sharedDevotional.bibleReference,
            verse: sharedDevotional.verse,
            image: image
        )
    }
}

// 4. SwiftUI View for the Widget
struct DailyVerseWidgetEntryView : View {
    var entry: DevotionalEntry
    let defaultBgColor = Color(hex: "#090E23")

    var body: some View {
        ZStack {
            // Background
            if let bgImage = entry.image {
                Image(uiImage: bgImage)
                    .resizable()
                    .scaledToFill()
            } else {
                defaultBgColor.edgesIgnoringSafeArea(.all)
            }
            
            // Decorative stars (only for verse view)
            if entry.status == .verseAvailable {
                StarsOverlay()
            }

            // Content
            switch entry.status {
            case .verseAvailable:
                VStack(alignment: .leading, spacing: 4) {
                    if let reference = entry.bibleReference, let verse = entry.verse {
                        Text(reference)
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.white)

                        Text("Verse of the Day")
                            .font(.system(size: 13))
                            .foregroundColor(Color.white.opacity(0.8))
                            .padding(.bottom, 8)

                        Text(verse)
                            .font(.system(size: 16, weight: .regular))
                            .foregroundColor(.white)
                            .lineSpacing(4)
                    }
                }
                .padding()
            case .loggedOut:
                Text("Login to see your daily verse.")
                    .font(.system(size: 16))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .padding()
            case .noVerseAvailable:
                Text("No verse data for today.")
                    .font(.system(size: 16))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .padding()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .edgesIgnoringSafeArea(.all)
        .background(Color.clear)
    }
}

// 5. Main Widget Definition
struct DailyVerseWidget: Widget {
    let kind: String = "DailyVerseWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            DailyVerseWidgetEntryView(entry: entry)
                .containerBackground(.fill, for: .widget)
        }
        .supportedFamilies([.systemMedium])
        .configurationDisplayName("Daily Verse")
        .description("Your verse of the day from Shepherd.")
    }
}

// MARK: - Reusable UI Components

struct StarsOverlay: View {
    var body: some View {
        ZStack {
            Circle().fill(Color.white.opacity(0.7)).frame(width: 3, height: 3).offset(x: -60, y: -40)
            Circle().fill(Color.white.opacity(0.5)).frame(width: 2, height: 2).offset(x: 40, y: -50)
            Circle().fill(Color.white.opacity(0.6)).frame(width: 2.5, height: 2.5).offset(x: 80, y: -20)
            Circle().fill(Color.white.opacity(0.4)).frame(width: 1.5, height: 1.5).offset(x: -30, y: 20)
            Circle().fill(Color.white.opacity(0.8)).frame(width: 2, height: 2).offset(x: 90, y: 40)
            Circle().fill(Color.white.opacity(0.5)).frame(width: 2, height: 2).offset(x: -90, y: 50)
        }
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Previews
#Preview(as: .systemMedium) {
    DailyVerseWidget()
} timeline: {
    DevotionalEntry(date: .now, status: .verseAvailable, bibleReference: "John 1:3", verse: "All things were made by him; and without him was not any thing made that was made.", image: nil)
    DevotionalEntry(date: .now, status: .loggedOut, bibleReference: nil, verse: nil, image: nil)
    DevotionalEntry(date: .now, status: .noVerseAvailable, bibleReference: nil, verse: nil, image: nil)
}
