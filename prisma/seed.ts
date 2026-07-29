import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

/**
 * Idempotent development seed. Bootstraps:
 *  - the admin account (from ADMIN_EMAIL / ADMIN_PASSWORD)
 *  - a starter set of dynamic metadata definitions (SRS FR-3)
 *  - one example membership plan (SRS FR-7)
 *
 * Run with: npm run db:seed
 */
const prisma = new PrismaClient();

const METADATA_FIELDS: {
  name: string;
  key: string;
  type: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";
  displayOrder: number;
}[] = [
  { name: "Author", key: "author", type: "TEXT", displayOrder: 1 },
  { name: "Genre", key: "genre", type: "TEXT", displayOrder: 2 },
  { name: "Pages", key: "pages", type: "NUMBER", displayOrder: 3 },
  { name: "Language", key: "language", type: "TEXT", displayOrder: 4 },
  { name: "Reading Time", key: "reading_time", type: "TEXT", displayOrder: 5 },
  { name: "Edition", key: "edition", type: "TEXT", displayOrder: 6 },
  { name: "ISBN", key: "isbn", type: "TEXT", displayOrder: 7 },
  { name: "Publisher", key: "publisher", type: "TEXT", displayOrder: 8 },
  { name: "Release Year", key: "release_year", type: "NUMBER", displayOrder: 9 },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@scriptory.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe-Admin-123456";

  const passwordHash = await hash(adminPassword, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "Administrator",
      role: "ADMIN",
      passwordHash,
      emailVerified: new Date(),
    },
  });
  console.info(`✓ admin: ${admin.email}`);

  for (const f of METADATA_FIELDS) {
    await prisma.metadataDefinition.upsert({
      where: { key: f.key },
      update: { name: f.name, type: f.type, displayOrder: f.displayOrder },
      create: f,
    });
  }
  console.info(`✓ metadata definitions: ${METADATA_FIELDS.length}`);

  await prisma.membership.upsert({
    where: { slug: "premium-reader" },
    update: {},
    create: {
      name: "Premium Reader",
      slug: "premium-reader",
      price: 2900,
      currency: "INR",
      durationDays: 365,
      benefits: [
        "Access member-only titles",
        "Member discounts at checkout",
        "Early access to new releases",
      ].join("\n"),
      active: true,
    },
  });
  console.info("✓ membership plan: Premium Reader");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
