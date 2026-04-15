docker run --rm -it \
  -v $PWD:/app \
  -v ~/.gradle:/root/.gradle \
  -v /app/node_modules \
  -w /app \
  reactnativecommunity/react-native-android \
  bash -c "
    npm ci &&
    npx expo prebuild --platform android --non-interactive &&
    cd android &&
    ./gradlew assembleRelease
  "