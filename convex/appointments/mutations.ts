import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { resolveWorkspaceUserId } from "../lib/workspace";

const statusValidator = v.union(
  v.literal("scheduled"),
  v.literal("confirmed"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("no_show"),
);

export const createAppointment = mutation({
  args: {
    customerId: v.id("customers"),
    serviceId: v.optional(v.id("services")),
    collaboratorId: v.optional(v.id("collaborators")),
    title: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;

    if (!args.serviceId && !args.collaboratorId) {
      throw new Error("At least a service or collaborator is required");
    }

    if (args.endTime <= args.startTime) {
      throw new Error("End time must be after start time");
    }

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.userId !== effectiveUserId) {
      throw new Error("Customer not found");
    }

    if (args.serviceId) {
      const service = await ctx.db.get(args.serviceId);
      if (!service || service.userId !== effectiveUserId) {
        throw new Error("Service not found");
      }
    }

    if (args.collaboratorId) {
      const collaborator = await ctx.db.get(args.collaboratorId);
      if (!collaborator || collaborator.ownerId !== effectiveUserId) {
        throw new Error("Collaborator not found");
      }
    }

    return await ctx.db.insert("appointments", {
      userId: effectiveUserId,
      customerId: args.customerId,
      serviceId: args.serviceId,
      collaboratorId: args.collaboratorId,
      title: args.title?.trim() || undefined,
      startTime: args.startTime,
      endTime: args.endTime,
      status: "scheduled",
      notes: args.notes?.trim() || undefined,
      createdAt: Date.now(),
    });
  },
});

export const updateAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    customerId: v.optional(v.id("customers")),
    serviceId: v.optional(v.id("services")),
    collaboratorId: v.optional(v.id("collaborators")),
    title: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    status: v.optional(statusValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { appointmentId, ...fields }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;

    const appointment = await ctx.db.get(appointmentId);
    if (!appointment || appointment.userId !== effectiveUserId) {
      throw new Error("Appointment not found");
    }

    if (fields.customerId) {
      const customer = await ctx.db.get(fields.customerId);
      if (!customer || customer.userId !== effectiveUserId) {
        throw new Error("Customer not found");
      }
    }

    if (fields.serviceId) {
      const service = await ctx.db.get(fields.serviceId);
      if (!service || service.userId !== effectiveUserId) {
        throw new Error("Service not found");
      }
    }

    if (fields.collaboratorId) {
      const collaborator = await ctx.db.get(fields.collaboratorId);
      if (!collaborator || collaborator.ownerId !== effectiveUserId) {
        throw new Error("Collaborator not found");
      }
    }

    const effectiveStart = fields.startTime ?? appointment.startTime;
    const effectiveEnd = fields.endTime ?? appointment.endTime;
    if (effectiveEnd <= effectiveStart) {
      throw new Error("End time must be after start time");
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = key === "title" || key === "notes"
          ? (value as string).trim() || undefined
          : value;
      }
    }

    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(appointmentId, patch);
  },
});

export const deleteAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, { appointmentId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;

    const appointment = await ctx.db.get(appointmentId);
    if (!appointment || appointment.userId !== effectiveUserId) {
      throw new Error("Appointment not found");
    }

    await ctx.db.delete(appointmentId);
  },
});

// ─── Internal (for AI agent) ──────────────────────────────────────────────────

export const createAppointmentInternal = internalMutation({
  args: {
    userId: v.id("users"),
    customerId: v.id("customers"),
    serviceId: v.optional(v.id("services")),
    collaboratorId: v.optional(v.id("collaborators")),
    title: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { userId, ...args }) => {
    if (!args.serviceId && !args.collaboratorId) {
      throw new Error("At least a service or collaborator is required");
    }

    if (args.endTime <= args.startTime) {
      throw new Error("End time must be after start time");
    }

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.userId !== userId) {
      throw new Error("Customer not found");
    }

    if (args.serviceId) {
      const service = await ctx.db.get(args.serviceId);
      if (!service || service.userId !== userId) {
        throw new Error("Service not found");
      }
    }

    if (args.collaboratorId) {
      const collaborator = await ctx.db.get(args.collaboratorId);
      if (!collaborator || collaborator.ownerId !== userId) {
        throw new Error("Collaborator not found");
      }
    }

    return await ctx.db.insert("appointments", {
      userId,
      customerId: args.customerId,
      serviceId: args.serviceId,
      collaboratorId: args.collaboratorId,
      title: args.title?.trim() || undefined,
      startTime: args.startTime,
      endTime: args.endTime,
      status: "scheduled",
      notes: args.notes?.trim() || undefined,
      createdAt: Date.now(),
    });
  },
});

export const updateAppointmentInternal = internalMutation({
  args: {
    userId: v.id("users"),
    appointmentId: v.id("appointments"),
    customerId: v.optional(v.id("customers")),
    serviceId: v.optional(v.id("services")),
    collaboratorId: v.optional(v.id("collaborators")),
    title: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    status: v.optional(statusValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { userId, appointmentId, ...fields }) => {
    const appointment = await ctx.db.get(appointmentId);
    if (!appointment || appointment.userId !== userId) {
      throw new Error("Appointment not found");
    }

    if (fields.customerId) {
      const customer = await ctx.db.get(fields.customerId);
      if (!customer || customer.userId !== userId) {
        throw new Error("Customer not found");
      }
    }

    if (fields.serviceId) {
      const service = await ctx.db.get(fields.serviceId);
      if (!service || service.userId !== userId) {
        throw new Error("Service not found");
      }
    }

    if (fields.collaboratorId) {
      const collaborator = await ctx.db.get(fields.collaboratorId);
      if (!collaborator || collaborator.ownerId !== userId) {
        throw new Error("Collaborator not found");
      }
    }

    const effectiveStart = fields.startTime ?? appointment.startTime;
    const effectiveEnd = fields.endTime ?? appointment.endTime;
    if (effectiveEnd <= effectiveStart) {
      throw new Error("End time must be after start time");
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = key === "title" || key === "notes"
          ? (value as string).trim() || undefined
          : value;
      }
    }

    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(appointmentId, patch);
  },
});

export const deleteAppointmentInternal = internalMutation({
  args: {
    userId: v.id("users"),
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, { userId, appointmentId }) => {
    const appointment = await ctx.db.get(appointmentId);
    if (!appointment || appointment.userId !== userId) {
      throw new Error("Appointment not found");
    }

    await ctx.db.delete(appointmentId);
  },
});
