export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../shared/**/*.ts'],
  theme: {
    extend: {
      colors: {
        sakura: '#ff6b8a',
        yuzu: '#ffd166',
        sora: '#70d6ff',
        matcha: '#3bb273',
        sumi: '#243042'
      },
      boxShadow: {
        soft: '0 18px 50px rgba(36, 48, 66, 0.14)'
      }
    }
  },
  plugins: []
};
