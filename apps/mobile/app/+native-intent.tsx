import * as Application from "expo-application";

const DRAFTBIT_APPS_IDS = ["com.draftbit.mobile", "com.draftbit.livepreview"];

const isInDraftbitApp = DRAFTBIT_APPS_IDS.some((id) => Application.applicationId === id);

export function redirectSystemPath({
  path,
  initial,
}: {
  initial: boolean;
  path: string;
}): string | null {
  if (initial && isInDraftbitApp) {
    // OAuth callbacks are intentionally allowed through. The previous blanket
    // suppression discarded a valid cold-start callback in Draftbit Preview.
    if (/auth\/callback(?:[/?#]|$)/i.test(path)) {
      const queryIndex = path.indexOf("?");
      const hashIndex = path.indexOf("#");
      const suffixIndex = [queryIndex, hashIndex]
        .filter((index) => index >= 0)
        .sort((a, b) => a - b)[0];
      return "/auth/callback" + (suffixIndex === undefined ? "" : path.slice(suffixIndex));
    }
    // Ignore launch deep links when previewing through draftbit preview apps
    // Prevents user app from intercepting launch url/path of the draftbit app
    return null;
  }
  return path;
}
