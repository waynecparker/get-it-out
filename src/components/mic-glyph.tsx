import { View } from 'react-native';

interface MicGlyphProps {
  mode: 'idle' | 'recording' | 'paused';
  color: string;
  size?: number;
}

export function MicGlyph({ mode, color, size = 32 }: MicGlyphProps) {
  if (mode === 'recording') {
    return (
      <View
        style={{
          width: size * 0.68,
          height: size * 0.68,
          borderRadius: size * 0.14,
          backgroundColor: color,
        }}
      />
    );
  }

  if (mode === 'paused') {
    return (
      <View style={{ flexDirection: 'row', gap: size * 0.18 }}>
        <View style={{ width: size * 0.18, height: size * 0.68, borderRadius: 3, backgroundColor: color }} />
        <View style={{ width: size * 0.18, height: size * 0.68, borderRadius: 3, backgroundColor: color }} />
      </View>
    );
  }

  const headWidth = size * 0.42;
  const headHeight = size * 0.68;

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: headWidth,
          height: headHeight,
          borderRadius: headWidth / 2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          marginTop: 4,
          width: headWidth + 14,
          height: (headWidth + 14) / 2,
          borderColor: color,
          borderWidth: 3,
          borderTopWidth: 0,
          borderBottomLeftRadius: (headWidth + 14) / 2,
          borderBottomRightRadius: (headWidth + 14) / 2,
        }}
      />
      <View style={{ marginTop: 3, width: 3, height: 8, backgroundColor: color }} />
      <View style={{ marginTop: 1, width: headWidth, height: 3, borderRadius: 2, backgroundColor: color }} />
    </View>
  );
}
