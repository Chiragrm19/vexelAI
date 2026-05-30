import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async inviteMember(
    teamId: string,
    data: { name: string; email: string; phone: string; jobRole: string },
  ) {
    // Create a pending user (unverified)
    const tempPw = await bcrypt.hash(uuidv4(), 12);
    const user = await this.prisma.user.create({
      data: {
        id: uuidv4(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash: tempPw,
        role: 'EMPLOYEE',
        jobRole: data.jobRole,
        teamId,
        isVerified: false,
      },
    });

    await this.prisma.quota.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        teamId,
        tokensAllocated: BigInt(0),
        tokensUsed: BigInt(0),
      },
    });

    // In prod: send invite email via SendGrid
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    console.log(`📧 Invite sent to ${data.email} — Company ID: ${team?.companyId}`);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      jobRole: user.jobRole,
      status: 'invited',
      companyId: team?.companyId,
    };
  }

  async getTeamMembers(teamId: string) {
    return this.prisma.user.findMany({
      where: { teamId, role: 'EMPLOYEE' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        jobRole: true,
        isVerified: true,
        createdAt: true,
        quota: {
          select: {
            tokensAllocated: true,
            tokensUsed: true,
            hardLimit: true,
            softLimitThreshold: true,
          },
        },
      },
    });
  }

  async updateMemberRole(userId: string, jobRole: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { jobRole },
    });
  }

  async removeMember(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { teamId: null },
    });
    return { success: true };
  }
}
