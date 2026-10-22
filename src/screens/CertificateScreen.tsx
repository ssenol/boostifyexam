import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Button from '../components/Button';
import Kicker from '../components/Kicker';
import ScreenHeader from '../components/ScreenHeader';
import StateView from '../components/StateView';
import Toast, { useToast } from '../components/Toast';
import useAsyncData from '../hooks/useAsyncData';
import useBottomSpacing from '../hooks/useBottomSpacing';
import useResponsive from '../hooks/useResponsive';
import examService from '../services/exam';
import { theme } from '../theme';
import type { Certificate } from '../types/exam';

const { colors, fonts, typography } = theme;

// A4 yatay, punto (72 PPI): sertifikanın PDF sayfası
const PDF_WIDTH = 842;
const PDF_HEIGHT = 595;

// Sayfa 1123 × 794 tasarlanmış: görünüm genişliğini sayfa genişliğine sabitleyince WebView sayfayı ekrana sığdırır
function fitToWidth(certificate: Certificate): string {
  const viewport = `<meta name="viewport" content="width=${certificate.page.width}">`;
  const html = certificate.html.replace(/<meta[^>]+name=["']viewport["'][^>]*>/i, '');
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (head) => `${head}${viewport}`) : `${viewport}${html}`;
}

interface CertificateScreenProps {
  sessionId: string;
}

// Sertifika: sunucunun HTML'i (webdekinin birebir aynısı, resmî belge) WebView'da; PDF olarak paylaşılır
export default function CertificateScreen({ sessionId }: CertificateScreenProps) {
  const bottom = useBottomSpacing();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => createStyles(isTablet), [isTablet]);
  const toast = useToast();
  const [sharing, setSharing] = useState(false);

  const load = useCallback(() => examService.getCertificate(sessionId), [sessionId]);
  const { data: certificate, loading, error, reload } = useAsyncData(load);
  const html = useMemo(() => (certificate ? fitToWidth(certificate) : ''), [certificate]);

  const header = <ScreenHeader backLabel="Report" onBack={() => router.back()} />;

  if (!certificate) {
    return (
      <View style={styles.root}>
        {header}
        <StateView loading={loading} error={error} onRetry={reload} />
      </View>
    );
  }

  const share = async () => {
    setSharing(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: certificate.html, width: PDF_WIDTH, height: PDF_HEIGHT });
      // Paylaşılan dosya sunucunun verdiği adla gider ("Certificate-…-C1.pdf")
      const target = new File(Paths.cache, certificate.fileName);
      if (target.exists) target.delete();
      await new File(uri).move(target);
      await Sharing.shareAsync(target.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: certificate.fileName,
      });
    } catch {
      toast.show('The PDF could not be created. Try again.');
    } finally {
      setSharing(false);
    }
  };

  const { page, model } = certificate;

  return (
    <View style={styles.root}>
      {header}
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottom(24) + 16 }]}>
        <View style={styles.inner}>
          <View style={styles.heading}>
            <Kicker accent>{model.title}</Kicker>
            <Text style={styles.title}>{`${model.level} · ${model.levelName}`}</Text>
          </View>

          <View style={[styles.frame, { aspectRatio: page.width / page.height }]}>
            <WebView
              source={{ html }}
              originWhitelist={['*']}
              scrollEnabled={false}
              style={styles.webView}
              // Sayfadaki bağlantılar uygulamanın içinde açılmasın
              onShouldStartLoadWithRequest={(request) => !request.url.startsWith('http')}
            />
          </View>
          {!isTablet && <Text style={typography.muted}>Share it as a PDF to see it in full size.</Text>}

          <Button label="Share as PDF" trailing onPress={share} loading={sharing} style={styles.shareButton} />
        </View>
      </ScrollView>
      <Toast message={toast.message} bottom={bottom(12) + 16} padX={isTablet ? theme.layout.padXTablet : theme.layout.padX} />
    </View>
  );
}

const createStyles = (isTablet: boolean) => {
  const padX = isTablet ? theme.layout.padXTablet : theme.layout.padX;
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: padX,
      paddingTop: 24,
    },
    inner: {
      maxWidth: 1040,
      gap: 16,
    },
    heading: {
      gap: 6,
    },
    title: {
      fontFamily: fonts.extraBold,
      fontSize: 28,
      lineHeight: 32,
      color: colors.text,
    },
    frame: {
      width: '100%',
      borderWidth: 1,
      borderColor: colors.divider,
      backgroundColor: '#ffffff',
    },
    webView: {
      backgroundColor: 'transparent',
    },
    shareButton: {
      maxWidth: isTablet ? 320 : undefined,
    },
  });
};
