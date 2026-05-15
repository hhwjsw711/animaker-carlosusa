import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";

export const listByDay = query({
  args: {
    dayStart: v.number(),
    dayEnd: v.number(),
    customerId: v.optional(v.id("customers")),
    collaboratorId: v.optional(v.id("collaborators")),
  },
  handler: async (ctx, { dayStart, dayEnd, customerId, collaboratorId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_userId_and_startTime", (q) =>
        q.eq("userId", ws.effectiveUserId).gte("startTime", dayStart).lt("startTime", dayEnd),
      )
      .take(200);

    let filtered = appointments;
    if (customerId) {
      filtered = filtered.filter((a) => a.customerId === customerId);
    }
    if (collaboratorId) {
      filtered = filtered.filter((a) => a.collaboratorId === collaboratorId);
    }

    // Dedup + parallel-fetch referenced customers/services/collaborators.
    // Previous code did sequential `ctx.db.get` per appointment (3×N reads);
    // this is at most 3×U where U is unique-id count — in practice far fewer.
    const customerIds = [...new Set(filtered.map((a) => a.customerId))];
    const serviceIds = [...new Set(filtered.map((a) => a.serviceId).filter((id): id is NonNullable<typeof id> => !!id))];
    const collaboratorIds = [...new Set(filtered.map((a) => a.collaboratorId).filter((id): id is NonNullable<typeof id> => !!id))];
    const [customers, services, collaborators] = await Promise.all([
      Promise.all(customerIds.map((id) => ctx.db.get(id))),
      Promise.all(serviceIds.map((id) => ctx.db.get(id))),
      Promise.all(collaboratorIds.map((id) => ctx.db.get(id))),
    ]);
    const customerById = new Map(customers.filter((c) => c).map((c) => [c!._id, c!]));
    const serviceById = new Map(services.filter((s) => s).map((s) => [s!._id, s!]));
    const collaboratorById = new Map(collaborators.filter((c) => c).map((c) => [c!._id, c!]));

    return filtered.map((a) => {
      const customer = customerById.get(a.customerId);
      const service = a.serviceId ? serviceById.get(a.serviceId) : null;
      const collaborator = a.collaboratorId ? collaboratorById.get(a.collaboratorId) : null;
      return {
        ...a,
        customerName: customer?.name ?? "",
        customerColor: customer?.color,
        serviceName: service?.name ?? "",
        collaboratorName: collaborator?.name ?? "",
        collaboratorColor: collaborator?.color,
      };
    });
  },
});

export const listDaysWithAppointments = query({
  args: {
    monthStart: v.number(),
    monthEnd: v.number(),
    customerId: v.optional(v.id("customers")),
    collaboratorId: v.optional(v.id("collaborators")),
  },
  handler: async (ctx, { monthStart, monthEnd, customerId, collaboratorId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_userId_and_startTime", (q) =>
        q.eq("userId", ws.effectiveUserId).gte("startTime", monthStart).lt("startTime", monthEnd),
      )
      .take(500);

    let filtered = appointments;
    if (customerId) {
      filtered = filtered.filter((a) => a.customerId === customerId);
    }
    if (collaboratorId) {
      filtered = filtered.filter((a) => a.collaboratorId === collaboratorId);
    }

    return filtered.map((a) => a.startTime);
  },
});

export const getAppointment = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;

    const appointment = await ctx.db.get(appointmentId);
    if (!appointment || appointment.userId !== ws.effectiveUserId) return null;

    const [customer, service, collaborator] = await Promise.all([
      ctx.db.get(appointment.customerId),
      appointment.serviceId ? ctx.db.get(appointment.serviceId) : Promise.resolve(null),
      appointment.collaboratorId ? ctx.db.get(appointment.collaboratorId) : Promise.resolve(null),
    ]);

    return {
      ...appointment,
      customerName: customer?.name ?? "",
      customerColor: customer?.color,
      serviceName: service?.name ?? "",
      collaboratorName: collaborator?.name ?? "",
      collaboratorColor: collaborator?.color,
    };
  },
});

// ─── Internal (for AI agent) ──────────────────────────────────────────────────

export const listAppointmentsInternal = internalQuery({
  args: {
    userId: v.id("users"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    customerId: v.optional(v.id("customers")),
    collaboratorId: v.optional(v.id("collaborators")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { userId, startDate, endDate, customerId, collaboratorId, status }) => {
    let appointments;

    if (startDate !== undefined && endDate !== undefined) {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_userId_and_startTime", (q) =>
          q.eq("userId", userId).gte("startTime", startDate).lt("startTime", endDate),
        )
        .take(200);
    } else {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(50);
    }

    let filtered = appointments;
    if (customerId) {
      filtered = filtered.filter((a) => a.customerId === customerId);
    }
    if (collaboratorId) {
      filtered = filtered.filter((a) => a.collaboratorId === collaboratorId);
    }
    if (status) {
      filtered = filtered.filter((a) => a.status === status);
    }

    const customerIds = [...new Set(filtered.map((a) => a.customerId))];
    const serviceIds = [...new Set(filtered.map((a) => a.serviceId).filter((id): id is NonNullable<typeof id> => !!id))];
    const collaboratorIds = [...new Set(filtered.map((a) => a.collaboratorId).filter((id): id is NonNullable<typeof id> => !!id))];
    const [customers, services, collaborators] = await Promise.all([
      Promise.all(customerIds.map((id) => ctx.db.get(id))),
      Promise.all(serviceIds.map((id) => ctx.db.get(id))),
      Promise.all(collaboratorIds.map((id) => ctx.db.get(id))),
    ]);
    const customerById = new Map(customers.filter((c) => c).map((c) => [c!._id, c!]));
    const serviceById = new Map(services.filter((s) => s).map((s) => [s!._id, s!]));
    const collaboratorById = new Map(collaborators.filter((c) => c).map((c) => [c!._id, c!]));

    return filtered.map((a) => ({
      _id: a._id,
      customerName: customerById.get(a.customerId)?.name ?? "",
      serviceName: a.serviceId ? serviceById.get(a.serviceId)?.name ?? "" : "",
      collaboratorName: a.collaboratorId ? collaboratorById.get(a.collaboratorId)?.name ?? "" : "",
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      title: a.title,
      notes: a.notes,
    }));
  },
});

export const getAppointmentInternal = internalQuery({
  args: {
    userId: v.id("users"),
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, { userId, appointmentId }) => {
    const appointment = await ctx.db.get(appointmentId);
    if (!appointment || appointment.userId !== userId) return null;

    const [customer, service, collaborator] = await Promise.all([
      ctx.db.get(appointment.customerId),
      appointment.serviceId ? ctx.db.get(appointment.serviceId) : Promise.resolve(null),
      appointment.collaboratorId ? ctx.db.get(appointment.collaboratorId) : Promise.resolve(null),
    ]);

    return {
      _id: appointment._id,
      customerId: appointment.customerId,
      serviceId: appointment.serviceId,
      collaboratorId: appointment.collaboratorId,
      customerName: customer?.name ?? "",
      serviceName: service?.name ?? "",
      collaboratorName: collaborator?.name ?? "",
      title: appointment.title,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      notes: appointment.notes,
      createdAt: appointment.createdAt,
    };
  },
});
