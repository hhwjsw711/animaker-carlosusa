// ─── Evolution API Client ───
// All WhatsApp messaging goes through the user's Evolution API instance.
// Anti-ban protections are enforced at this layer so tools don't need to care.

const EVOLUTION_BASE_URL = process.env.EVOLUTION_API_URL;

// ─── Anti-ban: warm-up daily limits ───
// Day 1→20, Day 2→36, Day 3→65, Day 4→117, Day 5→210, Day 6→378, Day 7→680
// After day 7: 1500/day (safe cruising speed)
const WARM_UP_GROWTH = 1.8;
const WARM_UP_DAY1 = 20;
const WARM_UP_DAYS = 7;
const MAX_DAILY_MESSAGES = 1500;

export function getWarmUpDailyLimit(day: number): number {
  if (day <= 0) return 0;
  if (day >= WARM_UP_DAYS) return MAX_DAILY_MESSAGES;
  return Math.floor(WARM_UP_DAY1 * Math.pow(WARM_UP_GROWTH, day - 1));
}

// ─── Anti-ban: human-like delay ───
// Random delay between 2000-5000ms using gaussian distribution
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 5000;

export function getHumanDelay(messageLength: number): number {
  // Base: random between min and max
  const base =
    MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  // Longer messages → slightly more delay (typing simulation)
  const typingFactor = Math.min(messageLength * 15, 3000);
  return Math.floor(base + typingFactor);
}

// ─── API helpers ───

function getBaseUrl(): string {
  if (!EVOLUTION_BASE_URL) {
    throw new Error("EVOLUTION_API_URL environment variable is not set");
  }
  return EVOLUTION_BASE_URL.replace(/\/$/, "");
}

interface EvolutionRequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  apiKey: string;
  body?: unknown;
}

async function evolutionRequest<T>(opts: EvolutionRequestOptions): Promise<T> {
  const url = `${getBaseUrl()}${opts.path}`;
  const headers: Record<string, string> = {
    apikey: opts.apiKey,
  };
  if (opts.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method: opts.method,
    headers,
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });

  if (!res.ok) {
    let errorMsg = `Evolution API error: ${res.status}`;
    try {
      const body = (await res.json()) as Record<string, unknown>;
      const detail = body?.response
        ? JSON.stringify(body.response)
        : undefined;
      errorMsg = String(
        detail ?? body?.message ?? body?.error ?? errorMsg,
      );
    } catch {
      try {
        errorMsg = await res.text();
      } catch {
        // Response body is not readable — use status code
      }
    }
    throw new Error(errorMsg);
  }

  return (await res.json()) as T;
}

// ─── Instance management ───

interface CreateInstanceResponse {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
  };
  hash: Record<string, string>;
  settings: Record<string, unknown>;
}

export async function createInstance(
  instanceName: string,
  apiKey: string,
  webhookUrl: string,
): Promise<CreateInstanceResponse> {
  return evolutionRequest<CreateInstanceResponse>({
    method: "POST",
    path: "/instance/create",
    apiKey,
    body: {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: false,
      rejectCall: false,
      msgCall: "",
      groupsIgnore: true,
      alwaysOnline: false, // ANTI-BAN: never stay always online
      readMessages: false, // ANTI-BAN: don't auto-read (looks robotic)
      readStatus: false,
      syncFullHistory: false,
      webhook: {
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        base64: false,
        headers: {
          apikey: apiKey,
        },
        events: [
          "QRCODE_UPDATED",
          "CONNECTION_UPDATE",
          "MESSAGES_UPSERT",
        ],
      },
    },
  });
}

interface ConnectResponse {
  pairingCode?: string;
  code?: string;
  count?: number;
  base64?: string;
}

export async function connectInstance(
  instanceName: string,
  apiKey: string,
): Promise<ConnectResponse> {
  return evolutionRequest<ConnectResponse>({
    method: "GET",
    path: `/instance/connect/${encodeURIComponent(instanceName)}`,
    apiKey,
  });
}

interface InstanceStatus {
  instanceName: string;
  instanceId: string;
  owner: string;
  profileName: string;
  status: string;
}

export async function fetchInstanceStatus(
  instanceName: string,
  apiKey: string,
): Promise<InstanceStatus> {
  const instances = await evolutionRequest<InstanceStatus[]>({
    method: "GET",
    path: `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
    apiKey,
  });
  if (!instances || instances.length === 0) {
    throw new Error(`Instance "${instanceName}" not found`);
  }
  return instances[0];
}

// Connection state endpoint (more reliable than fetchInstances for status)
interface ConnectionStateResponse {
  instance: {
    instanceName: string;
    state: "open" | "close" | "connecting";
  };
}

export async function getConnectionState(
  instanceName: string,
  apiKey: string,
): Promise<ConnectionStateResponse> {
  return evolutionRequest<ConnectionStateResponse>({
    method: "GET",
    path: `/instance/connectionState/${encodeURIComponent(instanceName)}`,
    apiKey,
  });
}

export async function setWebhook(
  instanceName: string,
  apiKey: string,
  webhookUrl: string,
): Promise<void> {
  await evolutionRequest<Record<string, unknown>>({
    method: "POST",
    path: `/webhook/set/${encodeURIComponent(instanceName)}`,
    apiKey,
    body: {
      enabled: true,
      url: webhookUrl,
      webhookByEvents: false,
      webhookBase64: false,
      events: [
        "QRCODE_UPDATED",
        "CONNECTION_UPDATE",
        "MESSAGES_UPSERT",
      ],
    },
  });
}

export async function logoutInstance(
  instanceName: string,
  apiKey: string,
): Promise<void> {
  await evolutionRequest({
    method: "DELETE",
    path: `/instance/logout/${encodeURIComponent(instanceName)}`,
    apiKey,
  });
}

// ─── Send message (with anti-ban protections built-in) ───

interface SendTextResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: Record<string, unknown>;
  messageTimestamp: string;
  status: string;
}

export interface QuotedMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation: string;
  };
}

export async function sendWhatsAppMessage(
  instanceName: string,
  apiKey: string,
  to: string,
  text: string,
  quoted?: QuotedMessage,
): Promise<SendTextResponse> {
  // ANTI-BAN: calculate human-like delay
  const delay = getHumanDelay(text.length);

  return evolutionRequest<SendTextResponse>({
    method: "POST",
    path: `/message/sendText/${encodeURIComponent(instanceName)}`,
    apiKey,
    body: {
      number: to,
      text,
      options: {
        delay,
        presence: "composing", // ANTI-BAN: show "typing..." before message
        linkPreview: false,
      },
      ...(quoted ? { quoted } : {}),
    },
  });
}

export async function sendWhatsAppMedia(
  instanceName: string,
  apiKey: string,
  to: string,
  mediaUrl: string,
  mediaType: "image" | "video" | "document" | "audio" = "image",
  caption?: string,
): Promise<SendTextResponse> {
  const delay = getHumanDelay((caption ?? "").length);

  return evolutionRequest<SendTextResponse>({
    method: "POST",
    path: `/message/sendMedia/${encodeURIComponent(instanceName)}`,
    apiKey,
    body: {
      number: to,
      mediatype: mediaType,
      media: mediaUrl,
      caption: caption ?? "",
      options: {
        delay,
        presence: "composing",
      },
    },
  });
}
