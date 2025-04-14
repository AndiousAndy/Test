// This is a mock version of the Prisma client for static builds
export const prisma = {
  user: {
    findUnique: () => Promise.resolve(null),
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
  },
  match: {
    findUnique: () => Promise.resolve(null),
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
  },
  message: {
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
  },
  transaction: {
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
  },
  // Add other models and methods as needed
};

export default prisma;
