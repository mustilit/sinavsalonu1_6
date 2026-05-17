import { prisma } from '../../infrastructure/database/prisma';

export class GetLiveSessionByCodeUseCase {
  async execute(code: string) {
    const session = await prisma.liveSession.findUnique({
      where: { joinCode: code.toUpperCase() },
      select: {
        id: true,
        title: true,
        status: true,
        joinCode: true,
        maxParticipants: true,
        roundNumber: true,
        educator: { select: { id: true, username: true } },
        _count: { select: { questions: true, participants: true } },
      },
    });
    if (!session) {
      throw Object.assign(new Error('Oturum bulunamadi'), { status: 404 });
    }
    return session;
  }
}
