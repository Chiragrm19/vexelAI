import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsageService {
  constructor(private prisma: PrismaService) {}

  async logUsage(data: {
    userId: string;
    providerId: string;
    promptTokens: number;
    responseTokens: number;
    originalPromptTokens?: number;
    cached: boolean;
    compressed: boolean;
    modelUsed: string;
    costUsd: number;
    taskType?: string;
  }) {
    const totalTokens = data.promptTokens + data.responseTokens;

    const log = await this.prisma.usageLog.create({
      data: {
        id: uuidv4(),
        userId: data.userId,
        providerId: data.providerId,
        promptTokens: data.promptTokens,
        responseTokens: data.responseTokens,
        totalTokens,
        originalPromptTokens: data.originalPromptTokens,
        cached: data.cached,
        compressed: data.compressed,
        modelUsed: data.modelUsed,
        costUsd: data.costUsd,
        taskType: data.taskType,
      },
    });

    // Update quota
    await this.prisma.quota.updateMany({
      where: { userId: data.userId },
      data: { tokensUsed: { increment: BigInt(totalTokens) } },
    });

    return log;
  }

  async getUserLogs(userId: string, limit = 50) {
    return this.prisma.usageLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        provider: { select: { name: true } },
      },
    });
  }

  async getUserDailyUsage(userId: string, days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.prisma.usageLog.findMany({
      where: { userId, timestamp: { gte: since } },
      select: { timestamp: true, totalTokens: true, costUsd: true, cached: true },
    });

    const byDay: Record<string, { tokens: number; cost: number; requests: number }> = {};
    for (const log of logs) {
      const day = log.timestamp.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { tokens: 0, cost: 0, requests: 0 };
      byDay[day].tokens += log.totalTokens;
      byDay[day].cost += log.costUsd;
      byDay[day].requests++;
    }

    return Object.entries(byDay).map(([date, data]) => ({ date, ...data }));
  }

  async getUserSavings(userId: string) {
    const [cached, compressed] = await Promise.all([
      this.prisma.usageLog.aggregate({
        where: { userId, cached: true },
        _sum: { totalTokens: true },
        _count: { id: true },
      }),
      this.prisma.usageLog.aggregate({
        where: { userId, compressed: true },
        _sum: { originalPromptTokens: true, promptTokens: true },
      }),
    ]);

    const savedFromCaching = Number(cached._sum.totalTokens || 0);
    const savedFromCompression =
      Number(compressed._sum.originalPromptTokens || 0) -
      Number(compressed._sum.promptTokens || 0);

    return {
      cacheHits: cached._count.id,
      savedFromCaching,
      savedFromCompression,
      totalSaved: savedFromCaching + savedFromCompression,
    };
  }

  async getTopUsers(teamId: string, limit = 10) {
    const result = await this.prisma.usageLog.groupBy({
      by: ['userId'],
      where: { user: { teamId } },
      _sum: { totalTokens: true, costUsd: true },
      _count: { id: true },
      orderBy: { _sum: { totalTokens: 'desc' } },
      take: limit,
    });

    const users = await Promise.all(
      result.map(async (r) => {
        const user = await this.prisma.user.findUnique({
          where: { id: r.userId },
          select: { name: true, email: true, jobRole: true },
        });
        return {
          userId: r.userId,
          user,
          totalTokens: Number(r._sum.totalTokens || 0),
          totalCost: r._sum.costUsd || 0,
          requests: r._count.id,
        };
      }),
    );
    return users;
  }

  /** Forecast month-end spend based on current usage rate */
  async forecastMonthEnd(teamId: string) {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const stats = await this.prisma.usageLog.aggregate({
      where: { user: { teamId }, timestamp: { gte: monthStart } },
      _sum: { totalTokens: true, costUsd: true },
    });

    const currentTokens = Number(stats._sum.totalTokens || 0);
    const currentCost = stats._sum.costUsd || 0;
    const dailyRate = currentTokens / dayOfMonth;
    const projectedTokens = Math.round(dailyRate * daysInMonth);
    const projectedCost = (currentCost / dayOfMonth) * daysInMonth;

    return {
      currentTokens,
      currentCost,
      projectedTokens,
      projectedCost,
      dayOfMonth,
      daysInMonth,
      percentOfMonthElapsed: Math.round((dayOfMonth / daysInMonth) * 100),
    };
  }
}
