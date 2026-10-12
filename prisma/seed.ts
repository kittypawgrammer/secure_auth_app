
import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../lib/db/prisma";

async function main() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  // Make sure the required environment variables exist.
  if (!name || !email || !password) {
    throw new Error(
      "Please set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in your .env file."
    );
  }

  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error(
      "ADMIN_PASSWORD must be at least 12 characters and at most 72 UTF-8 bytes."
    );
  }

  // Check whether this email already exists.
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(
      "An account with this email already exists. No changes were made."
    );
    return;
  }

  // Hash the password before saving it.
  const passwordHash = await bcrypt.hash(password, 12);

  // Create the first approved admin account.
  await prisma.user.create({
    data: {
      name,
      email,
      password_hash: passwordHash,
      is_admin: true,
      status: "APPROVED",
    },
  });

  console.log("Initial admin account created successfully.");
}

main()
  .catch((error: unknown) => {
    console.error("Admin seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
