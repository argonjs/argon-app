#
# Be sure to run `pod lib lint Vuforia.podspec' to ensure this is a
# valid spec before submitting.
#
# Any lines starting with a # are optional, but their use is encouraged
# To learn more about a Podspec see http://guides.cocoapods.org/syntax/podspec.html
#

Pod::Spec.new do |s|
  s.name             = "Vuforia"
  s.version          = "5.5.9"
  s.summary          = "An Obj-C wrapper for the VuforiaSDK"

# This description is used to generate tags and improve search results.
#   * Think: What does it do? Why did you write it? What is the focus?
#   * Try to keep it short, snappy and to the point.
#   * Write the description between the DESC delimiters below.
#   * Finally, don't worry about the indent, CocoaPods strips it!  
  s.description      = <<-DESC
                          A simple Obj-C wrapper for the VuforiaSDK
                       DESC
  
  s.authors = { 'Gheric Speiginer' => 'gheric@gatech.edu' }
  s.homepage         = "https://github.com/<GITHUB_USERNAME>/Vuforia"
  s.source           = { :path => "." }

  s.platform     = :ios, '8.0'
  s.requires_arc = true

  s.source_files = 'Source/**/*', 'SDK/include/**/*'
  s.header_dir = 'Vuforia'
  
  s.vendored_libraries = 'SDK/lib/arm/libVuforia.a'
  
  other_frameworks =  [
    'AVFoundation',
    'CoreMotion',
    'CoreMedia',
    'CoreVideo',
    'SystemConfiguration',
    'Security',
    'QuartzCore',
    'OpenGLES'
  ]
    
  other_ldflags = '$(inherited) -framework ' + other_frameworks.join(' -framework ')
  
  s.xcconfig  =  { 
    'ENABLE_BITCODE[sdk=iphoneos*]' => 'NO',
    'OTHER_LDFLAGS[sdk=iphoneos*]' => other_ldflags             
  }

end
