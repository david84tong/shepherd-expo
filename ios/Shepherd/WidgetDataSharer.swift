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
    return UserDefaults(suiteName: "group.shepherd.widget.streak1")
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

  @objc(updateTimeline:)
  func updateTimeline(entries: [[String: Any]]) {
    guard let userDefaults = self.userDefaults else {
      print("Error: Could not access UserDefaults with suite name.")
      return
    }
    
    let group = DispatchGroup()
    var processedEntries = [[String: Any]]()
    let lock = NSLock()

    for var entry in entries {
      group.enter()
      if let imageURL = entry["imageURL"] as? String {
        fetchImageData(from: imageURL) { imageData in
          entry["imageData"] = imageData?.base64EncodedString()
          lock.lock()
          processedEntries.append(entry)
          lock.unlock()
          group.leave()
        }
      } else {
        lock.lock()
        processedEntries.append(entry)
        lock.unlock()
        group.leave()
      }
    }

    group.notify(queue: .main) {
      do {
        let timelineData = try JSONSerialization.data(withJSONObject: processedEntries, options: [])
        userDefaults.set(timelineData, forKey: "widgetTimeline")
        print("Successfully saved timeline data with \(processedEntries.count) entries to UserDefaults.")
        WidgetCenter.shared.reloadAllTimelines()
      } catch {
        print("Error saving timeline data: \(error.localizedDescription)")
      }
    }
  }

  private func saveAndReload(_ data: SharedDevotional, userDefaults: UserDefaults) {
    do {
        // Instead of encoding the whole object, save properties individually
        userDefaults.set(data.status.rawValue, forKey: "dailyVerseStatus")
        userDefaults.set(data.bibleReference, forKey: "dailyVerseReference")
        userDefaults.set(data.verse, forKey: "dailyVerseText")
        userDefaults.set(data.imageData, forKey: "dailyVerseImageData")
        
        print("Successfully saved individual verse data to UserDefaults.")
        WidgetCenter.shared.reloadAllTimelines()
    } catch {
        print("Error saving individual verse data: \(error.localizedDescription)")
    }
  }

  private func fetchImageData(from urlString: String?, completion: @escaping (Data?) -> Void) {
      guard let urlString = urlString, let url = URL(string: urlString) else {
          print("📸 [WidgetDataSharer] Invalid URL string: \(urlString ?? "nil")")
          completion(nil)
          return
      }
      
      print("📸 [WidgetDataSharer] Starting image download from URL: \(url)")
      
      URLSession.shared.dataTask(with: url) { data, response, error in
          if let error = error {
              print("📸 [WidgetDataSharer] Error fetching image data: \(error.localizedDescription)")
              completion(nil)
              return
          }
          
          guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
              print("📸 [WidgetDataSharer] Invalid HTTP response: \(response.debugDescription)")
              completion(nil)
              return
          }
          
          guard let data = data, !data.isEmpty else {
              print("📸 [WidgetDataSharer] No data received from image download.")
              completion(nil)
              return
          }
          
          print("📸 [WidgetDataSharer] Successfully downloaded \(data.count) bytes of image data.")
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