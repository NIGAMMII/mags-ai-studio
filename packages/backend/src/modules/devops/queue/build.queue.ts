import { Injectable } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class BuildQueue {
  constructor(@InjectQueue('builds') private buildQueue: Queue) {
    this.setupWorker();
  }

  async addBuildJob(data: any, opts?: any): Promise<void> {
    await this.buildQueue.add('build', data, opts);
  }

  private setupWorker(): void {
    const worker = new Worker(
      'builds',
      async (job) => {
        // Process build job
        console.log(`Processing build job: ${job.id}`);
      },
      { connection: { host: process.env.REDIS_HOST || 'localhost', port: 6379 } },
    );

    worker.on('completed', (job) => {
      console.log(`Build job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Build job ${job?.id} failed:`, err);
    });
  }
}