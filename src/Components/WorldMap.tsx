import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
} from 'react-native';

// ─────────────────────────────────────────────
//  Tile math helpers
// ─────────────────────────────────────────────

const TILE_SIZE = 256;

/** Longitude/Latitude → fractional tile XY (Web Mercator / XYZ) */
function lngLatToTile(lng: number, lat: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

/** Tile URL */
function tileUrl(z: number, x: number, y: number) {
  return `https://maps.ideniox.com/tile/${z}/${x}/${y}.png`;
}

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

interface TileKey { z: number; x: number; y: number }

interface TileMapViewProps {
  longitude: number;
  latitude: number;
  height: number;
  name?: string;
  initialZoom?: number;
  width?: number;
  attribution?: string;
}

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function WorldMap({
  longitude,
  latitude,
  height,
  name,
  initialZoom = 13,
  width = SCREEN_W,
  attribution = '© ideniox',
}: TileMapViewProps) {
  const [zoom, setZoom] = useState(Math.round(initialZoom));

  const zoomIn  = useCallback(() => setZoom(z => Math.min(z + 1, 18)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(z - 1, 1)),  []);

  // ── Compute which tiles are visible ──────────────────────────────────────
  // The center of the viewport is always fixed at (longitude, latitude).
  const { tiles, canvasLeft, canvasTop } = useMemo(() => {
    const center = lngLatToTile(longitude, latitude, zoom);

    // Pixel position of the center coordinate inside the global tile canvas
    const centerPx = center.x * TILE_SIZE;
    const centerPy = center.y * TILE_SIZE;

    // Where tile (0,0) must be placed so the center aligns with the viewport center
    const originLeft = width  / 2 - centerPx;
    const originTop  = height / 2 - centerPy;

    // Visible tile range (with 1-tile margin for pre-loading)
    const margin  = TILE_SIZE;
    const maxTile = Math.pow(2, zoom) - 1;

    const tileMinX = Math.max(0,       Math.floor((centerPx - width  / 2 - margin) / TILE_SIZE));
    const tileMaxX = Math.min(maxTile, Math.ceil ((centerPx + width  / 2 + margin) / TILE_SIZE));
    const tileMinY = Math.max(0,       Math.floor((centerPy - height / 2 - margin) / TILE_SIZE));
    const tileMaxY = Math.min(maxTile, Math.ceil ((centerPy + height / 2 + margin) / TILE_SIZE));

    const result: TileKey[] = [];
    for (let tx = tileMinX; tx <= tileMaxX; tx++)
      for (let ty = tileMinY; ty <= tileMaxY; ty++)
        result.push({ z: zoom, x: tx, y: ty });

    return { tiles: result, canvasLeft: originLeft, canvasTop: originTop };
  }, [longitude, latitude, zoom, width, height]);

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────
  return (
    <View style={[styles.container, { width, height }]}>

      {/* Tiles */}
      {tiles.map(({ z, x, y }) => (
        <Image
          key={`${z}/${x}/${y}`}
          source={{ uri: tileUrl(z, x, y) }}
          style={[styles.tile, {
            left:   canvasLeft + x * TILE_SIZE,
            top:    canvasTop  + y * TILE_SIZE,
            width:  TILE_SIZE,
            height: TILE_SIZE,
          }]}
          fadeDuration={150}
        />
      ))}

      {/* Marker — person icon + name, always fixed at the viewport center */}
      <View pointerEvents="none" style={styles.marker}>
        {/* Name label */}
        {name ? <Text style={styles.markerName}>{name}</Text> : null}
        {/* Person icon (SVG-like, drawn with Views) */}
        <View style={styles.personHead} />
        <View style={styles.personBody} />
        {/* Pin stem */}
        <View style={styles.pinStem} />
        <View style={styles.pinDot} />
      </View>

      {/* Zoom controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomBtn} onPress={zoomIn} activeOpacity={0.8}>
          <Text style={styles.zoomBtnText}>+</Text>
        </TouchableOpacity>
        <View style={styles.zoomDivider} />
        <TouchableOpacity style={styles.zoomBtn} onPress={zoomOut} activeOpacity={0.8}>
          <Text style={styles.zoomBtnText}>−</Text>
        </TouchableOpacity>
      </View>

      {/* Attribution */}
      <View style={styles.attribution}>
        <Text style={styles.attributionText}>{attribution}</Text>
      </View>

    </View>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const CTRL = 44;

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#d4cfc9',
  },
  tile: {
    position: 'absolute',
    resizeMode: 'cover',
  },

  // Marker fijo en el centro del viewport
  marker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    alignItems: 'center',
    // Pin dot sits at the exact center; offset so the dot tip is at center
    marginLeft: -20,
    marginTop: -54,
  },
  markerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(30,30,30,0.75)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 4,
    textAlign: 'center',
  },
  // Head
  personHead: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e53935',
    borderWidth: 2,
    borderColor: '#fff',
  },
  // Body (shoulders)
  personBody: {
    width: 24,
    height: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#e53935',
    borderWidth: 2,
    borderColor: '#fff',
    borderBottomWidth: 0,
    marginTop: 2,
  },
  // Stem line
  pinStem: {
    width: 2,
    height: 10,
    backgroundColor: '#e53935',
  },
  // Tip dot
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e53935',
    borderWidth: 1,
    borderColor: '#fff',
  },

  // Zoom
  zoomControls: {
    position: 'absolute',
    right: 16,
    top: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  zoomBtn: {
    width: CTRL,
    height: CTRL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    fontSize: 22,
    fontWeight: '300',
    color: '#333',
    lineHeight: 26,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },

  // Attribution
  attribution: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  attributionText: {
    fontSize: 10,
    color: '#444',
  },
});