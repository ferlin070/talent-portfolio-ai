// Supabase Edge Function: cleanup-orphaned-objects
// Deploy with --no-verify-jwt, protected by CLEANUP_JOB_SECRET.
// Never expose SUPABASE_SERVICE_ROLE_KEY to browser users.
// Schedule independently in Supabase Dashboard → Cron.
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const required = (name) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server-side configuration: ${name}`);
  return value;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const cronSecret = required("CLEANUP_JOB_SECRET");
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createClient(
    required("SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data:jobs, error } = await admin.from("storage_cleanup_jobs")
    .select("id,bucket_id,object_path,attempts")
    .is("processed_at", null)
    .lt("attempts", 10)
    .order("enqueued_at", { ascending: true })
    .limit(50);

  if (error) {
    return Response.json({ error: "Queue unavailable" }, { status: 500 });
  }

  let cleaned = 0;
  let retained = 0;

  for (const job of jobs ?? []) {
    const { bucket_id: bucket, object_path: path } = job;
    const references = {
      "project-gallery": { table: "project_images", field: "storage_path" },
      "certificates": { table: "certificates", field: "storage_path" },
    };

    try {
      if (references[bucket]) {
        const ref = references[bucket];
        const { data, error:lookupError } = await admin.from(ref.table)
          .select("id").eq(ref.field, path).limit(1);
        if (lookupError) throw lookupError;
        if (data?.length) throw new Error("Fail masih dirujuk oleh metadata.");
      } else if (bucket === "profile-photos") {
        const { data, error:lookupError } = await admin.from("profiles")
          .select("user_id").like("avatar_url", `%/profile-photos/${path}`)
          .limit(1);
        if (lookupError) throw lookupError;
        if (data?.length) throw new Error("Foto masih digunakan oleh profil.");
      }

      const removal = await admin.storage.from(bucket).remove([path]);
      if (removal.error && !String(removal.error.message).includes("not found")) {
        throw removal.error;
      }

      const updated = await admin.from("storage_cleanup_jobs").update({
        processed_at: new Date().toISOString(),
        last_error: null,
      }).eq("id", job.id);
      if (updated.error) throw updated.error;
      cleaned += 1;
    } catch (caught) {
      const message = caught instanceof Error
        ? caught.message.slice(0, 150)
        : "Gagal membersihkan fail";
      await admin.from("storage_cleanup_jobs").update({
        attempts: job.attempts + 1,
        last_error: message,
      }).eq("id", job.id);
      retained += 1;
    }
  }

  return Response.json(
    { scanned: jobs?.length ?? 0, cleaned, retained },
    { headers: { "Cache-Control": "no-store" } },
  );
});
