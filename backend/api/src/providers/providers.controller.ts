import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNumber, Min } from 'class-validator';

class AddProviderDto {
  @IsString() name: string;
  @IsString() apiKey: string;
  @IsNumber() @Min(1) monthlyTokensAllowed: number;
  @IsNumber() @Min(0) costPerMillionTokens: number;
}

@ApiTags('providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private service: ProvidersService) {}

  @Post('teams/:teamId')
  addProvider(@Param('teamId') teamId: string, @Body() dto: AddProviderDto) {
    return this.service.addProvider(teamId, dto);
  }

  @Get('teams/:teamId')
  getProviders(@Param('teamId') teamId: string) {
    return this.service.getTeamProviders(teamId);
  }

  @Delete(':id')
  deleteProvider(@Param('id') id: string) {
    return this.service.deleteProvider(id);
  }
}
