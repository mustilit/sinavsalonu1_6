import { prisma } from '../../infrastructure/database/prisma';

export class GetLiveSessionComparisonUseCase {
  async execute(sessionId: string, educatorId: string) {
    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: { orderBy: { order: 'asc' } },
            answers: { include: { option: true } },
          },
        },
        participants: {
          include: {
            user: { select: { id: true, username: true, email: true } },
            answers: { include: { option: true } },
          },
        },
      },
    });

    if (!session) {
      throw Object.assign(new Error('Oturum bulunamadi'), { status: 404 });
    }
    if (session.educatorId !== educatorId) {
      throw Object.assign(new Error('Yetki yok'), { status: 403 });
    }

    // Build leaderboard
    const leaderboard = session.participants.map((p) => {
      const correctCount = p.answers.filter((a) => a.option?.isCorrect === true).length;
      return {
        userId: p.userId,
        username: p.user.username,
        email: p.user.email,
        correctCount,
        totalAnswered: p.answers.length,
        totalQuestions: session.questions.length,
        score: session.questions.length > 0
          ? Math.round((correctCount / session.questions.length) * 100)
          : 0,
      };
    }).sort((a, b) => b.correctCount - a.correctCount);

    // Per question stats
    const questionStats = session.questions.map((q) => {
      const optionStats = q.options.map((o) => ({
        optionId: o.id,
        content: o.content,
        isCorrect: o.isCorrect,
        count: q.answers.filter((a) => a.optionId === o.id).length,
      }));
      const totalAnswers = q.answers.length;
      return {
        questionId: q.id,
        content: q.content,
        order: q.order,
        totalAnswers,
        optionStats,
      };
    });

    // Round 2 comparison if parent exists
    let round1Stats = null;
    if (session.roundNumber === 2 && session.parentSessionId) {
      const parent = await prisma.liveSession.findUnique({
        where: { id: session.parentSessionId },
        include: {
          participants: {
            include: {
              answers: { include: { option: true } },
            },
          },
          questions: { select: { id: true } },
        },
      });
      if (parent) {
        round1Stats = parent.participants.map((p) => {
          const correct = p.answers.filter((a) => a.option?.isCorrect === true).length;
          return {
            userId: p.userId,
            correct,
            total: parent.questions.length,
          };
        });
      }
    }

    return {
      sessionId: session.id,
      title: session.title,
      roundNumber: session.roundNumber,
      participantCount: session.participants.length,
      leaderboard,
      questionStats,
      round1Stats,
    };
  }
}
