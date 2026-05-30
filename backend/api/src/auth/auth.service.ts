import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OnboardingDto } from './dto/onboarding.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  /** Generate a unique Company ID like COMP-7X9K2M */
  private generateCompanyId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const suffix = Array.from({ length: 6 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join('');
    return `COMP-${suffix}`;
  }

  /** Generate a 6-digit OTP */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /** Issue JWT token */
  private issueToken(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  /** Admin signup */
  async signup(dto: SignupDto) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user first (admin)
    const user = await this.prisma.user.create({
      data: {
        id: uuidv4(),
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: 'ADMIN',
        jobRole: 'Admin',
        isVerified: true,
      },
    });

    // Create team with unique company ID
    let companyId = this.generateCompanyId();
    let teamExists = await this.prisma.team.findUnique({ where: { companyId } });
    while (teamExists) {
      companyId = this.generateCompanyId();
      teamExists = await this.prisma.team.findUnique({ where: { companyId } });
    }

    const team = await this.prisma.team.create({
      data: {
        id: uuidv4(),
        companyId,
        name: dto.companyName,
        adminId: user.id,
      },
    });

    // Link user to team
    await this.prisma.user.update({
      where: { id: user.id },
      data: { teamId: team.id },
    });

    // Create initial quota for admin
    await this.prisma.quota.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        teamId: team.id,
        tokensAllocated: BigInt(0),
        tokensUsed: BigInt(0),
      },
    });

    const token = this.issueToken({ id: user.id, email: user.email, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      team: {
        id: team.id,
        companyId: team.companyId,
        name: team.name,
      },
    };
  }

  /** Login */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { team: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.issueToken({ id: user.id, email: user.email, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        jobRole: user.jobRole,
        teamId: user.teamId,
        companyId: user.team?.companyId,
      },
    };
  }

  /** Employee onboarding — step 1: validate Company ID, send OTP */
  async initOnboarding(dto: OnboardingDto) {
    // Validate company ID
    const team = await this.prisma.team.findUnique({
      where: { companyId: dto.companyId },
    });
    if (!team) throw new NotFoundException('Invalid Company ID');

    // Check if user already exists (re-invite)
    let user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      const tempPassword = await bcrypt.hash(uuidv4(), 12);
      user = await this.prisma.user.create({
        data: {
          id: uuidv4(),
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          passwordHash: tempPassword,
          role: 'EMPLOYEE',
          jobRole: dto.jobRole || 'SDE',
          teamId: team.id,
          isVerified: false,
        },
      });

      // Create quota placeholder
      await this.prisma.quota.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          teamId: team.id,
          tokensAllocated: BigInt(0),
          tokensUsed: BigInt(0),
        },
      });
    }

    // Generate and store OTP (expires in 10 minutes)
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpCode.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        code: otp,
        type: 'EMAIL',
        expiresAt,
      },
    });

    // In production: send email/SMS via SendGrid/Twilio
    // For demo: return OTP in response
    console.log(`📧 OTP for ${dto.email}: ${otp}`);

    return {
      message: 'OTP sent to your email and phone',
      userId: user.id,
      // DEV ONLY — remove in production:
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  /** Employee onboarding — step 2: verify OTP + set password */
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('User not found');

    // Find valid OTP
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        userId: dto.userId,
        code: dto.otp,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (!otpRecord) throw new BadRequestException('Invalid or expired OTP');

    // Mark OTP as used
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Set password and mark verified
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const updatedUser = await this.prisma.user.update({
      where: { id: dto.userId },
      data: { passwordHash, isVerified: true },
      include: { team: true },
    });

    const token = this.issueToken({
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    });

    return {
      token,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        jobRole: updatedUser.jobRole,
        teamId: updatedUser.teamId,
        companyId: updatedUser.team?.companyId,
      },
    };
  }

  /** Get current user profile */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: true,
        quota: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      jobRole: user.jobRole,
      team: user.team
        ? { id: user.team.id, name: user.team.name, companyId: user.team.companyId }
        : null,
      quota: user.quota
        ? {
            tokensAllocated: user.quota.tokensAllocated.toString(),
            tokensUsed: user.quota.tokensUsed.toString(),
            hardLimit: user.quota.hardLimit,
            softLimitThreshold: user.quota.softLimitThreshold,
          }
        : null,
    };
  }
}
