module.exports = {
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.draftbitbuildservices.newapp"
  },
  assetBundlePatterns: ["**/*"],
  experiments: { typedRoutes: true, tsconfigPaths: true },
  icon: "./assets/images/icon.png",
  ios: { supportsTablet: true },
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
