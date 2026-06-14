export type DeploymentStatus = 
  | 'PENDING'
  | 'BUILDING'
  | 'TESTING'
  | 'SECURITY_SCANNING'
  | 'DEPLOYING'
  | 'VERIFYING'
  | 'SUCCESS'
  | 'FAILED'
  | 'ROLLED_BACK';

export type HealthStatus = 'UNKNOWN' | 'HEALTHY' | 'UNHEALTHY' | 'DEGRADED';

export type Environment = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';

export interface Deployment {
  id: string;
  name: string;
  version: string;
  status: DeploymentStatus;
  environment: Environment;
  healthStatus: HealthStatus;
  createdAt: Date;
  completedAt?: Date;
  canRollback: boolean;
}

export interface DeploymentMetric {
  metric: string;
  value: number;
  unit: string;
  timestamp: Date;
}

export interface DeploymentLog {
  id: string;
  level: string;
  message: string;
  stepName?: string;
  timestamp: Date;
}