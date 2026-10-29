const development = process.env.EXPO_PUBLIC_CURRENT_ENV === "DEVELOPMENT";
const devOwnerEmail = process.env.EXPO_PUBLIC_DEV_OWNER_EMAIL;
const devOwnerPassword = process.env.EXPO_PUBLIC_DEV_OWNER_PASSWORD;

/**
 * Development Test Owner: a separate account that exists only in the Development Supabase
 * project, granted owner access there through lj_test_owner_access. Its credentials are
 * DEVELOPMENT-only variables, so Staging/Production builds never contain them.
 */
export const devOwnerAutoSignIn = development && !!devOwnerEmail && !!devOwnerPassword;
export const isDevOwnerEmail = (email?: string | null) =>
  devOwnerAutoSignIn && !!email && email.toLowerCase() === devOwnerEmail!.toLowerCase();
export const devOwnerCredentials = () =>
  devOwnerAutoSignIn ? { email: devOwnerEmail!, password: devOwnerPassword! } : null;

// The simulated client/owner preview is superseded by the real Development Test Owner session.
export const developmentTestMode =
  development && process.env.EXPO_PUBLIC_DEVELOPMENT_TEST_MODE === "true" && !devOwnerAutoSignIn;
