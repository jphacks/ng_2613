export type AuthResult = {
  user: unknown | null;
  session: unknown | null;
};

export function hasAuthenticatedSession(result: AuthResult) {
  return result.user !== null && result.session !== null;
}

export function getPostAuthScreen(profile: { complete: boolean }) {
  return profile.complete ? "home" as const : "profile" as const;
}
