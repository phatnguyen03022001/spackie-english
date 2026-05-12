// prisma/seed.ts
// Seed script for Spackie Backend
// Run: npx ts-node prisma/seed.ts
// Or via package.json: npm run seed

import { PrismaClient, Role, DeckVisibility } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Admin user ──────────────────────────────────────────────
  const adminEmail = 'admin@spackie.com';
  const adminUsername = 'admin';
  const adminPassword = 'Admin@123456';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  let adminId: string;
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        passwordHash: hashedPassword,
        displayName: 'Admin',
        role: Role.ADMIN,
        isActive: true,
        isVerified: true,
        isBanned: false,
        totalCardsLearned: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
    });
    adminId = admin.id;
    console.log(`✅ Admin user created: ${adminEmail} / ${adminPassword}`);
  } else {
    adminId = existingAdmin.id;
    console.log(`⏭️  Admin user already exists: ${adminEmail}`);
  }

  // ── Demo user ───────────────────────────────────────────────
  const demoEmail = 'demo@spackie.com';
  const demoUsername = 'demo';
  const demoPassword = 'Demo@123456';

  const existingDemo = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  let demoUserId: string;
  if (!existingDemo) {
    const hashedPassword = await bcrypt.hash(demoPassword, 10);
    const demoUser = await prisma.user.create({
      data: {
        email: demoEmail,
        username: demoUsername,
        passwordHash: hashedPassword,
        displayName: 'Demo User',
        role: Role.USER,
        isActive: true,
        isVerified: true,
        isBanned: false,
        totalCardsLearned: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
    });
    demoUserId = demoUser.id;
    console.log(`✅ Demo user created: ${demoEmail} / ${demoPassword}`);
  } else {
    demoUserId = existingDemo.id;
    console.log(`⏭️  Demo user already exists: ${demoEmail}`);
  }

  // ── Sample decks ────────────────────────────────────────────
  const decks = [
    {
      title: 'English Vocabulary - Basic',
      description: 'Common English words for beginners',
      userId: adminId,
      visibility: DeckVisibility.PUBLIC,
    },
    {
      title: 'English Vocabulary - Intermediate',
      description: 'Intermediate level English vocabulary',
      userId: adminId,
      visibility: DeckVisibility.PUBLIC,
    },
    {
      title: 'TOEIC Preparation',
      description: 'Essential vocabulary for TOEIC exam',
      userId: adminId,
      visibility: DeckVisibility.PUBLIC,
    },
  ];

  for (const deckData of decks) {
    const existingDeck = await prisma.deck.findFirst({
      where: { title: deckData.title, userId: deckData.userId },
    });

    if (!existingDeck) {
      await prisma.deck.create({ data: deckData });
      console.log(`✅ Deck created: ${deckData.title}`);
    } else {
      console.log(`⏭️  Deck already exists: ${deckData.title}`);
    }
  }

  // ── Sample global cards + deck mappings ─────────────────────
  const basicDeck = await prisma.deck.findFirst({
    where: { userId: adminId, title: 'English Vocabulary - Basic' },
  });

  if (basicDeck) {
    const existingMappings = await prisma.deckCardMapping.count({
      where: { deckId: basicDeck.id },
    });

    if (existingMappings === 0) {
      const sampleCards = [
        { front: 'Hello', back: 'Xin chào' },
        { front: 'Goodbye', back: 'Tạm biệt' },
        { front: 'Thank you', back: 'Cảm ơn bạn' },
        { front: 'Please', back: 'Làm ơn / Vui lòng' },
        { front: 'Sorry', back: 'Xin lỗi' },
      ];

      for (let i = 0; i < sampleCards.length; i++) {
        const card = sampleCards[i];

        // Create or reuse GlobalCard
        let globalCard = await prisma.globalCard.findUnique({
          where: { front: card.front },
        });

        if (!globalCard) {
          globalCard = await prisma.globalCard.create({
            data: {
              front: card.front,
              back: card.back,
              status: 'completed',
              validated: true,
              valid: true,
              extras: {
                examples: [
                  card.front === 'Hello'
                    ? 'Hello, how are you?'
                    : card.front === 'Goodbye'
                      ? 'Goodbye, see you tomorrow!'
                      : card.front === 'Thank you'
                        ? 'Thank you for your help.'
                        : card.front === 'Please'
                          ? 'Please sit down.'
                          : "I'm sorry for being late.",
                ],
              },
            },
          });
        }

        // Create mapping
        await prisma.deckCardMapping.create({
          data: {
            deckId: basicDeck.id,
            globalCardId: globalCard.id,
            sortOrder: i,
          },
        });
      }

      // Update deck totalCards
      await prisma.deck.update({
        where: { id: basicDeck.id },
        data: { totalCards: sampleCards.length },
      });

      console.log(`✅ ${sampleCards.length} sample cards created and mapped`);
    } else {
      console.log(`⏭️  Cards already exist for deck: ${basicDeck.title}`);
    }
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
