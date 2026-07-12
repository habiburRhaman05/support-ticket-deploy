import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 12);

  const agency = await prisma.agency.upsert({
    where: { slug: "demo-agency" },
    update: {},
    create: {
      name: "Demo Agency",
      slug: "demo-agency",
    },
  });

  console.log("Created agency:", agency.id);

  const admin = await prisma.user.upsert({
    where: { email_agencyId: { email: "admin@demo.com", agencyId: agency.id } },
    update: {},
    create: {
      email: "admin@demo.com",
      passwordHash,
      name: "Priya Nair",
      initials: "PN",
      role: "AGENCY_OWNER",
      locationId: "agency-loc-001",
      agencyId: agency.id,
    },
  });

  const team1 = await prisma.user.upsert({
    where: { email_agencyId: { email: "sam@demo.com", agencyId: agency.id } },
    update: {},
    create: {
      email: "sam@demo.com",
      passwordHash,
      name: "Sam Ortiz",
      initials: "SO",
      role: "TEAM_MEMBER",
      skills: "billing,bug",
      isAvailable: true,
      tempPassword: false,
      agencyId: agency.id,
    },
  });

  const team2 = await prisma.user.upsert({
    where: { email_agencyId: { email: "kai@demo.com", agencyId: agency.id } },
    update: {},
    create: {
      email: "kai@demo.com",
      passwordHash,
      name: "Kai Chen",
      initials: "KC",
      role: "TEAM_MEMBER",
      skills: "auth,bug",
      isAvailable: true,
      tempPassword: false,
      agencyId: agency.id,
    },
  });

  const team3 = await prisma.user.upsert({
    where: { email_agencyId: { email: "dana@demo.com", agencyId: agency.id } },
    update: {},
    create: {
      email: "dana@demo.com",
      passwordHash,
      name: "Dana Wells",
      initials: "DW",
      role: "TEAM_MEMBER",
      skills: "onboarding",
      isAvailable: false,
      tempPassword: false,
      agencyId: agency.id,
    },
  });

  const sub1 = await prisma.user.upsert({
    where: { email_agencyId: { email: "northwind@demo.com", agencyId: agency.id } },
    update: {},
    create: {
      name: "Northwind Retail",
      initials: "NR",
      role: "SUB_ACCOUNT",
      locationId: "loc-northwind-001",
      contactEmail: "ops@northwind.example",
      plan: "Growth",
      agencyId: agency.id,
    },
  });

  const sub2 = await prisma.user.upsert({
    where: { email_agencyId: { email: "blueharbor@demo.com", agencyId: agency.id } },
    update: {},
    create: {
      name: "Blue Harbor Co.",
      initials: "BH",
      role: "SUB_ACCOUNT",
      locationId: "loc-blueharbor-002",
      contactEmail: "hello@blueharbor.example",
      plan: "Starter",
      agencyId: agency.id,
    },
  });

  const sub3 = await prisma.user.upsert({
    where: { email_agencyId: { email: "fenwick@demo.com", agencyId: agency.id } },
    update: {},
    create: {
      name: "Fenwick Studio",
      initials: "FS",
      role: "SUB_ACCOUNT",
      locationId: "loc-fenwick-003",
      contactEmail: "team@fenwick.example",
      plan: "Growth",
      agencyId: agency.id,
    },
  });

  // Approval records for the demo sub-accounts (all pre-approved so demo
  // tickets remain reachable; real pending requests arrive via /portal)
  for (const [user, locId] of [
    [sub1, "loc-northwind-001"],
    [sub2, "loc-blueharbor-002"],
    [sub3, "loc-fenwick-003"],
  ] as const) {
    await prisma.subAccount.upsert({
      where: { agencyId_ghlLocationId: { agencyId: agency.id, ghlLocationId: locId } },
      update: {},
      create: {
        agencyId: agency.id,
        ghlLocationId: locId,
        name: user.name,
        contactEmail: user.contactEmail,
        status: "ACTIVE",
        decidedAt: new Date(),
        decidedById: admin.id,
        userId: user.id,
      },
    });
  }

  // Create sample tickets
  await prisma.ticket.create({
    data: {
      displayId: 1,
      subject: "Checkout button unresponsive on mobile",
      description: "Customers report the checkout CTA does nothing on iOS Safari.",
      priority: "URGENT",
      category: "bug",
      stage: "WORKING",
      assigneeId: team1.id,
      subAccountId: sub1.id,
      agencyId: agency.id,
      history: {
        create: [
          { stage: "NEW", actorId: sub1.id, comment: "Ticket submitted.", wasEmailed: false },
          { stage: "ACCEPTED", actorId: admin.id, comment: "This has been acknowledged and queued for work.", wasEmailed: true },
          { stage: "WORKING", actorId: team1.id, comment: "We're actively working on your bug issue.", wasEmailed: true },
        ],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      displayId: 2,
      subject: "Can't reset password",
      description: "Reset email never arrives, checked spam folder.",
      priority: "HIGH",
      category: "auth",
      stage: "REVIEW",
      assigneeId: team2.id,
      subAccountId: sub2.id,
      agencyId: agency.id,
      history: {
        create: [
          { stage: "NEW", actorId: sub2.id, comment: "Ticket submitted.", wasEmailed: false },
          { stage: "ACCEPTED", actorId: admin.id, comment: "This has been acknowledged and queued for work.", wasEmailed: true },
          { stage: "WORKING", actorId: team2.id, comment: "We're actively working on your auth issue.", wasEmailed: true },
          { stage: "REVIEW", actorId: team2.id, comment: "Root cause was a bounced sender domain — reset emails now deliver. Ready for sign-off.", wasEmailed: false },
        ],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      displayId: 3,
      subject: "Invoice shows wrong tax rate",
      description: "November invoice applied the wrong regional tax rate.",
      priority: "MEDIUM",
      category: "billing",
      stage: "PENDING",
      assigneeId: team1.id,
      subAccountId: sub3.id,
      agencyId: agency.id,
      history: {
        create: [
          { stage: "NEW", actorId: sub3.id, comment: "Ticket submitted.", wasEmailed: false },
          { stage: "ACCEPTED", actorId: admin.id, comment: "This has been acknowledged and queued for work.", wasEmailed: true },
          { stage: "WORKING", actorId: team1.id, comment: "We're actively working on your billing issue.", wasEmailed: true },
          { stage: "PENDING", actorId: team1.id, comment: "Could you confirm your billing region so we can correct the rate?", wasEmailed: true },
        ],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      displayId: 4,
      subject: "Onboarding checklist stuck at step 3",
      description: "New team member can't progress past the workspace step.",
      priority: "MEDIUM",
      category: "onboarding",
      stage: "NEW",
      assigneeId: null,
      subAccountId: sub1.id,
      agencyId: agency.id,
      history: {
        create: [
          { stage: "NEW", actorId: sub1.id, comment: "Ticket submitted.", wasEmailed: false },
        ],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      displayId: 5,
      subject: "Feature request: dark mode",
      description: "Would love a dark theme option for the dashboard.",
      priority: "LOW",
      category: "feature",
      stage: "NEW",
      assigneeId: null,
      subAccountId: sub2.id,
      agencyId: agency.id,
      history: {
        create: [
          { stage: "NEW", actorId: sub2.id, comment: "Ticket submitted.", wasEmailed: false },
        ],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      displayId: 6,
      subject: "Export to CSV missing columns",
      description: 'The exported CSV is missing the "priority" column.',
      priority: "HIGH",
      category: "bug",
      stage: "ACCEPTED",
      assigneeId: team2.id,
      subAccountId: sub3.id,
      agencyId: agency.id,
      history: {
        create: [
          { stage: "NEW", actorId: sub3.id, comment: "Ticket submitted.", wasEmailed: false },
          { stage: "ACCEPTED", actorId: admin.id, comment: "This has been acknowledged and queued for work.", wasEmailed: true },
        ],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      displayId: 7,
      subject: "Duplicate charge on card",
      description: "Charged twice for the same monthly plan.",
      priority: "URGENT",
      category: "billing",
      stage: "RESOLVED",
      assigneeId: team1.id,
      subAccountId: sub1.id,
      agencyId: agency.id,
      history: {
        create: [
          { stage: "NEW", actorId: sub1.id, comment: "Ticket submitted.", wasEmailed: false },
          { stage: "ACCEPTED", actorId: admin.id, comment: "This has been acknowledged and queued for work.", wasEmailed: true },
          { stage: "WORKING", actorId: team1.id, comment: "We're actively working on your billing issue.", wasEmailed: true },
          { stage: "REVIEW", actorId: team1.id, comment: "Duplicate charge refunded, confirmation sent to billing contact.", wasEmailed: false },
          { stage: "RESOLVED", actorId: admin.id, comment: "Approved — refund verified in the ledger.", wasEmailed: true },
        ],
      },
    },
  });

  console.log("Seed complete!");
  console.log("");
  console.log("Demo accounts (password: password123):");
  console.log("  Owner:  admin@demo.com");
  console.log("  Team:   sam@demo.com");
  console.log("  Team:   kai@demo.com");
  console.log("  Team:   dana@demo.com");
  console.log("");
  console.log("Sub-Account login (Location IDs):");
  console.log("  Northwind Retail:  loc-northwind-001");
  console.log("  Blue Harbor Co.:   loc-blueharbor-002");
  console.log("  Fenwick Studio:    loc-fenwick-003");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
