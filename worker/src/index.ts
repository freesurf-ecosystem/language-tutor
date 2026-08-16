/**
 * FreeSurf Language Tutor — Cloudflare Worker
 * Proxies audio recordings → consolidated AI pod (STT+LLM+TTS).
 */
export interface Env {
  POD_URL: string;
}

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8081",
  "https://freesurf.tools",
];

function corsHeaders(origin: string): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.some(
    (o) => origin === o || origin.startsWith("exp://") || origin.startsWith("http://localhost")
  );
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? "";
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST" || url.pathname !== "/api/tutor") {
      return jsonResponse({ error: "Not found" }, 404, headers);
    }

    if (!env.POD_URL) {
      return jsonResponse({ error: "Service not configured" }, 500, headers);
    }

    try {
      const body = (await request.json()) as { audio_base64?: string; native_language?: string };
      if (!body.audio_base64) {
        return jsonResponse({ error: "No audio provided" }, 400, headers);
      }

      const podRes = await fetch(env.POD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_type: "tutor",
          audio_base64: body.audio_base64,
          native_language: body.native_language || "",
        }),
      });

      const podData = (await podRes.json()) as {
        error?: string;
        audio_base64?: string;
        original?: string;
        correction?: string | null;
        response?: string;
        language?: string;
      };

      if (!podRes.ok || podData.error) {
        return jsonResponse({ error: podData.error || "Tutor request failed" }, podRes.status || 500, headers);
      }

      return jsonResponse(podData, 200, headers);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Internal server error";
      return jsonResponse({ error: msg }, 500, headers);
    }
  },
};
