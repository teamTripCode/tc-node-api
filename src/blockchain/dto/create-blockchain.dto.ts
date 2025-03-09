export interface Validator {
    id: string;
    url: string;
    type: string; // O usa un tipo más específico si está definido
    lastSeen?: Date;
    version?: string;
    location?: string;
    status?: "active" | "inactive" | "syncing";
    isActive: boolean;
    lastError?: string;
}

export interface BlockHeightResponse {
    height: number;
    consensus: number;
}

export class CreateTransactionDto {
    from: string;
    to: string;
    amount: number;
    signature: string;
    nonce: number;
    data?: Record<string, any>;
    fee?: number;
}

export interface Block {
    hash: string;
    height: number;
    timestamp: string;
    transactions: any[];
    // Agrega otras propiedades según sea necesario
}