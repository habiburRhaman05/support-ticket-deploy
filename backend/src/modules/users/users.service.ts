import crypto from "node:crypto";
import { conflict, notFound } from "../../utils/appError";
import { logAudit } from "../../utils/audit";
import { emailService } from "../../lib/email/email.service";
import { prisma } from "../../utils/prisma";
import { hashPassword } from "../../utils/password";

export class UsersService {
  async listTeamMembers(agencyId: string) {
    const users = await prisma.user.findMany({
      where: { agencyId, role: "TEAM_MEMBER", isDeleted: false },
      orderBy: { name: "asc" },
      include: {
        assignedTickets: {
          where: { stage: { not: "RESOLVED" } },
          select: { id: true, stage: true },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      initials: u.initials,
      skills: u.skills ? u.skills.split(",").filter(Boolean) : [],
      isAvailable: u.isAvailable,
      openTickets: u.assignedTickets.length,
      reviewTickets: u.assignedTickets.filter((t) => t.stage === "REVIEW").length,
      createdAt: u.createdAt,
    }));
  }

  async createTeamMember(agencyId: string, actorId: string, dto: { name: string; email: string; skills: string[] }) {
    const existing = await prisma.user.findFirst({
      where: { email: dto.email, agencyId, isDeleted: false },
    });
    if (existing) {
      throw conflict("A user with this email already exists in this agency");
    }

    // Shown to the owner exactly once — they hand credentials to the member
    // directly (email delivery is a later phase).
    const tempPassword = crypto.randomBytes(8).toString("hex");
    const passwordHash = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        initials: dto.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
        role: "TEAM_MEMBER",
        skills: dto.skills.join(","),
        tempPassword: true,
        agencyId,
      },
    });

    await logAudit({
      agencyId,
      actorId,
      action: "TEAM_MEMBER_CREATED",
      entityType: "User",
      entityId: user.id,
      details: `Team member ${dto.name} (${dto.email}) created`,
    });

    // Email the credentials to the new member (owner also sees them once in the
    // UI as a fallback). Fire-and-forget — creation succeeds regardless.
    const agency = await prisma.agency.findUnique({ where: { id: agencyId }, select: { name: true } });
    void emailService.teamMemberCredentials({
      to: dto.email,
      name: dto.name,
      email: dto.email,
      tempPassword,
      agencyName: agency?.name ?? "your agency",
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      initials: user.initials,
      skills: user.skills,
      tempPassword,
      createdAt: user.createdAt,
    };
  }

  async updateTeamMember(agencyId: string, userId: string, dto: { name?: string; skills?: string[]; isAvailable?: boolean }) {
    const user = await prisma.user.findFirst({
      where: { id: userId, agencyId, role: "TEAM_MEMBER", isDeleted: false },
    });
    if (!user) throw notFound("Team member not found");

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name, initials: dto.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) }),
        ...(dto.skills && { skills: dto.skills.join(",") }),
        ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      initials: updated.initials,
      skills: updated.skills ? updated.skills.split(",").filter(Boolean) : [],
      isAvailable: updated.isAvailable,
    };
  }

  async deleteTeamMember(agencyId: string, actorId: string, userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, agencyId, role: "TEAM_MEMBER", isDeleted: false },
    });
    if (!user) throw notFound("Team member not found");

    // Soft delete keeps historical tickets attributed to the member (product
    // decision in main-goal.md §10); their open work returns to the queue.
    const unassigned = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { isDeleted: true, isAvailable: false },
      });

      const result = await tx.ticket.updateMany({
        where: { assigneeId: userId, stage: { not: "RESOLVED" } },
        data: { assigneeId: null, stage: "NEW" },
      });
      return result.count;
    });

    await logAudit({
      agencyId,
      actorId,
      action: "TEAM_MEMBER_REMOVED",
      entityType: "User",
      entityId: userId,
      details: `Team member ${user.name} removed; ${unassigned} open ticket(s) returned to the unassigned queue`,
    });
  }

  async toggleAvailability(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "TEAM_MEMBER") throw notFound("Team member not found");

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isAvailable: !user.isAvailable },
    });

    return { isAvailable: updated.isAvailable };
  }

  async getStats(userId: string, agencyId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, agencyId, isDeleted: false },
    });
    if (!user) throw notFound("User not found");

    const assignedTickets = await prisma.ticket.findMany({
      where: { assigneeId: userId },
    });

    const totalSolved = assignedTickets.filter((t) => t.stage === "RESOLVED").length;
    const openCount = assignedTickets.filter((t) => t.stage !== "RESOLVED").length;
    const reviewCount = assignedTickets.filter((t) => t.stage === "REVIEW").length;

    return {
      totalAssigned: assignedTickets.length,
      totalSolved,
      openCount,
      reviewCount,
      isAvailable: user.isAvailable,
    };
  }

  async listSubAccounts(agencyId: string) {
    const users = await prisma.user.findMany({
      where: { agencyId, role: "SUB_ACCOUNT", isDeleted: false },
      orderBy: { name: "asc" },
      include: {
        subAccountTickets: {
          where: { stage: { not: "RESOLVED" } },
          select: { id: true },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      initials: u.initials,
      contactEmail: u.contactEmail,
      plan: u.plan,
      locationId: u.locationId,
      openTickets: u.subAccountTickets.length,
      createdAt: u.createdAt,
    }));
  }

  async createSubAccount(agencyId: string, actorId: string, dto: { name: string; locationId: string; contactEmail?: string; plan?: string }) {
    const existing = await prisma.user.findFirst({
      where: { locationId: dto.locationId, agencyId },
    });
    if (existing) {
      throw conflict("A sub-account with this Location ID already exists");
    }

    // Manual creation is an owner-initiated approval: keep the SubAccount
    // access table in sync so the portal flow recognizes this location.
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: dto.name,
          initials: dto.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
          role: "SUB_ACCOUNT",
          locationId: dto.locationId,
          contactEmail: dto.contactEmail,
          plan: dto.plan,
          agencyId,
        },
      });
      await tx.subAccount.upsert({
        where: { agencyId_ghlLocationId: { agencyId, ghlLocationId: dto.locationId } },
        update: { status: "ACTIVE", decidedAt: new Date(), decidedById: actorId, userId: created.id },
        create: {
          agencyId,
          ghlLocationId: dto.locationId,
          name: dto.name,
          contactEmail: dto.contactEmail ?? null,
          status: "ACTIVE",
          decidedAt: new Date(),
          decidedById: actorId,
          userId: created.id,
        },
      });
      return created;
    });

    await logAudit({
      agencyId,
      actorId,
      action: "SUB_ACCOUNT_CREATED_MANUALLY",
      entityType: "SubAccount",
      entityId: user.id,
      details: `Sub-account ${dto.name} (${dto.locationId}) created and activated by owner`,
    });

    return {
      id: user.id,
      name: user.name,
      initials: user.initials,
      locationId: user.locationId,
      contactEmail: user.contactEmail,
      plan: user.plan,
    };
  }

  async listAllTeamStats(agencyId: string) {
    const members = await prisma.user.findMany({
      where: { agencyId, role: "TEAM_MEMBER", isDeleted: false },
      include: {
        assignedTickets: true,
      },
    });

    return members.map((m) => {
      const total = m.assignedTickets.length;
      const solved = m.assignedTickets.filter((t) => t.stage === "RESOLVED").length;
      const review = m.assignedTickets.filter((t) => t.stage === "REVIEW").length;
      const open = m.assignedTickets.filter((t) => t.stage !== "RESOLVED").length;

      return {
        id: m.id,
        name: m.name,
        initials: m.initials,
        skills: m.skills ? m.skills.split(",").filter(Boolean) : [],
        isAvailable: m.isAvailable,
        totalAssigned: total,
        totalSolved: solved,
        openCount: open,
        reviewCount: review,
      };
    });
  }
}

export const usersService = new UsersService();
