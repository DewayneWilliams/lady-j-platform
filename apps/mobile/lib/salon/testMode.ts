export const developmentTestMode =
  process.env.EXPO_PUBLIC_CURRENT_ENV === "DEVELOPMENT" &&
  process.env.EXPO_PUBLIC_DEVELOPMENT_TEST_MODE === "true";
