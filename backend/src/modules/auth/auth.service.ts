import { ghlClient } from "../../lib/ghl/ghl.client";
import { logAudit } from "../../utils/audit";
import { badRequest, conflict, unauthorized } from "../../utils/appError";
import { encryptSecret } from "../../utils/crypto";
import { prisma } from "../../utils/prisma";
import { hashPassword, verifyPassword } from "../../utils/password";
import { signAccessToken, signRefreshToken, type JwtPayload } from "../../utils/jwt";

export class AuthService {
  /**
   * First-time Agency Owner connect: all four credentials required, the GHL
   * key is validated against the live API BEFORE anything is persisted, then
   * agency + owner are created in one transaction with the key encrypted at
   * rest. Repeat logins use login() with just email + password.
   */
  async connect(dto: { email: string; password: string; agencyName: string; ghlCompanyId: string; ghlApiKey: string }) {
    const existingAgency = await prisma.agency.findUnique({ where: { ghlCompanyId: dto.ghlCompanyId } });
    if (existingAgency) {
      throw conflict("This GHL account is already connected. Please log in with your email and password.", "ALREADY_CONNECTED");
    }
    const existingUser = await prisma.user.findFirst({ where: { email: dto.email, isDeleted: false } });
    if (existingUser) {
      throw conflict("This email is already registered. Please log in instead.", "EMAIL_TAKEN");
    }

    // Validate against GHL first — nothing persists if the key is bad.
    // The token alone proves which agency it belongs to (each returned location
    // carries the real companyId), so we also catch a wrong/mistyped Company ID
    // here — e.g. the X-XXX-XXX "Relationship Number", which is NOT the API
    // Company ID and would otherwise poison every later GHL call.
    const validation = await ghlClient.validateApiKey(dto.ghlApiKey, dto.ghlCompanyId);
    if (!validation.valid) {
      throw unauthorized(validation.reason ?? "GHL rejected the API key.", "GHL_KEY_INVALID");
    }
    let companyId = dto.ghlCompanyId;
    const discovered = await ghlClient.discoverCompanyId(dto.ghlApiKey).catch(() => null);
    if (discovered && discovered !== dto.ghlCompanyId) {
      if (/^\d-\d{3}-\d{3}$/.test(dto.ghlCompanyId.trim())) {
        // Unambiguous relationship-number format — correct it silently.
        companyId = discovered;
      } else {
        throw badRequest(
          `The Company ID you entered does not match this API key's agency. GHL reports your Company ID as "${discovered}" — please use that value (note: the X-XXX-XXX Relationship Number is not the Company ID).`,
          "COMPANY_ID_MISMATCH",
        );
      }
    }
    if (companyId !== dto.ghlCompanyId) {
      const clash = await prisma.agency.findUnique({ where: { ghlCompanyId: companyId } });
      if (clash) {
        throw conflict("This GHL account is already connected. Please log in with your email and password.", "ALREADY_CONNECTED");
      }
    }

    const passwordHash = await hashPassword(dto.password);
    const slugBase = dto.agencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "agency";

    const agency = await prisma.$transaction(async (tx) => {
      return tx.agency.create({
        data: {
          name: dto.agencyName,
          slug: `${slugBase}-${Date.now()}`,
          ghlCompanyId: companyId,
          ghlApiKeyEncrypted: encryptSecret(dto.ghlApiKey),
          connectedAt: new Date(),
          users: {
            create: {
              email: dto.email,
              passwordHash,
              name: dto.agencyName,
              initials: dto.agencyName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
              role: "AGENCY_OWNER",
              locationId: companyId,
            },
          },
        },
        include: { users: true },
      });
    });

    const user = agency.users[0];
    await logAudit({
      agencyId: agency.id,
      actorId: user.id,
      action: "AGENCY_CONNECTED",
      entityType: "Agency",
      entityId: agency.id,
      details: `Agency connected to GHL company ${companyId}`,
    });

    const jwtPayload: JwtPayload = { userId: user.id, role: user.role, agencyId: agency.id };

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        initials: user.initials,
        agencyId: agency.id,
        agencyName: agency.name,
      },
      accessToken: signAccessToken(jwtPayload),
      refreshToken: signRefreshToken(jwtPayload),
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findFirst({
      where: { email, isDeleted: false },
      include: { agency: true },
    });

    if (!user || !user.passwordHash) {
      throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    const jwtPayload: JwtPayload = { userId: user.id, role: user.role, agencyId: user.agencyId };

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        initials: user.initials,
        agencyId: user.agencyId,
        agencyName: user.agency.name,
        tempPassword: user.tempPassword,
        isAvailable: user.isAvailable,
      },
      accessToken: signAccessToken(jwtPayload),
      refreshToken: signRefreshToken(jwtPayload),
    };
  }

  async refreshToken(token: string) {
    const { verifyRefreshToken } = await import("../../utils/jwt");
    const payload = verifyRefreshToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { agency: true },
    });

    if (!user || user.isDeleted) {
      throw new Error("User not found");
    }

    const jwtPayload: JwtPayload = { userId: user.id, role: user.role, agencyId: user.agencyId };

    return {
      accessToken: signAccessToken(jwtPayload),
      refreshToken: signRefreshToken(jwtPayload),
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new Error("User not found");
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new Error("Current password is incorrect");
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tempPassword: false },
    });
  }

  /**
   * First-login password set for a team member who logged in with a temporary
   * password. No current password is required — the JWT from their successful
   * login is proof enough — but the account MUST still be flagged tempPassword,
   * so this can't be used to bypass the normal change-password flow.
   */
  async firstLoginSetPassword(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) throw unauthorized("User not found", "USER_NOT_FOUND");
    if (!user.tempPassword) throw badRequest("Your password has already been set", "PASSWORD_ALREADY_SET");

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tempPassword: false },
    });
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { agency: true },
    });

    if (!user) throw new Error("User not found");

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      initials: user.initials,
      agencyId: user.agencyId,
      agencyName: user.agency.name,
      locationId: user.locationId,
      skills: user.skills,
      isAvailable: user.isAvailable,
      tempPassword: user.tempPassword,
      contactEmail: user.contactEmail,
      plan: user.plan,
    };
  }
}

export const authService = new AuthService();
