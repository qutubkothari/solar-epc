import { db } from "@/lib/db";

const SYSTEM_USER_EMAIL = "system@solar-epc.local";

export const getSystemUser = async () => {
  const existing = await db.user.findUnique({
    where: { email: SYSTEM_USER_EMAIL },
  });

  if (existing) return existing;

  return db.user.create({
    data: {
      email: SYSTEM_USER_EMAIL,
      name: "System Admin",
      role: "ADMIN",
    },
  });
};
