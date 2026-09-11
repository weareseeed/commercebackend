import { prisma, printSandboxSeedSummary, resetAndSeedSandbox } from './client';

async function main() {
  console.log('Cleaning up database...');
  console.log('Seeding sandbox fixtures...');
  const result = await resetAndSeedSandbox();
  printSandboxSeedSummary(result);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
