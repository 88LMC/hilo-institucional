import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#2B4FD6', color: '#fff' }}>
        <div style={{ fontSize: 104, fontWeight: 800, lineHeight: 1 }}>H</div>
        <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
          {[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ width: 14, height: 5, borderRadius: 3, background: '#fff' }} />)}
        </div>
      </div>
    ),
    size,
  );
}
