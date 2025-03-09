import { Injectable, Logger } from '@nestjs/common';
import Redis from 'redis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis.RedisClientType;
  
  constructor() {
    this.initializeRedisClient();
  }
  
  private async initializeRedisClient() {
    try {
      // Configurar el cliente Redis con parámetros de entorno o valores por defecto
      this.client = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            // Estrategia de reconexión: esperar más tiempo entre intentos
            this.logger.warn(`Redis connection attempt ${retries}. Retrying...`);
            return Math.min(retries * 100, 3000); // Esperar máximo 3 segundos
          }
        }
      });
      
      // Configurar manejadores de eventos
      this.client.on('error', (err) => {
        this.logger.error(`Redis client error: ${err.message}`);
      });
      
      this.client.on('ready', () => {
        this.logger.log('Redis client connected and ready');
      });
      
      this.client.on('reconnecting', () => {
        this.logger.warn('Redis client reconnecting');
      });
      
      // Conectar el cliente
      await this.client.connect();
    } catch (error) {
      this.logger.error(`Failed to initialize Redis client: ${error.message}`);
      
      // Crear un cliente simulado para desarrollo si no se puede conectar a Redis
      if (process.env.NODE_ENV !== 'production') {
        this.setupMockRedisClient();
        this.logger.warn('Using mock Redis client for development');
      }
    }
  }
  
  /**
   * Configura un cliente Redis simulado para desarrollo
   * Útil cuando no hay un servidor Redis disponible
   */
  private setupMockRedisClient() {
    const mockStorage = new Map<string, { value: string; expiry?: number }>();
    
    // Cliente simulado para entornos de desarrollo
    this.client = {
      get: async (key: string) => {
        const item = mockStorage.get(key);
        if (!item) return null;
        
        // Verificar si ha expirado
        if (item.expiry && item.expiry < Date.now()) {
          mockStorage.delete(key);
          return null;
        }
        
        return item.value;
      },
      set: async (key: string, value: string, options?: any) => {
        let expiry: number | undefined = undefined;
        
        // Procesar opciones de expiración
        if (options && typeof options === 'object' && options.EX) {
          expiry = Date.now() + (options.EX * 1000);
        } else if (typeof options === 'number') {
          // Si se pasa directamente el TTL en segundos
          expiry = Date.now() + (options * 1000);
        }
        
        mockStorage.set(key, { value, expiry });
        return 'OK';
      },
      del: async (key: string) => {
        return mockStorage.delete(key) ? 1 : 0;
      },
      on: (event: string, listener: any) => {
        // No hace nada en el mock
        return {} as any;
      },
      // Implementar otros métodos según sea necesario
    } as unknown as Redis.RedisClientType;
  }
  
  /**
   * Obtiene un valor de la caché
   * @param key Clave a consultar
   * @returns Valor almacenado o null si no existe
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key} from Redis: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Almacena un valor en la caché
   * @param key Clave para almacenar el valor
   * @param value Valor a almacenar
   * @param ttl Tiempo de vida en segundos (opcional)
   * @returns 'OK' si la operación fue exitosa
   */
  async set(key: string, value: string, ttl?: number): Promise<string | null> {
    try {
      if (ttl) {
        return await this.client.set(key, value, { EX: ttl });
      } else {
        return await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key} in Redis: ${error.message}`);
      return 'ERROR';
    }
  }
  
  /**
   * Elimina una clave de la caché
   * @param key Clave a eliminar
   * @returns Número de claves eliminadas
   */
  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key} from Redis: ${error.message}`);
      return 0;
    }
  }
  
  /**
   * Verifica si una clave existe en la caché
   * @param key Clave a verificar
   * @returns true si existe, false en caso contrario
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      this.logger.error(`Error checking if key ${key} exists in Redis: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Incrementa el valor de una clave numérica
   * @param key Clave a incrementar
   * @param increment Valor a incrementar (por defecto 1)
   * @returns Nuevo valor
   */
  async incr(key: string, increment: number = 1): Promise<number> {
    try {
      if (increment === 1) {
        return await this.client.incr(key);
      } else {
        return await this.client.incrBy(key, increment);
      }
    } catch (error) {
      this.logger.error(`Error incrementing key ${key} in Redis: ${error.message}`);
      return 0;
    }
  }
  
  /**
   * Establece una clave con un tiempo de expiración
   * @param key Clave a establecer
   * @param ttl Tiempo de vida en segundos
   * @returns true si la operación fue exitosa
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttl);
      return !!result;
    } catch (error) {
      this.logger.error(`Error setting expiry on key ${key} in Redis: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Recupera múltiples claves de una vez
   * @param keys Array de claves a recuperar
   * @returns Array de valores (null para las claves que no existen)
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      return await this.client.mGet(keys);
    } catch (error) {
      this.logger.error(`Error getting multiple keys from Redis: ${error.message}`);
      return keys.map(() => null);
    }
  }
  
  /**
   * Realiza una operación atómica de obtener y establecer
   * @param key Clave a modificar
   * @param value Nuevo valor
   * @returns Valor anterior
   */
  async getSet(key: string, value: string): Promise<string | null> {
    try {
      return await this.client.getSet(key, value);
    } catch (error) {
      this.logger.error(`Error performing GETSET on key ${key} in Redis: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Limpia todas las claves del espacio de trabajo actual
   * @returns true si la operación fue exitosa
   */
  async flushAll(): Promise<boolean> {
    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      this.logger.error(`Error flushing Redis database: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Método para ejecutar un healthcheck en Redis
   * @returns true si Redis está funcionando correctamente
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error.message}`);
      return false;
    }
  }
}
