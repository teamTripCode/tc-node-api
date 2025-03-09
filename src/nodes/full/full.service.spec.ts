import { Test, TestingModule } from '@nestjs/testing';
import { FullService } from './full.service';

describe('FullService', () => {
  let service: FullService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FullService],
    }).compile();

    service = module.get<FullService>(FullService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
