import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const roles = [
  { name: 'system_admin', description: 'System administrator' },
  { name: 'admin', description: 'Workspace administrator' },
  { name: 'member', description: 'Default member role' },
  { name: 'editor', description: 'Project editor' },
  { name: 'viewer', description: 'Read-only viewer' },
  { name: 'owner', description: 'Workspace or project owner' },
];

async function main() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  console.log(`Seeded ${roles.length} roles`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
