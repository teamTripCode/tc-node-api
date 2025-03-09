import { Test, TestingModule } from '@nestjs/testing';
import { P2pController } from './p2p.controller';
import { P2pService } from './p2p.service';

describe('P2pController', () => {
  let controller: P2pController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [P2pController],
      providers: [P2pService],
    }).compile();

    controller = module.get<P2pController>(P2pController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
