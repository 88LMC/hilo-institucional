import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#2B4FD6', color: '#fff' }}>
        <div style={{ fontSize: 300, fontWeight: 800, lineHeight: 1 }}>H</div>
        <div style={{ display: 'flex', gap: 18, marginTop: 24 }}>
          {[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ width: 40, height: 14, borderRadius: 7, background: '#fff' }} />)}
        </div>
      </div>
    ),
    size,
  );
}
