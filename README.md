*Basic React Native App that uses the location of the phone and display it on a map.*

ABOUT
---

The only purpose of the repo is to understand the basic usage of react native.

It uses my own copy of the Open Street Maps to obtain map tiles:

[Open Streep Maps](https://maps.ideniox.com)

FEATURES
---

- Full screen map with your live position (accuracy circle), drag, pinch and double tap to zoom.
- Place search bar, results sorted by proximity.
- Walking directions: dotted route on the map, time, distance, arrival time and step by step instructions in Spanish.

SERVERS
---

All endpoints live in `src/config.ts`:

| What | Default | API |
|---|---|---|
| Tiles | `maps.ideniox.com/tile/{z}/{x}/{y}.png` | XYZ raster |
| Search | `photon.komoot.io` | [Photon](https://github.com/komoot/photon) |
| Walking routes | `routing.openstreetmap.de/routed-foot` | [OSRM](https://project-osrm.org) `foot` profile |

Search and routing use free public instances (fair use only). To run everything on your own server,
host Photon and OSRM (`osrm-backend` with `profiles/foot.lua`) and change the two URLs.

USAGE
---

```
nvm use 24
npm install
npm run start
```

To connect, install `Expo Go` on Android Store, then scan the code, then you can start debugging your app.

Alternatively you can use `make build` and install the generated apk manually.
