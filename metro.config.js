const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Kökteki ios/ ve android/ (prebuild çıktısı) izlenmez: Xcode ve Dropbox buradaki dosyalara
// sürekli dokunuyor, Metro da her seferinde "Refreshing..." ile HMR güncellemesi gönderiyor.
// .expo/ da izlenmez: Expo CLI uygulamanın log'larını .expo/dev/logs/start.log'a yazıyor;
// izlenirse her uyarı yeni bir "Refreshing..." ve aynı uyarıyı tekrar tetikleyen bir döngü yaratıyor.
const escape = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nativeDirs = ['ios', 'android', '.expo'].map(
  (dir) => new RegExp(`^${escape(path.join(__dirname, dir))}[\\\\/].*`),
);

config.resolver.blockList = [...[].concat(config.resolver.blockList ?? []), ...nativeDirs];

module.exports = config;
