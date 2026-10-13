// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // eslint-config-expo 56 ile gelen React Compiler kuralları (react-hooks v7).
    // Mevcut kodda useRef(new Animated.Value()).current gibi yaygın kalıpları işaretliyorlar,
    // çalışma anı hatası değiller. Kod kademeli düzeltilene kadar uyarı seviyesinde tutuluyor.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
]);
