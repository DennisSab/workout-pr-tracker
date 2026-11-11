type SessionWithOptionalUser = {
  user?: {
    id?: string;
  };
} | null;

export function userIdFromSession(session: SessionWithOptionalUser) {
  return session?.user?.id ?? null;
}
