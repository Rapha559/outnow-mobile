Pod::Spec.new do |s|
  s.name = 'AppleWallet'
  s.version = '1.0.0'
  s.summary = 'Presents Apple Wallet passes from OutNow.'
  s.description = 'A local Expo module that presents Apple Wallet passes without opening Safari.'
  s.homepage = 'https://outnowtickets.com'
  s.license = { type: 'MIT' }
  s.author = { 'OutNow' => 'support@outnowtickets.com' }
  s.platforms = { ios: '15.1' }
  s.swift_version = '5.9'
  s.source = { git: 'https://github.com/Rapha559/outnow-mobile.git' }
  s.static_framework = true
  s.source_files = '**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
end
