import { PrismaClient } from '@prisma/client';
import { JwtService } from '../../../src/infrastructure/services/JwtService';

const prisma = new PrismaClient();
const jwtService = new JwtService();

export async function seedMinimal() {
  // clear minimal
  await prisma.attemptAnswer.deleteMany().catch(()=>{});
  await prisma.testAttempt.deleteMany().catch(()=>{});
  await prisma.purchase.deleteMany().catch(()=>{});
  await prisma.examOption.deleteMany().catch(()=>{});
  await prisma.examQuestion.deleteMany().catch(()=>{});
  await prisma.examTest.deleteMany().catch(()=>{});
  await prisma.topic.deleteMany().catch(()=>{});
  await prisma.examType.deleteMany().catch(()=>{});
  await prisma.user.deleteMany().catch(()=>{});

  const educator = await prisma.user.create({ data: { email: 'educator@example.com', username: 'educator', passwordHash: 'x', role: 'EDUCATOR' } });
  const candidate = await prisma.user.create({ data: { email: 'candidate@example.com', username: 'candidate', passwordHash: 'x', role: 'CANDIDATE' } });
  const examType = await prisma.examType.create({ data: { name: 'Sample', slug: 'sample' } });
  const test = await prisma.examTest.create({
    data: {
      title: 'E2E Test',
      examTypeId: examType.id,
      educatorId: educator.id,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      priceCents: 1000,
      questionCount: 1,
      questions: {
        create: [
          {
            id: 'q1',
            content: 'Q1',
            order: 1,
            options: {
              create: [
                { id: 'o1', content: 'A', isCorrect: true },
                { id: 'o2', content: 'B', isCorrect: false },
              ],
            },
          },
        ],
      },
    },
    include: { questions: { include: { options: true } } },
  });
  const candidateToken = jwtService.sign({ sub: candidate.id, email: candidate.email, role: candidate.role });
  return { educator, candidate, test, examType, candidateToken };
}

