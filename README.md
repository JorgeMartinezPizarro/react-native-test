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

| What | Endpoint | API |
|---|---|---|
| Tiles | `maps.ideniox.com/tile/{z}/{x}/{y}.png` | XYZ raster |
| Search | `maps.ideniox.com/photon/api` | [Photon](https://github.com/komoot/photon) |
| Walking routes | `maps.ideniox.com/osrm/route/v1/foot` | [OSRM](https://project-osrm.org) `foot` profile |

Everything runs on the own server: stack `maps` of the ideniox repo (`make load-maps load-maps-services start-maps`).
Public instances with the same APIs, for testing without it: `photon.komoot.io/api/` and
`routing.openstreetmap.de/routed-foot/route/v1/foot` (fair use only).

USAGE
---

```
nvm use 24
npm install
npm run start
```

To connect, install `Expo Go` on Android Store, then scan the code, then you can start debugging your app.

Alternatively you can use `make build` and install the generated apk manually.
