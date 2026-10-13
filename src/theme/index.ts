// Tasarım token'ları: prototipin "Modernist" design system'inden (_calismalar/prototip/design-system.css)
// ve sayfadaki accent/warn override'larından alındı. Köşe yarıçapı tasarımda bilerek 0.

export const colors = {
  bg: '#f3f2f2',
  surface: '#eae9e9',
  text: '#201e1d',
  // color-mix(#201e1d %40) karşılığı
  divider: 'rgba(32, 30, 29, 0.4)',
  // .field > label: text %70
  label: 'rgba(32, 30, 29, 0.7)',

  accent: '#3f51f0',
  accent100: '#f0f1ff',
  accent200: '#e0e3ff',
  accent300: '#c5cbff',
  accent400: '#9ca5ff',
  accent500: '#6d7afb',
  accent600: '#3444e0',
  accent700: '#2633bd',
  accent800: '#1e288e',
  accent900: '#1a2060',

  warn: '#e8590c',
  warn100: '#fff1e8',
  warn700: '#b83d00',

  // CEFR merdiveninde vurgulanan seviye
  success: '#7cc242',

  neutral100: '#f8f4f4',
  neutral200: '#eae7e7',
  neutral300: '#d7d3d3',
  neutral400: '#bab6b6',
  neutral500: '#9b9797',
  neutral600: '#7d7979',
  neutral700: '#605d5d',
  neutral800: '#444141',
  neutral900: '#2d2b2b',

  // Logo karesindeki dört renk
  brand: ['#7cc242', '#f2622e', '#ec3f8c', '#3f51f0'],
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

export const theme = {
  colors,
  fonts,
  space,
  layout: {
    // Telefon / tablet yatay iç boşluk (prototipte padX)
    padX: 20,
    padXTablet: 40,
    // Android tablette alttaki sistem dock'u için ek boşluk
    androidTabletDockOffset: 16,
  },
} as const;

export type Theme = typeof theme;
