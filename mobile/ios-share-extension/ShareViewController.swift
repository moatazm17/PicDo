import UIKit
import MobileCoreServices

class ShareViewController: UIViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        processSharedContent()
    }
    
    private func processSharedContent() {
        // Get the items from the extension context
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
            completeRequest()
            return
        }
        
        // Look for an image attachment
        var imageFound = false
        
        for extensionItem in extensionItems {
            if let attachments = extensionItem.attachments {
                for attachment in attachments {
                    if attachment.hasItemConformingToTypeIdentifier(kUTTypeImage as String) {
                        imageFound = true
                        
                        attachment.loadItem(forTypeIdentifier: kUTTypeImage as String, options: nil) { [weak self] data, error in
                            guard let self = self else { return }
                            
                            var imageData: Data?
                            
                            if let url = data as? URL {
                                imageData = try? Data(contentsOf: url)
                            } else if let directData = data as? Data {
                                imageData = directData
                            }
                            
                            if let imageData = imageData {
                                self.saveImageAndOpenApp(imageData: imageData)
                            } else {
                                self.completeRequest()
                            }
                        }
                        break
                    }
                }
            }
        }
        
        if !imageFound {
            completeRequest()
        }
    }
    
    private func saveImageAndOpenApp(imageData: Data) {
        // Create a unique filename
        let fileName = "shared_image_\(UUID().uuidString).jpg"
        
        // Get the shared container URL
        guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.picdo.app") else {
            completeRequest()
            return
        }
        
        let fileURL = containerURL.appendingPathComponent(fileName)
        
        do {
            // Save the image to the shared container
            try imageData.write(to: fileURL)
            
            // Create a URL to open the main app
            let fileURLString = fileURL.absoluteString
            let encodedURL = fileURLString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? fileURLString
            
            if let deepLinkURL = URL(string: "picdo://share?uri=\(encodedURL)") {
                // Open the main app with the deep link
                extensionContext?.open(deepLinkURL) { [weak self] success in
                    DispatchQueue.main.async {
                        self?.completeRequest()
                    }
                }
            } else {
                completeRequest()
            }
        } catch {
            print("Error saving shared image: \(error)")
            completeRequest()
        }
    }
    
    private func completeRequest() {
        // Complete the extension request
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
