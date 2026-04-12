docker run --rm -it \
  -v $PWD:/app \
  -w /app \
  reactnativecommunity/react-native-android \
  bash -c "
    npm install &&
    cd android &&
    chmod +x gradlew &&
    ./gradlew assembleRelease
  "