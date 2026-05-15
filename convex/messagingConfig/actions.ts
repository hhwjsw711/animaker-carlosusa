import { action } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  createInstance,
  connectInstance,
  fetchInstanceStatus,
  getConnectionState,
  logoutInstance,
  setWebhook,
} from "../tools/messaging/client";

export const connectWhatsApp = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    qrCode?: string;
    pairingCode?: string;
    status: string;
  }> => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");
    const ws = await ctx.runQuery(internal.workspace.queries.resolveForAction, { authenticatedUserId: authUserId });
    if (ws.collaboratorRole === "staff") throw new Error("Insufficient permissions");
    const userId = ws.effectiveUserId as Id<"users">;

    const config = await ctx.runQuery(
      internal.messagingConfig.queries.getMessagingConfigByUserId,
      { userId },
    );

    const evolutionApiKey = process.env.EVOLUTION_API_KEY ?? "";
    const convexUrl = process.env.CONVEX_SITE_URL;
    if (!convexUrl) throw new Error("CONVEX_SITE_URL is not set");

    const webhookUrl = `${convexUrl}/webhooks/evolution`;
    const instanceName = `vertex-${userId.replace(/[^a-zA-Z0-9]/g, "")}`;

    // Create instance if not exists
    if (!config?.evolutionInstance) {
      const created = await createInstance(
        instanceName,
        evolutionApiKey,
        webhookUrl,
      );

      const instanceApiKey =
        (created.hash as Record<string, string>)?.apikey ?? evolutionApiKey;

      await ctx.runMutation(
        internal.messagingConfig.mutations.setEvolutionInstance,
        {
          userId,
          evolutionInstance: instanceName,
          evolutionApiKey: instanceApiKey,
        },
      );

      await ctx.runMutation(
        internal.messagingConfig.mutations.updateEvolutionStatus,
        { userId, status: "connecting" },
      );

      // Wait 2s for instance to be ready (same as papaias)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else {
      // Instance exists — check if already connected
      try {
        const status = await fetchInstanceStatus(
          config.evolutionInstance,
          config.evolutionApiKey ?? evolutionApiKey,
        );
        if (status.status === "open") {
          return { status: "connected" };
        }
      } catch (err) {
        // Only recreate if instance truly doesn't exist
        const message = err instanceof Error ? err.message.toLowerCase() : "";
        if (message.includes("not found") || message.includes("404")) {
          await createInstance(
            config.evolutionInstance,
            config.evolutionApiKey ?? evolutionApiKey,
            webhookUrl,
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          throw err;
        }
      }

      await ctx.runMutation(
        internal.messagingConfig.mutations.updateEvolutionStatus,
        { userId, status: "connecting" },
      );
    }

    // Ensure webhook is active on the instance
    const currentInstance = config?.evolutionInstance ?? instanceName;
    const currentApiKey = config?.evolutionApiKey ?? evolutionApiKey;

    try {
      await setWebhook(currentInstance, currentApiKey, webhookUrl);
    } catch {
      // Non-fatal: webhook may already be configured
    }

    // Generate QR code
    let connectResult = await connectInstance(currentInstance, currentApiKey);

    // Retry after 2s if QR not ready (same as papaias)
    if (!connectResult.code && !connectResult.base64) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      connectResult = await connectInstance(currentInstance, currentApiKey);
    }

    // Return the code string (frontend will render as QR image)
    return {
      qrCode: connectResult.code ?? connectResult.base64,
      pairingCode: connectResult.pairingCode,
      status: "connecting",
    };
  },
});

export const disconnectWhatsApp = action({
  args: {},
  handler: async (ctx): Promise<void> => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");
    const ws = await ctx.runQuery(internal.workspace.queries.resolveForAction, { authenticatedUserId: authUserId });
    if (ws.collaboratorRole === "staff") throw new Error("Insufficient permissions");
    const userId = ws.effectiveUserId as Id<"users">;

    const config = await ctx.runQuery(
      internal.messagingConfig.queries.getMessagingConfigByUserId,
      { userId },
    );

    if (!config?.evolutionInstance || !config?.evolutionApiKey) return;

    try {
      await logoutInstance(config.evolutionInstance, config.evolutionApiKey);
    } catch {
      // Instance may already be logged out
    }

    await ctx.runMutation(
      internal.messagingConfig.mutations.updateEvolutionStatus,
      { userId, status: "disconnected" },
    );
  },
});

export const checkWhatsAppStatus = action({
  args: {},
  handler: async (ctx): Promise<{ status: string; phone?: string }> => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");
    const ws = await ctx.runQuery(internal.workspace.queries.resolveForAction, { authenticatedUserId: authUserId });
    if (ws.collaboratorRole === "staff") throw new Error("Insufficient permissions");
    const userId = ws.effectiveUserId as Id<"users">;

    const config = await ctx.runQuery(
      internal.messagingConfig.queries.getMessagingConfigByUserId,
      { userId },
    );

    if (!config?.evolutionInstance || !config?.evolutionApiKey) {
      return { status: "disconnected" };
    }

    try {
      // Use connectionState endpoint (more reliable, same as papaias)
      const connState = await getConnectionState(
        config.evolutionInstance,
        config.evolutionApiKey,
      );

      const state = connState.instance?.state;
      const status = state === "open" ? "connected" : "disconnected";

      if (status !== config.evolutionStatus) {
        // Fetch full instance info for owner phone when connected
        let phone: string | undefined;
        if (status === "connected") {
          try {
            const instance = await fetchInstanceStatus(
              config.evolutionInstance,
              config.evolutionApiKey,
            );
            phone = instance.owner?.split("@")[0];
          } catch {
            // ignore, phone is optional
          }
        }

        await ctx.runMutation(
          internal.messagingConfig.mutations.updateEvolutionStatus,
          {
            userId,
            status: status as "connected" | "disconnected",
            phone,
          },
        );
      }

      return {
        status,
        phone: config.evolutionPhone ?? undefined,
      };
    } catch {
      return { status: "disconnected" };
    }
  },
});
