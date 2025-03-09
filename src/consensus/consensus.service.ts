import { Injectable } from '@nestjs/common';
import { CreateConsensusDto } from './dto/create-consensus.dto';
import { UpdateConsensusDto } from './dto/update-consensus.dto';

@Injectable()
export class ConsensusService {
  create(createConsensusDto: CreateConsensusDto) {
    return 'This action adds a new consensus';
  }

  findAll() {
    return `This action returns all consensus`;
  }

  findOne(id: number) {
    return `This action returns a #${id} consensus`;
  }

  update(id: number, updateConsensusDto: UpdateConsensusDto) {
    return `This action updates a #${id} consensus`;
  }

  remove(id: number) {
    return `This action removes a #${id} consensus`;
  }
}
