import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.2";
const allowedRoles = [
  "super_admin",
  "class_representative",
  "assistant_representative",
  "data_officer",
];
Deno.serve(async (req: Request) => {
  const origin = Deno.env.get("APP_URL");
  const cors = {
    "Access-Control-Allow-Origin": origin || "https://invalid.local",
    "Access-Control-Allow-Headers":
      "authorization,x-client-info,apikey,content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    Vary: "Origin",
  };
  const send = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  if (!origin)
    return send(
      { error: "Invitation service configuration is incomplete." },
      503,
    );
  if (req.headers.get("origin") && req.headers.get("origin") !== origin)
    return send({ error: "Origin not permitted." }, 403);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return send({ error: "Method not allowed." }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization) return send({ error: "Sign in required." }, 401);
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    },
  );
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) return send({ error: "Invalid session." }, 401);
  const { data: allowed, error: permissionError } = await userClient.rpc(
    "has_permission",
    { permission: "roles" },
  );
  if (permissionError || !allowed)
    return send({ error: "Not authorized." }, 403);
  try {
    const body = await req.json();
    const { email, display_name, role } = body;
    if (
      typeof email !== "string" ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      email.length > 254 ||
      typeof display_name !== "string" ||
      display_name.trim().length < 3 ||
      display_name.length > 120 ||
      !allowedRoles.includes(role)
    )
      return send(
        { error: "Enter a valid name, email and administrator role." },
        400,
      );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: display_name.trim() },
      redirectTo: origin + "/reset-password",
    });
    if (error || !data.user)
      return send(
        {
          error:
            "Invitation could not be created. For an existing account, use the database-owner provisioning procedure.",
        },
        400,
      );
    const { error: roleError } = await userClient.rpc("set_administrator", {
      target_user: data.user.id,
      new_role: role,
    });
    if (roleError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return send(
        {
          error:
            "Administrator assignment failed. No administrator access was granted.",
        },
        500,
      );
    }
    return send({ success: true });
  } catch {
    return send({ error: "Unable to process invitation." }, 400);
  }
});
