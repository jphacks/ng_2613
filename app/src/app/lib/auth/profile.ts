import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";

export type Profile = {
  id: string;
  phone: string;
  username: string;
  gender: string;
  year: string;
};

export async function getAuthenticatedUser(client: SupabaseClient<Database>) {
  const { data: claimsData, error: claimsError } = await client.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (claimsError || typeof userId !== "string") {
    return null;
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    return null;
  }

  return { id: userId, phone: userData.user.phone ?? "" };
}

export async function getProfile(client: SupabaseClient<Database>): Promise<Profile | null> {
  const authenticatedUser = await getAuthenticatedUser(client);
  if (!authenticatedUser) {
    return null;
  }

  const { data, error } = await client
    .from("users")
    .select("id, username, birth_date, gender")
    .eq("id", authenticatedUser.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    phone: authenticatedUser.phone,
    username: data.username,
    gender: data.gender ?? "",
    year: data.birth_date?.slice(0, 4) ?? "",
  };
}
