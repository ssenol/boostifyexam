import { useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { theme } from '../theme';

const { colors } = theme;

interface HtmlBlockProps {
  html: string;
}

// İçeriğin yüksekliğini React Native'e bildirir; WebView kendi içinde kaydırılmaz, sayfayla birlikte kayar
const HEIGHT_SCRIPT = `
  (function () {
    function send() { window.ReactNativeWebView.postMessage(String(document.documentElement.scrollHeight)); }
    new ResizeObserver(send).observe(document.body);
    send();
  })();
  true;
`;

// Sunucudan gelen HTML parçası (ör. sınav yönergesi). Yazı tipi ve renkler temaya yakın tutulur.
// Linkler uygulamanın içinde açılmaz, tarayıcıya yönlendirilir.
export default function HtmlBlock({ html }: HtmlBlockProps) {
  const [height, setHeight] = useState(1);

  const document = useMemo(
    () => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body { font-family: -apple-system, system-ui, Roboto, sans-serif; font-size: 16px; line-height: 1.5;
         color: ${colors.text}; overflow-wrap: break-word; }
  p, ul, ol { margin: 0 0 12px; }
  body > :last-child { margin-bottom: 0; }
  img { max-width: 100%; height: auto; }
  a { color: ${colors.accent}; }
</style></head><body>${html}</body></html>`,
    [html],
  );

  const onMessage = (event: WebViewMessageEvent) => {
    const next = Number(event.nativeEvent.data);
    if (next > 0) setHeight(next);
  };

  return (
    <View style={[styles.box, { height }]}>
      <WebView
        source={{ html: document }}
        originWhitelist={['*']}
        injectedJavaScript={HEIGHT_SCRIPT}
        onMessage={onMessage}
        scrollEnabled={false}
        style={styles.webView}
        onShouldStartLoadWithRequest={(request) => {
          // İlk yükleme (about:blank) dışındaki her gezinme tarayıcıda açılır
          if (request.url.startsWith('http') && request.isTopFrame !== false) {
            Linking.openURL(request.url).catch(() => {});
            return false;
          }
          return true;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
  },
  webView: {
    backgroundColor: 'transparent',
  },
});
