import ExpoModulesCore
import PassKit

public final class AppleWalletModule: Module, PKAddPassesViewControllerDelegate {
  private weak var addPassesController: PKAddPassesViewController?

  public func definition() -> ModuleDefinition {
    Name("AppleWallet")

    AsyncFunction("presentPassAsync") { [weak self] (passURL: String, promise: Promise) in
      guard let self else {
        promise.reject("E_APPLE_WALLET_UNAVAILABLE", "Apple Wallet is unavailable.")
        return
      }

      guard self.addPassesController == nil else {
        promise.reject("E_APPLE_WALLET_IN_PROGRESS", "Apple Wallet is already open.")
        return
      }

      guard let url = URL(string: passURL), url.scheme == "https" else {
        promise.reject("E_APPLE_WALLET_URL", "The Apple Wallet pass URL is invalid.")
        return
      }

      URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
        DispatchQueue.main.async {
          guard let self else {
            promise.reject("E_APPLE_WALLET_UNAVAILABLE", "Apple Wallet is unavailable.")
            return
          }

          guard error == nil, let data else {
            promise.reject("E_APPLE_WALLET_DOWNLOAD", "Unable to download the Apple Wallet pass.")
            return
          }

          guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            promise.reject("E_APPLE_WALLET_DOWNLOAD", "Unable to download the Apple Wallet pass.")
            return
          }

          do {
            let pass = try PKPass(data: data)

            guard PKAddPassesViewController.canAddPasses([pass]) else {
              promise.reject("E_APPLE_WALLET_ADD", "This pass is already in Apple Wallet or cannot be added on this device.")
              return
            }

            guard let viewController = self.appContext?.utilities?.currentViewController(), let controller = PKAddPassesViewController(pass: pass) else {
              promise.reject("E_APPLE_WALLET_PRESENT", "Unable to open Apple Wallet.")
              return
            }

            controller.delegate = self
            self.addPassesController = controller
            viewController.present(controller, animated: true) {
              promise.resolve()
            }
          } catch {
            promise.reject("E_APPLE_WALLET_PASS", "The downloaded Apple Wallet pass is invalid.")
          }
        }
      }.resume()
    }
    .runOnQueue(.main)
  }

  public func addPassesViewControllerDidFinish(_ controller: PKAddPassesViewController) {
    controller.dismiss(animated: true) { [weak self] in
      self?.addPassesController = nil
    }
  }
}
