import { createClient } from "@supabase/supabase-js";
export const configured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.VITE_SUPABASE_ANON_KEY),
);
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://unconfigured.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    "unconfigured",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
export async function rpc<T = unknown>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error)
    throw new Error(
      error.code === "PGRST205"
        ? "Database setup is incomplete. Ask the administrator to apply the included Supabase migrations."
        : error.message,
    );
  return data as T;
}
export async function rows<T>(
  table: string,
  sort = "created_at",
): Promise<T[]> {
  let out: T[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(sort, { ascending: false })
      .range(start, start + 499);
    if (error)
      throw new Error(
        error.code === "PGRST205"
          ? "Database setup is incomplete. Ask the administrator to apply the included Supabase migrations."
          : error.message,
      );
    out = out.concat(data as T[]);
    if (data.length < 500) return out;
  }
}
export const appUrl = (
  import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin
).replace(/\/$/, "");
