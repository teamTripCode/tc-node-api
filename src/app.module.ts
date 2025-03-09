import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BlockchainModule } from './blockchain/blockchain.module';
import { NodesModule } from './nodes/nodes.module';
import { WalletModule } from './wallet/wallet.module';
import { ConsensusModule } from './consensus/consensus.module';
import { CryptoModule } from './crypto/crypto.module';
import { P2pModule } from './p2p/p2p.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [BlockchainModule, NodesModule, WalletModule, ConsensusModule, CryptoModule, P2pModule, RedisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
