import { ghlClient } from "../../lib/ghl/ghl.client";
import { badRequest, notFound } from "../../utils/appError";
import { logAudit } from "../../utils/audit";
import { decryptSecret } from "../../utils/crypto";
import { prisma } from "../../utils/prisma";

export class SubAccountsService {
  async listRequests(agencyId: string) {
    return prisma.subAccount.findMany({
      where: { agencyId, status: "PENDING" },
      orderBy: { requestedAt: "asc" },
      select: { id: true, ghlLocationId: true, name: true, contactEmail: true, status: true, requestedAt: true },
    });
  }

  async listAll(agencyId: string) {
    return prisma.subAccount.findMany({
      where: { agencyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ghlLocationId: true,
        name: true,
        contactEmail: true,
        status: true,
        requestedAt: true,
        decidedAt: true,
        rejectionComment: true,
        decidedBy: { select: { name: true } },
      },
    });
  }

  async approve(agencyId: string, actorId: string, subAccountId: string) {
    const subAccount = await prisma.subAccount.findFirst({ where: { id: subAccountId, agencyId } });
    if (!subAccount) throw notFound("Sub-account request not found");
    if (subAccount.status === "ACTIVE") return subAccount; // idempotent

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.subAccount.update({
        where: { id: subAccountId },
        data: { status: "ACTIVE", decidedAt: new Date(), decidedById: actorId, rejectionComment: null },
      });
      // Notification stub for the sub-account (email delivery comes later);
      // only possible once a user identity exists (created on first portal entry).
      if (row.userId) {
        await tx.notification.create({
          data: {
            userId: row.userId,
            type: "ACCESS_APPROVED",
            title: "Access approved",
            message: "Your support portal access has been approved.",
          },
        });
      }
      return row;
    });

    await logAudit({
      agencyId,
      actorId,
      action: "SUB_ACCOUNT_APPROVED",
      entityType: "SubAccount",
      entityId: subAccountId,
      details: `Approved portal access for ${subAccount.name} (${subAccount.ghlLocationId})`,
    });
    return updated;
  }

  async reject(agencyId: string, actorId: string, subAccountId: string, comment?: string) {
    const subAccount = await prisma.subAccount.findFirst({ where: { id: subAccountId, agencyId } });
    if (!subAccount) throw notFound("Sub-account request not found");
    if (subAccount.status === "REJECTED") return subAccount; // idempotent

    const updated = await prisma.subAccount.update({
      where: { id: subAccountId },
      data: { status: "REJECTED", decidedAt: new Date(), decidedById: actorId, rejectionComment: comment ?? null },
    });

    await logAudit({
      agencyId,
      actorId,
      action: "SUB_ACCOUNT_REJECTED",
      entityType: "SubAccount",
      entityId: subAccountId,
      details: `Rejected portal access for ${subAccount.name} (${subAccount.ghlLocationId})${comment ? ` — ${comment}` : ""}`,
    });
    return updated;
  }

  /**
   * One-time onboarding: fetch every location currently under the agency in
   * GHL and activate it directly, skipping the pending queue. Existing rows
   * are upgraded (pending → active); rejected rows are left untouched so a
   * deliberate rejection isn't silently reversed.
   */
  async bulkApprove(agencyId: string, actorId: string) {
    const agency = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } });
    if (!agency.ghlCompanyId || !agency.ghlApiKeyEncrypted) {
      throw badRequest("Agency is not connected to GHL", "NOT_CONNECTED");
    }

    const apiKey = decryptSecret(agency.ghlApiKeyEncrypted);
    const locations = await ghlClient.listAllLocations(apiKey, agency.ghlCompanyId);

    let activated = 0;
    let skipped = 0;
    for (const location of locations) {
      if (!location.id) continue;
      const existing = await prisma.subAccount.findUnique({
        where: { agencyId_ghlLocationId: { agencyId, ghlLocationId: location.id } },
      });
      if (existing?.status === "REJECTED" || existing?.status === "ACTIVE") {
        skipped++;
        continue;
      }
      if (existing) {
        await prisma.subAccount.update({
          where: { id: existing.id },
          data: { status: "ACTIVE", decidedAt: new Date(), decidedById: actorId },
        });
      } else {
        await prisma.subAccount.create({
          data: {
            agencyId,
            ghlLocationId: location.id,
            name: location.name || location.id,
            contactEmail: location.email ?? null,
            status: "ACTIVE",
            decidedAt: new Date(),
            decidedById: actorId,
          },
        });
      }
      activated++;
    }

    await logAudit({
      agencyId,
      actorId,
      action: "SUB_ACCOUNTS_BULK_APPROVED",
      entityType: "Agency",
      entityId: agencyId,
      details: `Bulk-approved ${activated} location(s) from GHL (${skipped} already decided, ${locations.length} total in GHL)`,
    });

    return { totalInGhl: locations.length, activated, skipped };
  }
}

export const subAccountsService = new SubAccountsService();
