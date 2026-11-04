import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { userIdFromSession } from "@/lib/session-user";

type SessionResolver = typeof auth;

export async function getAuthenticatedUserId(
  resolveSession: SessionResolver = auth
) {
  const session = await resolveSession();
  return userIdFromSession(session);
}

export async function requirePageUserId() {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect("/login");
  return userId;
}
