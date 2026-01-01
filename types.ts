
export type UUID = string;

export enum TwinCategory {
    CUSTOMER_ACCOUNT = "Customer Account",
    LOAN_PRODUCT = "Loan Product",
    BRANCH_PERFORMANCE = "Branch Performance",
    RISK_ASSESSMENT = "Risk Assessment",
    FRAUD_DETECTION = "Fraud Detection",
    INFRASTRUCTURE_ASSET = "Infrastructure Asset",
    SMART_ATM = "Smart ATM"
}

export enum TwinStatus {
    ACTIVE = "Active",
    INACTIVE = "Inactive",
    MAINTENANCE = "Maintenance",
    ERROR = "Error"
}

export interface TwinProperty {
    name: string;
    type: "string" | "number" | "boolean" | "object" | "array";
    description?: string;
    unit?: string;
    enum?: string[];
    readOnly?: boolean;
    writable?: boolean;
}

export interface DigitalTwinDefinition {
    id: UUID;
    name: string;
    description: string;
    category: TwinCategory;
    version: string;
    schema: {
        properties: { [key: string]: TwinProperty };
        required?: string[];
    };
    createdAt: string;
}

export interface TwinAlert {
    id: UUID;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    timestamp: string;
    status: 'ACTIVE' | 'RESOLVED';
}

export interface DigitalTwinInstance {
    id: UUID;
    definitionId: UUID;
    name: string;
    status: TwinStatus;
    healthScore: number;
    properties: { [key: string]: any };
    alerts: TwinAlert[];
    lastUpdate: string;
}

export interface TwinEvent {
    id: UUID;
    instanceId: UUID;
    type: 'DATA_UPDATE' | 'ALERT' | 'STATUS_CHANGE' | 'ACTION';
    description: string;
    timestamp: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
}
