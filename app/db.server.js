import { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
    console.log("DB: Prisma client initialized");
  }
}

const prisma = global.prismaGlobal ?? new PrismaClient();

export default prisma;
