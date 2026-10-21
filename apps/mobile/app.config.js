module.exports = {
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.draftbitbuildservices.newapp",
    versionCode: 1
  },
  assetBundlePatterns: ["**/*"],
  experiments: { typedRoutes: true, tsconfigPaths: true },
  icon: "./assets/images/icon.png",
  ios: { supportsTablet: true, bundleIdentifier: "com.draftbit.newapp", buildNumber: "1" },
  name: "Lady J",
  orientation: "portrait",
  plugins: [
  [
  "expo-font",
  {
    fonts: [
    "./assets/fonts/CormorantGaramond.ttf",
    "./node_modules/@expo-google-fonts/playfair-display/500Medium/PlayfairDisplay_500Medium.ttf"]

  }],


  "expo-asset",
  "expo-video",
  "react-native-compressor",
  [
  "expo-image-picker",
  {
    photosPermission: "Choose photos and videos for private client galleries.",
    cameraPermission: "Capture photos and videos for private client galleries.",
    microphonePermission: "Record audio with appointment videos."
  }],


  "expo-web-browser",
  "expo-image",
  "expo-secure-store",

  [
  "expo-router",
  {


  }]],





  scheme: "lady-j",
  slug: "lady-j",
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  userInterfaceStyle: "automatic",
  version: "1.0.0",
  web: { bundler: "metro", output: "single", favicon: "./assets/images/favicon.png" },
  platforms: ["ios", "android", "web"]
};
