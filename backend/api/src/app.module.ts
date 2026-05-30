import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TeamsModule } from './teams/teams.module';
import { UsersModule } from './users/users.module';
import { QuotasModule } from './quotas/quotas.module';
import { ProvidersModule } from './providers/providers.module';
import { UsageModule } from './usage/usage.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    TeamsModule,
    UsersModule,
    QuotasModule,
    ProvidersModule,
    UsageModule,
  ],
})
export class AppModule {}
