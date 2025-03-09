import { Injectable, Logger } from '@nestjs/common';

// Define el tipo de nodo
export type NodeType = 'validator' | 'full' | 'seed';

// Interfaz para representar un nodo en la red
export interface Node {
  id: string;
  url: string;
  type: NodeType;
  lastSeen?: Date;
  version?: string;
  location?: string;
  status?: 'active' | 'inactive' | 'syncing';
}

@Injectable()
export class NodesService {
    private readonly logger = new Logger(NodesService.name);

    // Almacenamiento en memoria de los nodos conocidos
    private nodes: Map<string, Node> = new Map();

    constructor() {
        // Inicializar con algunos nodos de ejemplo (en producción, esto podría cargarse desde una base de datos)
        this.initializeExampleNodes();
    }

    private initializeExampleNodes() {
        // Algunos nodos de ejemplo para desarrollo
        const exampleNodes: Node[] = [
            { id: 'val-1', url: 'https://validator1.example.com', type: 'validator', status: 'active' },
            { id: 'val-2', url: 'https://validator2.example.com', type: 'validator', status: 'active' },
            { id: 'full-1', url: 'https://fullnode1.example.com', type: 'full', status: 'active' },
            { id: 'full-2', url: 'https://fullnode2.example.com', type: 'full', status: 'active' },
            { id: 'seed-1', url: 'https://seednode1.example.com', type: 'seed', status: 'active' },
        ];

        for (const node of exampleNodes) {
            this.nodes.set(node.id, {
                ...node,
                lastSeen: new Date()
            });
        }
    }

    /**
     * Obtiene todos los nodos registrados
     * @returns Array de todos los nodos
     */
    getAllNodes(): Node[] {
        return Array.from(this.nodes.values());
    }

    /**
     * Obtiene todos los nodos conectados de un tipo específico
     * @param type Tipo de nodo ('validator', 'full', 'seed')
     * @returns Array de nodos del tipo especificado con estado activo
     */
    getConnectedNodes(type: NodeType): Node[] {
        return Array.from(this.nodes.values())
            .filter(node => node.type === type && node.status === 'active');
    }

    /**
     * Registra un nuevo nodo en la red
     * @param node Información del nodo a registrar
     * @returns El nodo registrado
     */
    registerNode(node: Omit<Node, 'lastSeen'>): Node {
        const newNode: Node = {
            ...node,
            lastSeen: new Date(),
            status: 'active'
        };

        this.nodes.set(node.id, newNode);
        this.logger.log(`Registered new ${node.type} node: ${node.id} at ${node.url}`);

        return newNode;
    }

    /**
     * Actualiza el estado de un nodo existente
     * @param id ID del nodo
     * @param updates Actualizaciones a aplicar
     * @returns El nodo actualizado o null si no existe
     */
    updateNodeStatus(id: string, updates: Partial<Node>): Node | null {
        const node = this.nodes.get(id);

        if (!node) {
            this.logger.warn(`Attempted to update non-existent node: ${id}`);
            return null;
        }

        const updatedNode = {
            ...node,
            ...updates,
            lastSeen: new Date()
        };

        this.nodes.set(id, updatedNode);
        this.logger.debug(`Updated node ${id} status: ${JSON.stringify(updates)}`);

        return updatedNode;
    }

    /**
     * Marca un nodo como inactivo
     * @param id ID del nodo
     * @returns true si el nodo fue marcado como inactivo, false si no existe
     */
    markNodeAsInactive(id: string): boolean {
        const node = this.nodes.get(id);

        if (!node) {
            return false;
        }

        this.nodes.set(id, {
            ...node,
            status: 'inactive'
        });

        this.logger.warn(`Marked node ${id} as inactive`);
        return true;
    }

    /**
     * Elimina un nodo de la lista de nodos conocidos
     * @param id ID del nodo a eliminar
     * @returns true si el nodo fue eliminado, false si no existía
     */
    removeNode(id: string): boolean {
        const existed = this.nodes.has(id);

        if (existed) {
            this.nodes.delete(id);
            this.logger.log(`Removed node: ${id}`);
        }

        return existed;
    }

    /**
     * Verifica la conectividad con todos los nodos
     * Método que podría ser llamado periódicamente para actualizar 
     * el estado de los nodos
     */
    async checkNodesConnectivity(): Promise<void> {
        for (const [id, node] of this.nodes.entries()) {
            try {
                // En una implementación real, aquí haríamos una llamada HTTP al nodo
                // para verificar su estado
                const isConnected = await this.pingNode(node.url);

                if (isConnected) {
                    this.updateNodeStatus(id, { status: 'active' });
                } else {
                    this.updateNodeStatus(id, { status: 'inactive' });
                }
            } catch (error) {
                this.logger.error(`Error checking connectivity with node ${id}: ${error.message}`);
                this.updateNodeStatus(id, { status: 'inactive' });
            }
        }
    }

    /**
     * Intenta hacer ping a un nodo para verificar si está activo
     * @param url URL del nodo
     * @returns true si el nodo responde, false en caso contrario
     */
    private async pingNode(url: string): Promise<boolean> {
        try {
            // En una implementación real, haríamos una llamada HTTP al endpoint de estado
            // del nodo y verificaríamos la respuesta
            // Por ahora, simulamos una respuesta exitosa con alta probabilidad
            return Math.random() > 0.1; // 90% de éxito para simulación
        } catch (error) {
            this.logger.warn(`Failed to ping node at ${url}: ${error.message}`);
            return false;
        }
    }

    /**
     * Selecciona los nodos más confiables para una operación crítica
     * @param type Tipo de nodo requerido
     * @param count Número de nodos a seleccionar
     * @returns Array con los nodos seleccionados
     */
    selectReliableNodes(type: NodeType, count: number): Node[] {
        const typeNodes = this.getConnectedNodes(type);

        if (typeNodes.length <= count) {
            return typeNodes;
        }

        // En una implementación real, podríamos ordenar por confiabilidad
        // basada en métricas de rendimiento pasado
        return typeNodes.slice(0, count);
    }
}
