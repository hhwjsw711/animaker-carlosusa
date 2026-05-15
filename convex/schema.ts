import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    ...authTables.users.validator.fields,
    photoBunnyPath: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    bio: v.optional(v.string()),
    onboardingCompleted: v.optional(v.boolean()),
    onboardingUseCase: v.optional(
      v.union(
        v.literal("customers"),
        v.literal("chat"),
        v.literal("automation"),
        v.literal("all"),
      ),
    ),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  threads: defineTable({
    userId: v.id("users"),
    agentThreadId: v.optional(v.string()),
    title: v.optional(v.string()),
    model: v.optional(v.string()),
    favorite: v.optional(v.boolean()),
    // Legacy fields — migrated to threadStatus, kept for backward compat with existing docs
    cancelledAt: v.optional(v.number()),
    streamingAt: v.optional(v.number()),
    pendingImageCount: v.optional(v.number()),
    customerId: v.optional(v.id("customers")),
    scheduledTaskId: v.optional(v.id("scheduledTasks")),
  })
    .index("by_userId", ["userId"])
    .index("by_agentThreadId", ["agentThreadId"])
    .index("by_userId_and_customerId", ["userId", "customerId"])
    .index("by_userId_and_favorite", ["userId", "favorite"])
    .index("by_userId_and_customerId_and_scheduledTaskId", [
      "userId",
      "customerId",
      "scheduledTaskId",
    ])
    .index("by_userId_and_favorite_and_scheduledTaskId_and_customerId", [
      "userId",
      "favorite",
      "scheduledTaskId",
      "customerId",
    ]),

  // Operational state for threads — separated from threads table to avoid
  // OCC contention between high-churn streaming/cancel/image ops and normal
  // thread operations (rename, favorite, move, delete).
  threadStatus: defineTable({
    threadId: v.id("threads"),
    streamingAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    pendingImageCount: v.optional(v.number()),
  }).index("by_threadId", ["threadId"]),

  customers: defineTable({
    userId: v.id("users"),
    name: v.string(),
    photoBunnyPath: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    color: v.optional(v.string()),
    gender: v.optional(
      v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("nonBinary"),
        v.literal("other"),
        v.literal("preferNotToSay"),
      ),
    ),
    document: v.optional(v.string()),
    documentType: v.optional(
      v.union(v.literal("cpf"), v.literal("ssn")),
    ),
    company: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    country: v.optional(v.string()),
    instagram: v.optional(v.string()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    facebook: v.optional(v.string()),
    tiktok: v.optional(v.string()),
    youtube: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_phone", ["phone"]),

  customerFiles: defineTable({
    userId: v.id("users"),
    customerId: v.id("customers"),
    bunnyPath: v.string(),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    category: v.string(),
    status: v.string(),
    error: v.optional(v.string()),
    ragEntryId: v.optional(v.string()),
    extractionMethod: v.optional(v.string()),
    extractedCharCount: v.optional(v.number()),
    pageCount: v.optional(v.number()),
    extractionWarning: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_customerId", ["customerId"])
    .index("by_userId_and_customerId", ["userId", "customerId"])
    .index("by_customerId_and_createdAt", ["customerId", "createdAt"]),

  chatAttachments: defineTable({
    threadId: v.id("threads"),
    userId: v.optional(v.id("users")),
    bunnyPath: v.optional(v.string()),
    size: v.optional(v.number()),
  })
    .index("by_threadId", ["threadId"])
    .index("by_userId", ["userId"]),

  pendingUploads: defineTable({
    userId: v.id("users"),
    bunnyPath: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_bunnyPath", ["bunnyPath"]),

  dailyUsage: defineTable({
    userId: v.id("users"),
    date: v.string(),
    // Legacy fields (dados antigos)
    totalInputTokens: v.optional(v.number()),
    totalOutputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    requestCount: v.optional(v.number()),
    // Chat interativo
    chatInputTokens: v.optional(v.number()),
    chatOutputTokens: v.optional(v.number()),
    chatRequests: v.optional(v.number()),
    // Scheduled tasks
    scheduledInputTokens: v.optional(v.number()),
    scheduledOutputTokens: v.optional(v.number()),
    scheduledRequests: v.optional(v.number()),
    // Extração Gemini (customer files + chat attachments)
    extractionInputTokens: v.optional(v.number()),
    extractionOutputTokens: v.optional(v.number()),
    extractionRequests: v.optional(v.number()),
    // RAG embeddings (estimativa)
    ragTokens: v.optional(v.number()),
    ragInserts: v.optional(v.number()),
    ragSearches: v.optional(v.number()),
    // Exa web search/answer/contents
    exaSearches: v.optional(v.number()),
    exaAnswers: v.optional(v.number()),
    exaContents: v.optional(v.number()),
    // Image generation (fal.ai)
    imageGenerations: v.optional(v.number()),
    imageEdits: v.optional(v.number()),
    // Credits consumed per source (calculated by backend)
    chatCredits: v.optional(v.number()),
    scheduledCredits: v.optional(v.number()),
    extractionCredits: v.optional(v.number()),
    ragCredits: v.optional(v.number()),
    exaCredits: v.optional(v.number()),
    imageGenerationCredits: v.optional(v.number()),
  }).index("by_userId_and_date", ["userId", "date"]),

  skills: defineTable({
    userId: v.optional(v.id("users")),
    type: v.union(v.literal("system"), v.literal("user")),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    instructions: v.string(),
    icon: v.string(),
    category: v.string(),
    order: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_userId", ["userId"])
    .index("by_slug_and_userId", ["slug", "userId"]),

  userSkills: defineTable({
    userId: v.id("users"),
    skillId: v.id("skills"),
    enabled: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_skillId", ["userId", "skillId"]),

  messagingConfig: defineTable({
    userId: v.id("users"),
    // Evolution API (WhatsApp)
    evolutionInstance: v.optional(v.string()),
    evolutionApiKey: v.optional(v.string()),
    evolutionStatus: v.optional(
      v.union(
        v.literal("disconnected"),
        v.literal("connecting"),
        v.literal("connected"),
      ),
    ),
    evolutionPhone: v.optional(v.string()),
    // Warm-up tracking (anti-ban)
    warmUpStartedAt: v.optional(v.number()),
    warmUpDay: v.optional(v.number()),
    messagesToday: v.optional(v.number()),
    messagesTodayDate: v.optional(v.string()),
    // Resend (Email)
    resendApiKey: v.optional(v.string()),
    emailFrom: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_evolutionInstance", ["evolutionInstance"]),

  messages: defineTable({
    userId: v.id("users"),
    customerId: v.id("customers"),
    channel: v.union(v.literal("email"), v.literal("whatsapp")),
    direction: v.union(v.literal("outbound"), v.literal("inbound")),
    to: v.string(),
    from: v.string(),
    subject: v.optional(v.string()),
    body: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("undelivered"),
      v.literal("received"),
    ),
    mediaUrl: v.optional(v.string()),
    mediaType: v.optional(v.string()),
    quotedMessageId: v.optional(v.id("messages")),
    externalId: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_customerId_and_channel_and_createdAt", [
      "customerId",
      "channel",
      "createdAt",
    ])
    .index("by_externalId", ["externalId"])
    .index("by_idempotencyKey", ["idempotencyKey"]),

  customerNotes: defineTable({
    userId: v.id("users"),
    customerId: v.id("customers"),
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_customerId", ["customerId"])
    .index("by_customerId_and_createdAt", ["customerId", "createdAt"]),

  scheduledTasks: defineTable({
    userId: v.id("users"),
    customerId: v.optional(v.id("customers")),
    title: v.string(),
    prompt: v.string(),
    repeatType: v.union(
      v.literal("none"),
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
    ),
    scheduledDate: v.number(),
    scheduledTime: v.string(),
    weekDay: v.optional(v.number()),
    monthDay: v.optional(v.number()),
    timezone: v.string(),
    expirationDate: v.optional(v.number()),
    isActive: v.boolean(),
    model: v.optional(v.string()),
    autoSendMessages: v.optional(v.boolean()),
    nextRunAt: v.optional(v.number()),
    scheduledFunctionId: v.optional(v.id("_scheduled_functions")),
    lastRunAt: v.optional(v.number()),
    runCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_customerId", ["userId", "customerId"]),

  scheduledTaskRuns: defineTable({
    taskId: v.id("scheduledTasks"),
    userId: v.id("users"),
    threadId: v.optional(v.id("threads")),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("stopped"),
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    stoppedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    summary: v.optional(v.string()),
  })
    .index("by_taskId", ["taskId"])
    .index("by_taskId_and_status", ["taskId", "status"])
    .index("by_userId_and_status", ["userId", "status"]),

  creditBalances: defineTable({
    userId: v.id("users"),
    monthlyCredits: v.number(),
    monthlyCreditsReset: v.number(),
    addOnCredits: v.number(),
    dailyCredits: v.number(),
    dailyCreditsReset: v.string(),
  }).index("by_userId", ["userId"]),

  creditTransactions: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    balanceAfter: v.number(),
    source: v.union(
      v.literal("monthly_refresh"),
      v.literal("daily_refresh"),
      v.literal("addon_purchase"),
      v.literal("subscription_grant"),
      v.literal("chat"),
      v.literal("scheduled"),
      v.literal("extraction"),
      v.literal("rag"),
      v.literal("exa"),
      v.literal("imageGeneration"),
    ),
    description: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripeInvoiceId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId_and_createdAt", ["userId", "createdAt"])
    .index("by_stripePaymentIntentId", ["stripePaymentIntentId"])
    .index("by_stripeInvoiceId", ["stripeInvoiceId"]),

  userPlans: defineTable({
    userId: v.id("users"),
    planId: v.union(
      v.literal("free"),
      v.literal("starter"),
      v.literal("pro"),
      v.literal("business"),
    ),
    status: v.union(
      v.literal("active"),
      v.literal("trialing"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("unpaid"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("paused"),
    ),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    currency: v.optional(v.union(v.literal("usd"), v.literal("brl"))),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.boolean(),
    canceledAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"]),

  serviceCategories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.string(),
    order: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  services: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("serviceCategories")),
    price: v.number(),
    currency: v.string(),
    billingType: v.union(
      v.literal("one_time"),
      v.literal("recurring"),
    ),
    recurringInterval: v.optional(
      v.union(
        v.literal("weekly"),
        v.literal("biweekly"),
        v.literal("monthly"),
        v.literal("quarterly"),
        v.literal("semiannual"),
        v.literal("annual"),
      ),
    ),
    duration: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    ragEntryId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_userId_and_categoryId", ["userId", "categoryId"]),

  customerServices: defineTable({
    userId: v.id("users"),
    customerId: v.id("customers"),
    serviceId: v.id("services"),
    customPrice: v.optional(v.number()),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("cancelled"),
      v.literal("completed"),
    ),
    nextBillingDate: v.optional(v.string()),
    lastBillingDate: v.optional(v.string()),
    autoGenerateNext: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_customerId", ["customerId"])
    .index("by_serviceId", ["serviceId"])
    .index("by_userId_and_customerId", ["userId", "customerId"])
    .index("by_userId_and_serviceId", ["userId", "serviceId"]),

  serviceTransactions: defineTable({
    userId: v.id("users"),
    customerServiceId: v.id("customerServices"),
    customerId: v.id("customers"),
    serviceId: v.id("services"),
    amount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("overdue"),
      v.literal("cancelled"),
    ),
    dueDate: v.string(),
    paidDate: v.optional(v.string()),
    paymentMethod: v.optional(
      v.union(
        v.literal("pix"),
        v.literal("cash"),
        v.literal("credit_card"),
        v.literal("bank_transfer"),
        v.literal("boleto"),
        v.literal("other"),
      ),
    ),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_customerServiceId", ["customerServiceId"])
    .index("by_customerServiceId_and_status_and_dueDate", [
      "customerServiceId",
      "status",
      "dueDate",
    ])
    .index("by_customerId", ["customerId"])
    .index("by_userId", ["userId"]),

  // ─── Products ────────────────────────────────────────────────────────────────

  productCategories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.string(),
    order: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  products: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("productCategories")),
    sku: v.optional(v.string()),
    price: v.number(),
    currency: v.string(),
    photoBunnyPaths: v.optional(v.array(v.string())),
    status: v.union(v.literal("active"), v.literal("inactive")),
    ragEntryId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_userId_and_categoryId", ["userId", "categoryId"]),

  customerProducts: defineTable({
    userId: v.id("users"),
    customerId: v.id("customers"),
    productId: v.id("products"),
    customPrice: v.optional(v.number()),
    notes: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_customerId", ["customerId"])
    .index("by_productId", ["productId"])
    .index("by_userId_and_customerId", ["userId", "customerId"])
    .index("by_userId_and_productId", ["userId", "productId"]),

  productTransactions: defineTable({
    userId: v.id("users"),
    customerProductId: v.id("customerProducts"),
    customerId: v.id("customers"),
    productId: v.id("products"),
    quantity: v.number(),
    unitPrice: v.number(),
    amount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("cancelled"),
    ),
    purchaseDate: v.string(),
    paidDate: v.optional(v.string()),
    paymentMethod: v.optional(
      v.union(
        v.literal("pix"),
        v.literal("cash"),
        v.literal("credit_card"),
        v.literal("bank_transfer"),
        v.literal("boleto"),
        v.literal("other"),
      ),
    ),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_customerProductId", ["customerProductId"])
    .index("by_customerId", ["customerId"])
    .index("by_userId", ["userId"]),

  // ─── Collaborators ─────────────────────────────────────────────────────────

  collaborators: defineTable({
    ownerId: v.id("users"),
    userId: v.optional(v.id("users")),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    photoBunnyPath: v.optional(v.string()),
    color: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("staff")),
    specialties: v.optional(v.array(v.id("services"))),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.number(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_userId", ["userId"])
    .index("by_ownerId_and_status", ["ownerId", "status"])
    .index("by_ownerId_and_email", ["ownerId", "email"]),

  // ─── Appointments ──────────────────────────────────────────────────────────

  appointments: defineTable({
    userId: v.id("users"),
    customerId: v.id("customers"),
    serviceId: v.optional(v.id("services")),
    collaboratorId: v.optional(v.id("collaborators")),
    title: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show"),
    ),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_startTime", ["userId", "startTime"])
    .index("by_userId_and_customerId", ["userId", "customerId"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_userId_and_collaboratorId", ["userId", "collaboratorId"]),
});
