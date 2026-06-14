import { Injectable } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from '@/database/prisma.service';
import { PipelineExecutorService } from '../pipelines/pipeline-executor.service';

@Injectable()
export class DeploymentQueue {
  constructor(
    @InjectQueue('deployments') private deploymentQueue: Queue,
    private prisma: PrismaService,
    private pipelineExecutor: PipelineExecutorService,
  ) {
    this.setupWorker();
  }

  async addDeploymentJob(data: any, opts?: any): Promise<void> {
    await this.deploymentQueue.add('deploy', data, opts);
  }

  async addRollbackJob(data: any, opts?: any): Promise<void> {
    await this.deploymentQueue.add('rollback', data, opts);
  }

  private setupWorker(): void {
    const worker = new Worker(
      'deployments',
      async (job) => {
        if (job.name === 'deploy') {
          return this.processDeployment(job.data);
        } else if (job.name === 'rollback') {
          return this.processRollback(job.data);
        }
      },
      { connection: { host: process.env.REDIS_HOST || 'localhost', port: 6379 } },
    );

    worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });
  }

  private async processDeployment(data: any): Promise<void> {
    const { deploymentId } = data;
    await this.pipelineExecutor.executePipeline(deploymentId);
  }

  private async processRollback(data: any): Promise<void> {
    const { deploymentId, previousDeploymentId } = data;
    // Implement rollback logic
  }
}