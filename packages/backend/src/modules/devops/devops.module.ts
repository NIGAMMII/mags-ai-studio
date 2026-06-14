import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DeploymentService } from './deployments/deployment.service';
import { DeploymentController } from './deployments/deployment.controller';
import { DeploymentQueue } from './queue/deployment.queue';
import { PipelineExecutorService } from './pipelines/pipeline-executor.service';
import { PipelineController } from './pipelines/pipeline.controller';
import { BuildService } from './builds/build.service';
import { ContainerService } from './containers/container.service';
import { DockerfileGenerator } from './containers/dockerfile.generator';
import { ProvisionerService } from './infrastructure/provisioner.service';
import { EnvironmentService } from './environments/environment.service';
import { HealthService } from './monitoring/health.service';
import { MonitoringService } from './monitoring/monitoring.service';
import { DevopsGateway } from './devops.gateway';
import { PrismaService } from '@/database/prisma.service';
import { BuildQueue } from './queue/build.queue';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'deployments' },
      { name: 'builds' },
      { name: 'health-checks' },
      { name: 'rollbacks' },
    ),
  ],
  controllers: [DeploymentController, PipelineController],
  providers: [
    DeploymentService,
    DeploymentQueue,
    BuildQueue,
    PipelineExecutorService,
    BuildService,
    ContainerService,
    DockerfileGenerator,
    ProvisionerService,
    EnvironmentService,
    HealthService,
    MonitoringService,
    DevopsGateway,
    PrismaService,
  ],
  exports: [
    DeploymentService,
    PipelineExecutorService,
    BuildService,
    EnvironmentService,
    HealthService,
    DevopsGateway,
  ],
})
export class DevopsModule {}
