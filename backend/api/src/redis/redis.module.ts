import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const client = new Redis(
          configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
        );
        client.on('connect', () => console.log('✅ Redis connected'));
        client.on('error', (err) => console.error('Redis error:', err));
        return client;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}
