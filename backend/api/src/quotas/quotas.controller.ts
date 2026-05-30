import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { QuotasService } from './quotas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

class AllocateQuotaDto {
  @IsNumber() tokensAllocated: number;
  @IsOptional() @IsBoolean() hardLimit?: boolean;
  @IsOptional() @IsNumber() @Min(1) softLimitThreshold?: number;
}

@ApiTags('quotas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quotas')
export class QuotasController {
  constructor(private quotasService: QuotasService) {}

  @Post('users/:userId/allocate')
  allocate(@Param('userId') userId: string, @Body() dto: AllocateQuotaDto) {
    return this.quotasService.allocateQuota(userId, dto.tokensAllocated, {
      hardLimit: dto.hardLimit,
      softLimitThreshold: dto.softLimitThreshold,
    });
  }

  @Get('users/:userId')
  getUserQuota(@Param('userId') userId: string) {
    return this.quotasService.getUserQuota(userId);
  }

  @Get('teams/:teamId')
  getTeamQuotas(@Param('teamId') teamId: string) {
    return this.quotasService.getTeamQuotaSummary(teamId);
  }
}
