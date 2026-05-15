import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up pending uploads that were never sent (orphaned files in storage)
crons.daily(
  "cleanup orphaned uploads",
  { hourUTC: 4, minuteUTC: 0 },
  internal.chatAttachments.mutations.cleanupOrphanedUploads,
);

// Reconcile userPlans with the Stripe component db daily — catches drift from
// missed webhooks. Runs at low-traffic UTC time.
crons.daily(
  "reconcile stripe subscriptions",
  { hourUTC: 5, minuteUTC: 0 },
  internal.billing.stripeFulfillment.reconcileSubscriptions,
);

export default crons;
