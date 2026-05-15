import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

export const backfillServiceRag = internalAction({
  args: {},
  handler: async (ctx): Promise<{ scheduled: number }> => {
    const services: Id<"services">[] = await ctx.runQuery(internal.services.queries.listServicesWithoutRag);
    let delay = 0;
    for (const serviceId of services) {
      await ctx.scheduler.runAfter(delay, internal.services.actions.indexServiceRag, { serviceId });
      delay += 200;
    }
    return { scheduled: services.length };
  },
});
