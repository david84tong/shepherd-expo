//
//  DailyVerseWidget.swift
//  DailyVerseWidget
//
//  Created by MAC on 13/06/2025.
//
import WidgetKit
import SwiftUI
import Firebase
import FirebaseFirestore

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
        // First try to get data from UserDefaults (shared by main app)
        let userDefaultsEntry = readEntryFromUserDefaults()
        
        // If we have valid data from UserDefaults, use it
        if userDefaultsEntry.status == .verseAvailable && userDefaultsEntry.bibleReference != nil && userDefaultsEntry.verse != nil {
            let timeline = Timeline(entries: [userDefaultsEntry], policy: .after(Calendar.current.date(byAdding: .hour, value: 1, to: Date())!))
            completion(timeline)
            return
        }
        
        // If no data from UserDefaults, try to fetch from Firestore directly
        fetchFromFirestore { firestoreEntry in
            let finalEntry = firestoreEntry ?? userDefaultsEntry
            let timeline = Timeline(entries: [finalEntry], policy: .after(Calendar.current.date(byAdding: .hour, value: 1, to: Date())!))
            completion(timeline)
        }
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
    
    // Helper to fetch data directly from Firestore
    private func fetchFromFirestore(completion: @escaping (DevotionalEntry?) -> Void) {
        // Configure Firebase if not already configured
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        
        let db = Firestore.firestore()
        
        // Try to get today's devotional by ID first (format: YYYY-MM-DD)
        let today = Date()
        let todayString = ISO8601DateFormatter().string(from: today)
        let todayId = String(todayString.split(separator: "T")[0]) // Format: YYYY-MM-DD
        
        print("Widget: Trying to fetch devotional with ID:", todayId)
        
        let devotionalsRef = db.collection("dailyDevotionals")
        
        // First try to get by document ID
        devotionalsRef.document(todayId).getDocument { snapshot, error in
            if let error = error {
                print("Widget: Error fetching devotional:", error)
                completion(nil)
                return
            }
            
            var documentSnapshot = snapshot
            
            // If today's document doesn't exist, try test document
            if !(snapshot?.exists ?? false) {
                print("Widget: No devotional found with today's ID, trying test document ID...")
                
                devotionalsRef.document("2025-06-11").getDocument { testSnapshot, testError in
                    if let testError = testError {
                        print("Widget: Error fetching test devotional:", testError)
                        completion(nil)
                        return
                    }
                    
                    if testSnapshot?.exists ?? false {
                        print("Widget: Found test devotional with ID: 2025-06-11")
                        documentSnapshot = testSnapshot
                    } else {
                        print("Widget: Test document not found either")
                        completion(nil)
                        return
                    }
                    
                    // Process the document
                    processDevotionalDocument(documentSnapshot, completion: completion)
                }
            } else {
                // Process the document
                processDevotionalDocument(documentSnapshot, completion: completion)
            }
        }
    }
    
    private func processDevotionalDocument(_ snapshot: DocumentSnapshot?, completion: @escaping (DevotionalEntry?) -> Void) {
        guard let snapshot = snapshot, snapshot.exists,
              let data = snapshot.data() else {
            print("Widget: No devotional data found")
            completion(nil)
            return
        }
        
        // Extract devotional data
        let bibleReference = data["bibleReference"] as? String
        let verse = data["verse"] as? String
        let imageURL = data["imageURL"] as? String
        
        print("Widget: Fetched devotional data - reference:", bibleReference ?? "nil", "verse length:", verse?.count ?? 0)
        
        // If we have valid data, create entry
        if let reference = bibleReference, let verseText = verse, !reference.isEmpty, !verseText.isEmpty {
            // Fetch image if available
            fetchImage(from: imageURL) { image in
                let entry = DevotionalEntry(
                    date: Date(),
                    status: .verseAvailable,
                    bibleReference: reference,
                    verse: verseText,
                    image: image
                )
                completion(entry)
            }
        } else {
            print("Widget: Invalid devotional data - missing reference or verse")
            completion(nil)
        }
    }
    
    private func fetchImage(from urlString: String?, completion: @escaping (UIImage?) -> Void) {
        guard let urlString = urlString, let url = URL(string: urlString) else {
            completion(nil)
            return
        }
        
        URLSession.shared.dataTask(with: url) { data, _, error in
            guard let data = data, error == nil else {
                print("Widget: Error fetching image data:", error?.localizedDescription ?? "Unknown error")
                completion(nil)
                return
            }
            
            let image = UIImage(data: data)
            completion(image)
        }.resume()
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
