import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class QuotasService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async allocateQuota(
    userId: string,
    tokensAllocated: number,
    options?: { hardLimit?: boolean; softLimitThreshold?: number },
  ) {
    const quota = await this.prisma.quota.upsert({
      where: { userId },
      update: {
        tokensAllocated: BigInt(tokensAllocated),
        hardLimit: options?.hardLimit ?? true,
        softLimitThreshold: options?.softLimitThreshold ?? 80,
      },
      create: {
        id: require('uuid').v4(),
        userId,
        teamId: (await this.prisma.user.findUnique({ where: { id: userId } }))!.teamId!,
        tokensAllocated: BigInt(tokensAllocated),
        tokensUsed: BigInt(0),
        hardLimit: options?.hardLimit ?? true,
        softLimitThreshold: options?.softLimitThreshold ?? 80,
      },
    });

    // Sync remaining tokens to Redis
    const remaining = Number(quota.tokensAllocated) - Number(quota.tokensUsed);
    await this.redis.setQuota(userId, Math.max(0, remaining));

    return {
      userId,
      tokensAllocated: Number(quota.tokensAllocated),
      tokensUsed: Number(quota.tokensUsed),
      tokensRemaining: remaining,
      hardLimit: quota.hardLimit,
      softLimitThreshold: quota.softLimitThreshold,
    };
  }

  async getUserQuota(userId: string) {
    const quota = await this.prisma.quota.findUnique({ where: { userId } });
    if (!quota) throw new NotFoundException('Quota not found');

    const allocated = Number(quota.tokensAllocated);
    const used = Number(quota.tokensUsed);
    const remaining = await this.redis.getQuota(userId);
    const percent = allocated > 0 ? Math.round((used / allocated) * 100) : 0;

    return {
      allocated,
      used,
      remaining,
      percent,
      hardLimit: quota.hardLimit,
      softLimitThreshold: quota.softLimitThreshold,
      status: percent >= 100 ? 'blocked' : percent >= quota.softLimitThreshold ? 'warning' : 'healthy',
    };
  }

  /** Called by gateway after each AI request */
  async recordUsage(userId: string, tokensUsed: number) {
    // Increment in Postgres
    await this.prisma.quota.update({
      where: { userId },
      data: { tokensUsed: { increment: BigInt(tokensUsed) } },
    });

    // Decrement in Redis (real-time)
    await this.redis.deductTokens(userId, tokensUsed);
  }

  async getTeamQuotaSummary(teamId: string) {
    const quotas = await this.prisma.quota.findMany({
      where: { teamId },
      include: { user: { select: { name: true, email: true, jobRole: true } } },
    });

    return quotas.map((q) => {
      const allocated = Number(q.tokensAllocated);
      const used = Number(q.tokensUsed);
      const percent = allocated > 0 ? Math.round((used / allocated) * 100) : 0;
      return {
        userId: q.userId,
        user: q.user,
        allocated,
        used,
        remaining: allocated - used,
        percent,
        status: percent >= 100 ? 'blocked' : percent >= q.softLimitThreshold ? 'warning' : 'healthy',
        hardLimit: q.hardLimit,
      };
    });
  }
}
