import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('usage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usage')
export class UsageController {
  constructor(private service: UsageService) {}

  @Post('log')
  logUsage(@Body() data: any) {
    return this.service.logUsage(data);
  }

  @Get('users/:userId/logs')
  getUserLogs(@Param('userId') id: string, @Query('limit') limit?: string) {
    return this.service.getUserLogs(id, limit ? parseInt(limit) : 50);
  }

  @Get('users/:userId/daily')
  getDailyUsage(@Param('userId') id: string, @Query('days') days?: string) {
    return this.service.getUserDailyUsage(id, days ? parseInt(days) : 14);
  }

  @Get('users/:userId/savings')
  getSavings(@Param('userId') id: string) {
    return this.service.getUserSavings(id);
  }

  @Get('teams/:teamId/top-users')
  getTopUsers(@Param('teamId') id: string) {
    return this.service.getTopUsers(id);
  }

  @Get('teams/:teamId/forecast')
  getForecast(@Param('teamId') id: string) {
    return this.service.forecastMonthEnd(id);
  }
}
