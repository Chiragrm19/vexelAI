import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async getTeam(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { quota: true },
          where: { role: 'EMPLOYEE' },
        },
        providers: { where: { isActive: true } },
      },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async getTeamStats(teamId: string) {
    const [members, quotas, logs] = await Promise.all([
      this.prisma.user.count({ where: { teamId, role: 'EMPLOYEE' } }),
      this.prisma.quota.aggregate({
        where: { teamId },
        _sum: { tokensAllocated: true, tokensUsed: true },
      }),
      this.prisma.usageLog.aggregate({
        where: { user: { teamId } },
        _sum: { costUsd: true, totalTokens: true },
        _count: { id: true },
      }),
    ]);

    const allocated = Number(quotas._sum.tokensAllocated || 0);
    const used = Number(quotas._sum.tokensUsed || 0);
    const remaining = allocated - used;
    const percentUsed = allocated > 0 ? Math.round((used / allocated) * 100) : 0;

    // Cost savings from caching and compression
    const cachedLogs = await this.prisma.usageLog.aggregate({
      where: { user: { teamId }, cached: true },
      _sum: { totalTokens: true },
      _count: { id: true },
    });

    const compressedLogs = await this.prisma.usageLog.aggregate({
      where: { user: { teamId }, compressed: true },
      _sum: { originalPromptTokens: true, promptTokens: true },
    });

    const tokensSavedCaching = Number(cachedLogs._sum.totalTokens || 0);
    const tokensSavedCompression =
      Number(compressedLogs._sum.originalPromptTokens || 0) -
      Number(compressedLogs._sum.promptTokens || 0);

    return {
      memberCount: members,
      tokensAllocated: allocated,
      tokensUsed: used,
      tokensRemaining: remaining,
      percentUsed,
      totalCostUsd: logs._sum.costUsd || 0,
      totalRequests: logs._count.id,
      savings: {
        tokensSavedCaching,
        tokensSavedCompression,
        totalTokensSaved: tokensSavedCaching + tokensSavedCompression,
      },
    };
  }

  async getMembersWithUsage(teamId: string) {
    const members = await this.prisma.user.findMany({
      where: { teamId, role: 'EMPLOYEE' },
      include: {
        quota: true,
        usageLogs: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
    });

    return members.map((m) => {
      const allocated = Number(m.quota?.tokensAllocated || 0);
      const used = Number(m.quota?.tokensUsed || 0);
      const percent = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
      const status =
        percent >= 100 ? 'blocked' : percent >= 80 ? 'warning' : 'healthy';

      return {
        id: m.id,
        name: m.name,
        email: m.email,
        jobRole: m.jobRole,
        quota: {
          allocated,
          used,
          remaining: allocated - used,
          percent,
          status,
          hardLimit: m.quota?.hardLimit,
          softLimitThreshold: m.quota?.softLimitThreshold,
        },
        recentActivity: m.usageLogs,
      };
    });
  }

  async getUsageTrends(teamId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.prisma.usageLog.findMany({
      where: {
        user: { teamId },
        timestamp: { gte: since },
      },
      select: {
        timestamp: true,
        totalTokens: true,
        costUsd: true,
        cached: true,
        compressed: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group by day
    const byDay: Record<string, { tokens: number; cost: number; requests: number }> = {};
    for (const log of logs) {
      const day = log.timestamp.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { tokens: 0, cost: 0, requests: 0 };
      byDay[day].tokens += log.totalTokens;
      byDay[day].cost += log.costUsd;
      byDay[day].requests += 1;
    }

    return Object.entries(byDay).map(([date, data]) => ({ date, ...data }));
  }
}
