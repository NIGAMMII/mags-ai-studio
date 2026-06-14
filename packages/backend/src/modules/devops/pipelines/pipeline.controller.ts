import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreatePipelineDto, ExecutePipelineDto } from './dto/create-pipeline.dto';

@Controller('pipelines')
@UseGuards(AuthGuard('jwt'))
export class PipelineController {
  constructor() {}

  @Post()
  async createPipeline(@Body() dto: CreatePipelineDto) {
    // Implement pipeline creation
    return { status: 'created' };
  }

  @Get(':id')
  async getPipeline(@Param('id') id: string) {
    // Implement get pipeline
    return {};
  }

  @Post(':id/execute')
  async executePipeline(@Param('id') id: string, @Body() dto: ExecutePipelineDto) {
    // Execute pipeline
    return { status: 'executing' };
  }
}