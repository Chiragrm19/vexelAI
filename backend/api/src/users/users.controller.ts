import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsEmail } from 'class-validator';

class InviteMemberDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() phone: string;
  @IsString() jobRole: string;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Post('teams/:teamId/invite')
  invite(@Param('teamId') teamId: string, @Body() dto: InviteMemberDto) {
    return this.service.inviteMember(teamId, dto);
  }

  @Get('teams/:teamId')
  getMembers(@Param('teamId') teamId: string) {
    return this.service.getTeamMembers(teamId);
  }

  @Delete(':userId')
  removeMember(@Param('userId') userId: string) {
    return this.service.removeMember(userId);
  }
}
