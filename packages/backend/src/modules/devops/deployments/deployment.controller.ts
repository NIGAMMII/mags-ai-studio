import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { DeploymentService } from './deployment.service';
import { CreateDeploymentDto, RunDeploymentDto } from './dto/create-deployment.dto';

@Controller('deployments')
@UseGuards(AuthGuard('jwt'))
export class DeploymentController {
  constructor(private deploymentService: DeploymentService) {}

  @Post()
  async createDeployment(
    @Body() dto: CreateDeploymentDto,
    @CurrentUser() user: any,
  ) {
    return this.deploymentService.createDeployment(dto, user.id);
  }

  @Get(':id')
  async getDeployment(@Param('id') id: string) {
    return this.deploymentService.getDeployment(id);
  }

  @Get('project/:projectId')
  async listDeployments(@Param('projectId') projectId: string) {
    return this.deploymentService.listDeployments(projectId);
  }

  @Post(':id/run')
  async runDeployment(@Param('id') id: string, @Body() dto: RunDeploymentDto) {
    await this.deploymentService.runDeployment(id, dto);
    return { status: 'queued' };
  }

  @Post(':id/rollback')
  async rollbackDeployment(@Param('id') id: string) {
    return this.deploymentService.rollbackDeployment(id);
  }
}