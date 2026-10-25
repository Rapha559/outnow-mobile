import ExpoModulesCore
import PassKit

private final class AppleWalletPassesDelegate: NSObject, PKAddPassesViewControllerDelegate {
  private let didFinish: () -> Void

  init(didFinish: @escaping () -> Void) {
    self.didFinish = didFinish
    super.init()
  }

  func addPassesViewControllerDidFinish(_ controller: PKAddPassesViewController) {
    controller.dismiss(animated: true, completion: didFinish)
  }
}

public final class AppleWalletModule: Module {
  private weak var addPassesController: PKAddPassesViewController?
  private var addPassesDelegate: AppleWalletPassesDelegate?

  public func definition() -> ModuleDefinition {
    Name("AppleWallet")

    AsyncFunction("presentPassAsync") { [weak self] (passURL: String, promise: Promise) in
      guard let self else {
        promise.reject(
          "E_APPLE_WALLET_UNAVAILABLE",
          "Apple Wallet is unavailable."
        )
        return
      }

      guard self.addPassesController == nil else {
        promise.reject(
          "E_APPLE_WALLET_IN_PROGRESS",
          "Apple Wallet is already open."
        )
        return
      }

      guard
        let url = URL(string: passURL),
        url.scheme?.lowercased() == "https"
      else {
        promise.reject(
          "E_APPLE_WALLET_URL",
          "The Apple Wallet pass URL is invalid."
        )
        return
      }

      URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
        DispatchQueue.main.async {
          guard let self else {
            promise.reject(
              "E_APPLE_WALLET_UNAVAILABLE",
              "Apple Wallet is unavailable."
            )
            return
          }

          guard error == nil, let data else {
            promise.reject(
              "E_APPLE_WALLET_DOWNLOAD",
              "Unable to download the Apple Wallet pass."
            )
            return
          }

          guard
            let httpResponse = response as? HTTPURLResponse,
            (200...299).contains(httpResponse.statusCode)
          else {
            promise.reject(
              "E_APPLE_WALLET_DOWNLOAD",
              "Unable to download the Apple Wallet pass."
            )
            return
          }

          do {
            let pass = try PKPass(data: data)

            guard PKAddPassesViewController.canAddPasses() else {
              promise.reject(
                "E_APPLE_WALLET_ADD",
                "Apple Wallet passes cannot be added on this device."
              )
              return
            }

            guard
              let viewController = self.appContext?.utilities?.currentViewController(),
              let controller = PKAddPassesViewController(pass: pass)
            else {
              promise.reject(
                "E_APPLE_WALLET_PRESENT",
                "Unable to open Apple Wallet."
              )
              return
            }

            let delegate = AppleWalletPassesDelegate { [weak self] in
              self?.addPassesController = nil
              self?.addPassesDelegate = nil
            }

            controller.delegate = delegate
            self.addPassesController = controller
            self.addPassesDelegate = delegate

            viewController.present(controller, animated: true) {
              promise.resolve()
            }
          } catch {
            promise.reject(
              "E_APPLE_WALLET_PASS",
              "The downloaded Apple Wallet pass is invalid."
            )
          }
        }
      }.resume()
    }
    .runOnQueue(.main)
  }
}