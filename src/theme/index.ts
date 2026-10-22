// Tasarım token'ları: prototipin "Modernist" design system'inden (_calismalar/prototip/design-system.css)
// ve sayfadaki accent/warn override'larından alındı. Köşe yarıçapı tasarımda bilerek 0.
// Marka renkleri prototipten farklı (kullanıcı kararı, 2026-10-22): mavi #303FE0, turuncu #F05A25 (logo ve splash ile
// aynı). Tintler prototipten korundu; ton (hue) aynı olduğu için yeni tabanla uyumlu.

export const colors = {
  bg: '#f3f2f2',
  surface: '#eae9e9',
  text: '#201e1d',
  // color-mix(#201e1d %40) karşılığı
  divider: 'rgba(32, 30, 29, 0.4)',
  // .field > label: text %70
  label: 'rgba(32, 30, 29, 0.7)',

  accent: '#303fe0',
  accent100: '#f0f1ff',
  accent200: '#e0e3ff',
  accent300: '#c5cbff',
  accent400: '#9ca5ff',
  accent500: '#6d7afb',
  accent600: '#3444e0',
  accent700: '#2633bd',
  accent800: '#1e288e',
  accent900: '#1a2060',

  // Marka turuncusu: birincil düğme ve uyarılar
  primary: '#f05a25',
  primaryPressed: '#cc4c1f',

  warn: '#f05a25',
  warn100: '#fff1e8',
  warn700: '#b83d00',

  // CEFR merdiveninde vurgulanan seviye
  success: '#7cc242',
  // Bağlantı durumu noktası ("Connected · every answer saved instantly")
  online: '#2f9e5b',
  // Dialog arka planı: neutral900 %55
  backdrop: 'rgba(45, 43, 43, 0.55)',

  neutral100: '#f8f4f4',
  neutral200: '#eae7e7',
  neutral300: '#d7d3d3',
  neutral400: '#bab6b6',
  neutral500: '#9b9797',
  neutral600: '#7d7979',
  neutral700: '#605d5d',
  neutral800: '#444141',
  neutral900: '#2d2b2b',
} as const;

export const fonts = {
  regular: 'Archivo_400Regular',
  semiBold: 'Archivo_600SemiBold',
  extraBold: 'Archivo_800ExtraBold',
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
} as const;

// Prototipte sık tekrarlanan metin stilleri. kicker stilleri büyük harfe çevirmez: <Kicker> kullanın (bkz. Kicker.tsx)
export const typography = {
  // Küçük, büyük harfli üst başlık ("TIME LEFT", "CLOSES")
  kicker: {
    fontFamily: fonts.regular,
    fontSize: 11,
    letterSpacing: 1.1,
    color: colors.neutral700,
  },
  // Vurgulu üst başlık ("PROGRESS TEST · 3 OF 4")
  kickerAccent: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: colors.accent700,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  muted: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.neutral700,
  },
} as const;

export const theme = {
  colors,
  fonts,
  space,
  typography,
  layout: {
    // Telefon / tablet yatay iç boşluk (prototipte padX)
    padX: 20,
    padXTablet: 40,
    // Android tablette alttaki sistem çubuğu için ek boşluk (Galaxy Tab A9+'ta butonlar çubuğa çok yakın duruyordu)
    androidTabletDockOffset: 14,
  },
} as const;

