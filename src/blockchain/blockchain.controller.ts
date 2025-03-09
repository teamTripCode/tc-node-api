import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus, Query } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { CreateTransactionDto } from './dto/create-blockchain.dto';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainApiService: BlockchainService) { }

  @Get('blocks/latest')
  async getLatestBlocks(@Query('limit') limit = 10) {
    try {
      return await this.blockchainApiService.getLatestBlocks(limit);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('blocks/:hash')
  async getBlock(@Param('hash') hash: string) {
    try {
      const block = await this.blockchainApiService.getBlock(hash);
      if (!block) {
        throw new HttpException('Block not found', HttpStatus.NOT_FOUND);
      }
      return block;
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('blocks/height')
  async getBlockHeight() {
    try {
      return await this.blockchainApiService.getBlockHeight();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('blocks/type/:type')
  async getBlocksByType(@Param('type') type: string) {
    try {
      return await this.blockchainApiService.getBlocksByType(type);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('transactions')
  async createTransaction(@Body() createTransactionDto: CreateTransactionDto) {
    try {
      return await this.blockchainApiService.createTransaction(createTransactionDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('transactions/:hash')
  async getTransaction(@Param('hash') hash: string) {
    try {
      const transaction = await this.blockchainApiService.getTransaction(hash);
      if (!transaction) {
        throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
      }
      return transaction;
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('validators')
  async getValidators() {
    try {
      return await this.blockchainApiService.getValidators();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('status')
  async getNetworkStatus() {
    try {
      return await this.blockchainApiService.getNetworkStatus();
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
