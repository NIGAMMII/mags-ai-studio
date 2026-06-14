export type StageType =
  | 'INSTALL'
  | 'TEST'
  | 'BUILD'
  | 'SECURITY_SCAN'
  | 'CONTAINERIZE'
  | 'DEPLOY'
  | 'VERIFY'
  | 'HEALTH_CHECK';

export interface PipelineStage {
  id: string;
  name: string;
  type: StageType;
  order: number;
  timeout: number;
  retryCount: number;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  isActive: boolean;
  isDefault: boolean;
}