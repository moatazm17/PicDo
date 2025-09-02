import UIKit
import MobileCoreServices

class ShareViewController: UIViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Simple loading view
        view.backgroundColor = .systemBackground
        
        let activityIndicator = UIActivityIndicatorView(style: .large)
        activityIndicator.translatesAutoresizingMaskIntoConstraints = false
        activityIndicator.startAnimating()
        view.addSubview(activityIndicator)
        
        NSLayoutConstraint.activate([
            activityIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            activityIndicator.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
        
        // Process immediately
        processSharedImage()
    }
    
    private func processSharedImage() {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let provider = item.attachments?.first else {
            completeAndReturn()
            return
        }
        
        let imageType = kUTTypeImage as String
        
        if provider.hasItemConformingToTypeIdentifier(imageType) {
            provider.loadItem(forTypeIdentifier: imageType, options: nil) { [weak self] (data, error) in
                guard let self = self else { return }
                
                var savedURL: URL?
                
                if let url = data as? URL {
                    savedURL = self.saveImageToSharedContainer(from: url)
                } else if let image = data as? UIImage {
                    if let imageData = image.jpegData(compressionQuality: 0.9) {
                        savedURL = self.saveDataToSharedContainer(data: imageData)
                    }
                } else if let imageData = data as? Data {
                    savedURL = self.saveDataToSharedContainer(data: imageData)
                }
                
                DispatchQueue.main.async {
                    if let fileURL = savedURL {
                        self.openMainApp(with: fileURL)
                    } else {
                        self.completeAndReturn()
                    }
                }
            }
        } else {
            completeAndReturn()
        }
    }
    
    private func saveImageToSharedContainer(from sourceURL: URL) -> URL? {
        guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.picdo.app") else {
            return nil
        }
        
        let imagesDir = containerURL.appendingPathComponent("images")
        let fileName = "\(UUID().uuidString).\(sourceURL.pathExtension.isEmpty ? "jpg" : sourceURL.pathExtension)"
        let destinationURL = imagesDir.appendingPathComponent(fileName)
        
        do {
            try FileManager.default.createDirectory(at: imagesDir, withIntermediateDirectories: true, attributes: nil)
            if FileManager.default.fileExists(atPath: destinationURL.path) {
                try FileManager.default.removeItem(at: destinationURL)
            }
            try FileManager.default.copyItem(at: sourceURL, to: destinationURL)
            return destinationURL
        } catch {
            print("Error copying file: \(error)")
            return nil
        }
    }
    
    private func saveDataToSharedContainer(data: Data) -> URL? {
        guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.picdo.app") else {
            return nil
        }
        
        let imagesDir = containerURL.appendingPathComponent("images")
        let fileName = "\(UUID().uuidString).jpg"
        let fileURL = imagesDir.appendingPathComponent(fileName)
        
        do {
            try FileManager.default.createDirectory(at: imagesDir, withIntermediateDirectories: true, attributes: nil)
            try data.write(to: fileURL, options: .atomic)
            return fileURL
        } catch {
            print("Error saving data: \(error)")
            return nil
        }
    }
    
    private func openMainApp(with fileURL: URL) {
        // Save to UserDefaults for the app to pick up
        let sharedDefaults = UserDefaults(suiteName: "group.com.picdo.app")
        sharedDefaults?.set(fileURL.path, forKey: "pendingShareImage")
        sharedDefaults?.synchronize()
        
        // Create the deep link URL
        let urlString = "picdo://share?uri=\(fileURL.path.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
        
        // Open using the responder chain (this actually works!)
        openURL(URL(string: urlString)!)
        
        // Complete after a short delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.completeAndReturn()
        }
    }
    
    @objc private func openURL(_ url: URL) {
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                if #available(iOS 10.0, *) {
                    application.open(url, options: [:], completionHandler: nil)
                } else {
                    application.openURL(url)
                }
                break
            }
            responder = responder?.next
        }
    }
    
    private func completeAndReturn() {
        self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}