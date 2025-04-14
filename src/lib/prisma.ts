import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Determine if we're building for static export
const isStaticExport = process.env.NODE_ENV === 'production' && process.env.NEXT_STATIC_BUILD === 'true';

let prismaClient: any;

// Use conditional logic to determine which client to use
if (typeof window !== 'undefined' || isStaticExport) {
  // We're in the browser or building for static export
  // Use the mock client - import in a way that doesn't require top-level await
  // @ts-ignore - Importing from a different path during static builds
  prismaClient = require('./prisma-mock').default;
} else {
  // Server-side and not building for static export
  // Use the real Prisma client
  prismaClient = globalForPrisma.prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient;
}

export const prisma = prismaClient;
export default prisma;
