import { Controller, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Get(':id')
  getTeam(@Param('id') id: string) {
    return this.teamsService.getTeam(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.teamsService.getTeamStats(id);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    return this.teamsService.getMembersWithUsage(id);
  }

  @Get(':id/trends')
  getTrends(@Param('id') id: string, @Query('days') days?: string) {
    return this.teamsService.getUsageTrends(id, days ? parseInt(days) : 30);
  }
}
