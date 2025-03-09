import { Module } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { NodesController } from './nodes.controller';
import { ValidatorsModule } from './validators/validators.module';
import { SeedsModule } from './seeds/seeds.module';
import { FullModule } from './full/full.module';

@Module({
  providers: [NodesService],
  controllers: [NodesController],
  imports: [ValidatorsModule, SeedsModule, FullModule],
  exports: [NodesService]
})
export class NodesModule {}
