import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

export const backfillProductRag = internalAction({
  args: {},
  handler: async (ctx): Promise<{ scheduled: number }> => {
    const products: Id<"products">[] = await ctx.runQuery(internal.products.queries.listProductsWithoutRag);
    let delay = 0;
    for (const productId of products) {
      await ctx.scheduler.runAfter(delay, internal.products.actions.indexProductRag, { productId });
      delay += 200;
    }
    return { scheduled: products.length };
  },
});
