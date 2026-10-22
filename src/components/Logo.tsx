import { Image } from 'react-native';

const SOURCES = {
  // Açık zemin: mavi "boostify" + turuncu "exam"
  color: require('../../assets/images/logo.png'),
  // Mavi zemin: beyaz "boostify" + turuncu "exam"
  white: require('../../assets/images/logo-white.png'),
};

// Kaynak görsel 1780 × 250
const ASPECT_RATIO = 1780 / 250;

interface LogoProps {
  variant?: keyof typeof SOURCES;
  height?: number;
}

// "boostifyexam" yazı logosu (kaynak: _calismalar/exam-logo*.png)
export default function Logo({ variant = 'color', height = 22 }: LogoProps) {
  return (
    <Image
      source={SOURCES[variant]}
      style={{ height, width: height * ASPECT_RATIO }}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="BoostifyExam"
    />
  );
}
