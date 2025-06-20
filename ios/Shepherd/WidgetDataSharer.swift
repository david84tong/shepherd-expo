import Foundation
import WidgetKit

@objc(WidgetDataSharer)
class WidgetDataSharer: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  private var userDefaults: UserDefaults? {
    // IMPORTANT: Replace "group.com.shepherd.app" with your actual App Group ID.
    return UserDefaults(suiteName: "group.com.shepherd.app")
  }

  @objc(updateVerseData:withVerse:withImageURL:)
  func updateVerseData(bibleReference: String, verse: String, imageURL: String?) {
    guard let userDefaults = self.userDefaults else {
        print("Error: Could not access UserDefaults with suite name.")
        return
    }

    fetchImageData(from: imageURL) { imageData in
        let devotionalData = SharedDevotional(
            status: .verseAvailable,
            bibleReference: bibleReference,
            verse: verse,
            imageData: imageData
        )
        self.saveAndReload(devotionalData, userDefaults: userDefaults)
    }
  }

  @objc(updateWidgetStatus:)
  func updateWidgetStatus(status: String) {
    guard let userDefaults = self.userDefaults else {
        print("Error: Could not access UserDefaults with suite name.")
        return
    }

    let devotionalData = SharedDevotional(
        status: SharedDevotional.Status(rawValue: status) ?? .loggedOut,
        bibleReference: nil,
        verse: nil,
        imageData: nil
    )
    self.saveAndReload(devotionalData, userDefaults: userDefaults)
  }

  private func saveAndReload(_ data: SharedDevotional, userDefaults: UserDefaults) {
    do {
        let encodedData = try JSONEncoder().encode(data)
        userDefaults.set(encodedData, forKey: "dailyVerse")
        print("Successfully saved data to UserDefaults. Status: \(data.status.rawValue)")
        WidgetCenter.shared.reloadAllTimelines()
    } catch {
        print("Error encoding or saving data: \(error.localizedDescription)")
    }
  }

  private func fetchImageData(from urlString: String?, completion: @escaping (Data?) -> Void) {
      guard let urlString = urlString, let url = URL(string: urlString) else {
          completion(nil)
          return
      }
      URLSession.shared.dataTask(with: url) { data, _, error in
          guard let data = data, error == nil else {
              print("Error fetching image data: \(error?.localizedDescription ?? "Unknown error")")
              completion(nil)
              return
          }
          completion(data)
      }.resume()
  }
}

// This needs to match the struct in the widget target
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