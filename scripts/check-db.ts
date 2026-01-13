import { prisma } from '../src/lib/db';

async function check() {
  const tariffs = await prisma.tariffRule.count();
  const docs = await prisma.knowledgeDocument.count();
  const chunks = await prisma.knowledgeChunk.count();

  console.log('Database contents:');
  console.log('- Tariff Rules:', tariffs);
  console.log('- Knowledge Documents:', docs);
  console.log('- Knowledge Chunks:', chunks);

  if (tariffs > 0) {
    const t = await prisma.tariffRule.findMany({ take: 5 });
    console.log('\nSample tariff rules:', JSON.stringify(t, null, 2));
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
