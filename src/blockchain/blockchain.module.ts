import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';
import { NodesModule } from 'src/nodes/nodes.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [NodesModule, RedisModule],
  controllers: [BlockchainController],
  providers: [BlockchainService],
})
export class BlockchainModule {}
