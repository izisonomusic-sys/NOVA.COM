import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function sha512(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-512", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const masterKey = Deno.env.get("PAYDUNYA_MASTER_KEY") ?? "";
  if (!masterKey) return json({ error: "server_not_configured" }, 500);

  const contentType = req.headers.get("content-type") ?? "";
  let payload: any;
  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      const raw = form.get("data");
      if (typeof raw !== "string") return json({ error: "missing_data" }, 400);
      payload = JSON.parse(raw);
    } else {
      const body = await req.json();
      payload = typeof body?.data === "string" ? JSON.parse(body.data) : (body?.data ?? body);
    }
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }

  const receivedHash = String(payload?.hash ?? "");
  const expectedHash = await sha512(masterKey);
  if (!timingSafeEqual(receivedHash, expectedHash)) return json({ error: "unauthorized" }, 401);

  const providerReference = String(payload?.invoice?.token ?? payload?.token ?? payload?.transaction_id ?? payload?.disburse_id ?? "").trim();
  const status = String(payload?.status ?? payload?.payment_status ?? "pending").toLowerCase();
  if (!providerReference) return json({ error: "missing_provider_reference" }, 400);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "server_not_configured" }, 500);

  const r = await fetch(`${url}/rest/v1/rpc/process_paydunya_webhook`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_provider_reference: providerReference, p_status: status, p_payload: payload }),
  });
  const text = await r.text();
  if (!r.ok) return json({ error: "database_error", detail: text }, 502);
  return new Response(text, { status: 200, headers });
});
