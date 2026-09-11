export default function manifest() {
  return {
    name: 'Hilo',
    short_name: 'Hilo',
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F8FB',
    theme_color: '#F7F8FB',
    icons: [{ src: '/icon', sizes: '512x512', type: 'image/png' }],
  };
}
