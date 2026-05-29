import { Image, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { API_BASE_URL } from '@/api/config';

type VWorldNativeMapProps = ViewProps & {
  latitude: number;
  longitude: number;
  zoom: number;
};

type Tile = {
  key: string;
  left: `${number}%`;
  top: `${number}%`;
  url: string;
};

const TILE_SIZE_PERCENT = 44;

export function VWorldNativeMap({ latitude, longitude, zoom, style }: VWorldNativeMapProps) {
  const tiles = createTiles(latitude, longitude, zoom);

  return (
    <View style={[styles.map, style]}>
      <View style={styles.seaBase} />
      {tiles.map((tile) => (
        <Image key={tile.key} source={{ uri: tile.url }} style={[styles.tile, { left: tile.left, top: tile.top }]} />
      ))}
      <View pointerEvents="none" style={styles.layerWash} />
      <View pointerEvents="none" style={styles.labelBox}>
        <Text style={styles.labelText}>VWorld 2D</Text>
      </View>
    </View>
  );
}

function createTiles(latitude: number, longitude: number, zoom: number): Tile[] {
  const z = Math.min(13, Math.max(5, Math.round(zoom)));
  const scale = 2 ** z;
  const centerX = longitudeToTile(longitude, z);
  const centerY = latitudeToTile(latitude, z);
  const baseX = Math.floor(centerX);
  const baseY = Math.floor(centerY);
  const offsetX = centerX - baseX;
  const offsetY = centerY - baseY;
  const tiles: Tile[] = [];

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const x = wrapTile(baseX + dx, scale);
      const y = Math.min(scale - 1, Math.max(0, baseY + dy));
      const left = 50 + (dx - offsetX) * TILE_SIZE_PERCENT - TILE_SIZE_PERCENT / 2;
      const top = 50 + (dy - offsetY) * TILE_SIZE_PERCENT - TILE_SIZE_PERCENT / 2;

      tiles.push({
        key: `${z}-${x}-${y}`,
        left: `${left}%`,
        top: `${top}%`,
        url: `${API_BASE_URL}/islands/base-tile?z=${z}&x=${x}&y=${y}`
      });
    }
  }

  return tiles;
}

function longitudeToTile(longitude: number, zoom: number) {
  return ((longitude + 180) / 360) * 2 ** zoom;
}

function latitudeToTile(latitude: number, zoom: number) {
  const radians = (latitude * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * 2 ** zoom;
}

function wrapTile(value: number, scale: number) {
  return ((value % scale) + scale) % scale;
}

const styles = StyleSheet.create({
  map: {
    backgroundColor: '#b9e9ff',
    overflow: 'hidden',
    position: 'relative'
  },
  seaBase: {
    backgroundColor: '#c6efff',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  },
  tile: {
    height: `${TILE_SIZE_PERCENT}%`,
    position: 'absolute',
    width: `${TILE_SIZE_PERCENT}%`
  },
  layerWash: {
    backgroundColor: 'rgba(218, 246, 255, 0.12)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  },
  labelBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: 999,
    bottom: 10,
    left: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    position: 'absolute'
  },
  labelText: {
    color: '#1769e0',
    fontSize: 10,
    fontWeight: '900'
  }
});
