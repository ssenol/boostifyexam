// Xcode 27, IPHONEOS_DEPLOYMENT_TARGET < 15.0 olan pod target'larını hata olarak reddediyor.
// react-native-svg (12.4) ve async-storage (13.4) resource bundle target'ları buna takılıyor.
// Podfile CNG ile her prebuild'de yeniden üretildiği için düzeltmeyi config plugin olarak
// post_install bloğuna ekliyoruz: uygulamanın deployment target'ının altındaki her pod yükseltilir.

const { withPodfile } = require('expo/config-plugins');

const MARKER = '# withPodsDeploymentTarget';

const snippet = (fallback) => `
    ${MARKER}
    app_target = (podfile_properties['ios.deploymentTarget'] || '${fallback}')
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < Gem::Version.new(app_target)
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = app_target
        end
      end
    end`;

module.exports = function withPodsDeploymentTarget(config) {
  return withPodfile(config, (cfg) => {
    const podfile = cfg.modResults.contents;
    if (podfile.includes(MARKER)) return cfg;

    const anchor = /(react_native_post_install\([\s\S]*?\n\s*\))/;
    if (!anchor.test(podfile)) {
      throw new Error('withPodsDeploymentTarget: Podfile içinde react_native_post_install bulunamadı');
    }
    // Yedek hedef, Expo'nun Podfile'daki `platform :ios` varsayılanından okunur (SDK'ya göre değişir).
    const platform = podfile.match(/platform :ios,.*\|\|\s*'([\d.]+)'/);
    if (!platform) {
      throw new Error('withPodsDeploymentTarget: Podfile içinde platform :ios satırı bulunamadı');
    }
    cfg.modResults.contents = podfile.replace(anchor, `$1\n${snippet(platform[1])}`);
    return cfg;
  });
};
