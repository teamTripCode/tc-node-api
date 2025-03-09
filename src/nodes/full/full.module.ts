import { Module } from '@nestjs/common';
import { FullService } from './full.service';
import { FullController } from './full.controller';

@Module({
  providers: [FullService],
  controllers: [FullController]
})
export class FullModule {}
