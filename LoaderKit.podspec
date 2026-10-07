require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'apple', 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'LoaderKit'
  s.version      = package['version']
  s.summary      = 'Loading indicators described as data, rendered natively with Core Animation.'
  s.description  = <<-DESC
    LoaderKit draws loading indicators from JSON specs. Each spec lists elements laid out in a
    unit box and keyframe tracks for their properties; the Apple engine turns them into Core
    Animation layers and animations. Includes UIKit, AppKit and SwiftUI views and a set of
    built-in indicators.
  DESC
  s.homepage     = 'https://github.com/maitrungduc1410/loader-kit'
  s.license      = { :type => 'MIT' }
  s.author       = 'Mai Trung Duc'
  s.source       = { :git => 'https://github.com/maitrungduc1410/loader-kit.git', :tag => s.version.to_s }

  s.ios.deployment_target = '15.0'
  s.osx.deployment_target = '12.0'
  s.swift_version = '5.9'

  s.source_files = 'apple/Sources/LoaderKitCore/**/*.swift', 'apple/Sources/LoaderKit/**/*.swift'
  s.frameworks   = 'QuartzCore'
end
