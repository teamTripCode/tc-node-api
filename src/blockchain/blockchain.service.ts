import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { NodesService } from 'src/nodes/nodes.service';
import { RedisService } from 'src/redis/redis.service';
import { BlockHeightResponse, CreateTransactionDto, Validator } from './dto/create-blockchain.dto';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly CACHE_TTL = 60;

  constructor(
    private readonly nodesService: NodesService,
    private readonly redisService: RedisService,
  ) { }

  /**
   * Obtiene un bloque específico por su hash.
   * Consulta primero a los nodos full.
   * @param hash - Hash del bloque a recuperar.
   * @returns El bloque como JSON o null si no se encuentra.
   */
  async getBlock(hash: string): Promise<any> {
    // Intentar obtener de caché primero
    const cachedBlock = await this.redisService.get(`block:${hash}`);
    if (cachedBlock) {
      return JSON.parse(cachedBlock);
    }

    // Obtener todos los nodos full disponibles
    const fullNodes = this.nodesService.getConnectedNodes('full');

    // Si no hay nodos full, intentar con los validadores
    if (!fullNodes.length) {
      const validators = this.nodesService.getConnectedNodes('validator');

      for (const validator of validators) {
        try {
          const response = await axios.get(`${validator.url}/blocks/${hash}`);
          const block = response.data;

          // Guardar en caché
          await this.redisService.set(`block:${hash}`, JSON.stringify(block), this.CACHE_TTL);

          return block;
        } catch (error) {
          this.logger.warn(`Error fetching block ${hash} from validator ${validator.url}: ${error.message}`);
        }
      }

      return null;
    }

    // Intentar con los nodos full
    for (const fullNode of fullNodes) {
      try {
        const response = await axios.get(`${fullNode.url}/blocks/${hash}`);
        const block = response.data;

        // Guardar en caché
        await this.redisService.set(`block:${hash}`, JSON.stringify(block), this.CACHE_TTL);

        return block;
      } catch (error) {
        this.logger.warn(`Error fetching block ${hash} from full node ${fullNode.url}: ${error.message}`);
      }
    }

    return null;
  }

  /**
   * Obtiene la altura actual de la blockchain.
   * Consulta a múltiples nodos y devuelve la altura más común (consenso).
   * @returns La altura de la blockchain.
   */
  async getBlockHeight(): Promise<BlockHeightResponse> {
    // Obtener todos los nodos (full y validadores)
    const nodes = [
      ...this.nodesService.getConnectedNodes('full'),
      ...this.nodesService.getConnectedNodes('validator'),
    ];

    // Si no hay nodos disponibles, devolver valores predeterminados
    if (!nodes.length) {
      return { height: 0, consensus: 0 };
    }

    const heights: number[] = []; // Almacenar alturas de los bloques

    // Consultar la altura de cada nodo
    for (const node of nodes) {
      try {
        const response = await axios.get(`${node.url}/blocks/height`);
        heights.push(response.data.height); // Asumimos que `response.data.height` es un número
      } catch (error) {
        this.logger.warn(`Error fetching block height from node ${node.url}: ${error.message}`);
      }
    }

    // Si no se obtuvieron alturas, devolver valores predeterminados
    if (heights.length === 0) {
      return { height: 0, consensus: 0 };
    }

    // Contar cuántas veces aparece cada altura
    const heightCounts: Record<number, number> = {}; // Objeto para contar ocurrencias
    let maxConsensus = 0;
    let consensusHeight = 0;

    for (const height of heights) {
      heightCounts[height] = (heightCounts[height] || 0) + 1;

      // Actualizar la altura con mayor consenso
      if (heightCounts[height] > maxConsensus) {
        maxConsensus = heightCounts[height];
        consensusHeight = height;
      }
    }

    // Calcular el porcentaje de consenso
    const consensusPercentage = (maxConsensus / nodes.length) * 100;

    // Devolver la altura y el porcentaje de consenso
    return {
      height: consensusHeight,
      consensus: consensusPercentage,
    };
  }

  /**
   * Obtiene los últimos bloques de la blockchain.
   * @param limit - Número máximo de bloques a recuperar.
   * @returns Una lista de los últimos bloques.
   */
  async getLatestBlocks(limit = 10): Promise<any[]> {
    // Intentar obtener de caché primero
    const cachedBlocks = await this.redisService.get(`latest_blocks:${limit}`);
    if (cachedBlocks) {
      return JSON.parse(cachedBlocks);
    }

    // Intentar primero con nodos full
    const fullNodes = this.nodesService.getConnectedNodes('full');

    if (fullNodes.length) {
      for (const fullNode of fullNodes) {
        try {
          const response = await axios.get(`${fullNode.url}/blocks/latest?limit=${limit}`);
          const blocks = response.data.blocks;

          // Guardar en caché por un tiempo corto
          await this.redisService.set(`latest_blocks:${limit}`, JSON.stringify(blocks), 10); // 10 segundos

          return blocks;
        } catch (error) {
          this.logger.warn(`Error fetching latest blocks from full node ${fullNode.url}: ${error.message}`);
        }
      }
    }

    // Si no hay nodos full disponibles, intentar con validadores
    const validators = this.nodesService.getConnectedNodes('validator');

    for (const validator of validators) {
      try {
        const response = await axios.get(`${validator.url}/blocks/latest?limit=${limit}`);
        const blocks = response.data.blocks || response.data;

        // Guardar en caché por un tiempo corto
        await this.redisService.set(`latest_blocks:${limit}`, JSON.stringify(blocks), 10);

        return blocks;
      } catch (error) {
        this.logger.warn(`Error fetching latest blocks from validator ${validator.url}: ${error.message}`);
      }
    }

    return [];
  }

  /**
   * Obtiene todos los bloques de un tipo específico.
   * @param type - Tipo de bloque (TRANSACTION o CRITICAL_PROCESS).
   * @returns Una lista de bloques del tipo especificado.
   */
  async getBlocksByType(type: string): Promise<any[]> {
    // Primero intentar con nodos full
    const fullNodes = this.nodesService.getConnectedNodes('full');

    if (fullNodes.length) {
      for (const fullNode of fullNodes) {
        try {
          const response = await axios.get(`${fullNode.url}/blocks/type/${type}`);
          return response.data.blocks || response.data;
        } catch (error) {
          this.logger.warn(`Error fetching blocks by type from full node ${fullNode.url}: ${error.message}`);
        }
      }
    }

    // Si no hay nodos full disponibles, intentar con validadores
    const validators = this.nodesService.getConnectedNodes('validator');

    for (const validator of validators) {
      try {
        const response = await axios.get(`${validator.url}/blocks/type/${type}`);
        return response.data.blocks || response.data;
      } catch (error) {
        this.logger.warn(`Error fetching blocks by type from validator ${validator.url}: ${error.message}`);
      }
    }

    return [];
  }

  /**
   * Crea y difunde una nueva transacción en la red blockchain.
   * @param createTransactionDto - Datos de la transacción.
   * @returns Información sobre la transacción creada.
   */
  async createTransaction(createTransactionDto: CreateTransactionDto): Promise<any> {
    // Las transacciones deben enviarse a los validadores
    const validators = this.nodesService.getConnectedNodes('validator');

    if (!validators.length) {
      throw new Error('No validator nodes available to process transaction');
    }

    // Intentar enviar la transacción a todos los validadores
    // pero solo necesitamos una respuesta exitosa
    let transactionResult: { hash: string } | null = null;
    const errors: string[] = []; // Definir explícitamente el tipo como array de strings

    for (const validator of validators) {
      try {
        const response = await axios.post(`${validator.url}/transactions`, createTransactionDto);
        transactionResult = response.data;

        // Si tenemos éxito con un validador, podemos detener
        break;
      } catch (error) {
        this.logger.warn(`Error sending transaction to validator ${validator.url}: ${error.message}`);
        errors.push(`${validator.url}: ${error.message}`); // Ahora esto funciona correctamente
      }
    }

    if (!transactionResult) {
      throw new Error(`Failed to create transaction on any validator: ${errors.join(', ')}`);
    }

    // Difundir la transacción a otros validadores también (en segundo plano)
    this.broadcastTransaction(createTransactionDto, transactionResult.hash);

    return transactionResult;
  }

  /**
   * Difunde una transacción a otros validadores en segundo plano.
   * @param transaction - Datos de la transacción.
   * @param hash - Hash de la transacción.
   */
  private async broadcastTransaction(transaction: any, hash: string): Promise<void> {
    const validators = this.nodesService.getConnectedNodes('validator');

    for (const validator of validators) {
      try {
        await axios.post(`${validator.url}/transactions`, transaction);
        this.logger.debug(`Successfully broadcast transaction ${hash} to validator ${validator.url}`);
      } catch (error) {
        this.logger.warn(`Failed to broadcast transaction ${hash} to validator ${validator.url}: ${error.message}`);
      }
    }
  }

  /**
   * Obtiene una transacción por su hash.
   * @param hash - Hash de la transacción.
   * @returns Información de la transacción.
   */
  async getTransaction(hash: string): Promise<any> {
    // Intentar obtener de caché primero
    const cachedTransaction = await this.redisService.get(`transaction:${hash}`);
    if (cachedTransaction) {
      return JSON.parse(cachedTransaction);
    }

    // Intentar con nodos full primero
    const fullNodes = this.nodesService.getConnectedNodes('full');

    if (fullNodes.length) {
      for (const fullNode of fullNodes) {
        try {
          const response = await axios.get(`${fullNode.url}/transactions/${hash}`);
          const transaction = response.data;

          // Guardar en caché
          await this.redisService.set(`transaction:${hash}`, JSON.stringify(transaction), this.CACHE_TTL);

          return transaction;
        } catch (error) {
          this.logger.warn(`Error fetching transaction ${hash} from full node ${fullNode.url}: ${error.message}`);
        }
      }
    }

    // Si no hay nodos full, intentar con validadores
    const validators = this.nodesService.getConnectedNodes('validator');

    for (const validator of validators) {
      try {
        const response = await axios.get(`${validator.url}/transactions/${hash}`);
        const transaction = response.data;

        // Guardar en caché
        await this.redisService.set(`transaction:${hash}`, JSON.stringify(transaction), this.CACHE_TTL);

        return transaction;
      } catch (error) {
        this.logger.warn(`Error fetching transaction ${hash} from validator ${validator.url}: ${error.message}`);
      }
    }

    return null;
  }

  /**
   * Obtiene la lista de validadores activos en la red.
   * @returns Lista de validadores.
   */
  async getValidators(): Promise<Validator[]> {
    const validators = this.nodesService.getConnectedNodes('validator');

    // Definir explícitamente el tipo del array
    const enrichedValidators: Validator[] = [];

    for (const validator of validators) {
      try {
        // Consultar información adicional del validador
        const response = await axios.get(`${validator.url}/status`);

        enrichedValidators.push({
          ...validator,
          ...response.data,
          isActive: true,
        });
      } catch (error) {
        this.logger.warn(`Error fetching status from validator ${validator.url}: ${error.message}`);

        // Incluir información básica si no podemos obtener detalles
        enrichedValidators.push({
          ...validator,
          isActive: false,
          lastError: error.message,
        });
      }
    }

    return enrichedValidators;
  }

  /**
   * Obtiene el estado general de la red blockchain.
   * @returns Información de estado de la red.
   */
  async getNetworkStatus(): Promise<any> {
    // Obtener altura del blockchain
    const { height, consensus } = await this.getBlockHeight();

    // Contar nodos por tipo
    const validators = this.nodesService.getConnectedNodes('validator');
    const fullNodes = this.nodesService.getConnectedNodes('full');
    const seedNodes = this.nodesService.getConnectedNodes('seed');

    // Calcular TPS (Transacciones por segundo)
    // En una implementación real, esto vendría de una métrica real
    let tps = 0;
    try {
      // Simulación - en una implementación real consultaríamos métricas almacenadas
      tps = Math.floor(Math.random() * 100); // Solo para demostración
    } catch (error) {
      this.logger.warn(`Error calculating TPS: ${error.message}`);
    }

    return {
      blockHeight: height,
      consensusPercentage: consensus,
      nodes: {
        validators: validators.length,
        fullNodes: fullNodes.length,
        seedNodes: seedNodes.length,
        total: validators.length + fullNodes.length + seedNodes.length
      },
      tps: tps,
      timestamp: new Date().toISOString(),
      networkVersion: process.env.NETWORK_VERSION || '1.0.0'
    };
  }
}
