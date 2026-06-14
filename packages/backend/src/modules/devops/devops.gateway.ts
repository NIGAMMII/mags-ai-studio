import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '@/database/prisma.service';

@WebSocketGateway({
  namespace: '/devops',
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000' },
})
export class DevopsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private deploymentSubscribers: Map<string, Set<string>> = new Map();

  constructor(private prisma: PrismaService) {}

  handleConnection(client: Socket): void {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    console.log(`Client disconnected: ${client.id}`);
    // Clean up subscribers
    this.deploymentSubscribers.forEach((subscribers) => {
      subscribers.delete(client.id);
    });
  }

  @SubscribeMessage('subscribe-deployment')
  async handleSubscribeDeployment(client: Socket, deploymentId: string): Promise<void> {
    if (!this.deploymentSubscribers.has(deploymentId)) {
      this.deploymentSubscribers.set(deploymentId, new Set());
    }
    this.deploymentSubscribers.get(deploymentId).add(client.id);
    client.emit('subscribed', { deploymentId });
  }

  @SubscribeMessage('unsubscribe-deployment')
  handleUnsubscribeDeployment(client: Socket, deploymentId: string): void {
    this.deploymentSubscribers.get(deploymentId)?.delete(client.id);
  }

  // Broadcasting methods
  broadcastDeploymentUpdate(deploymentId: string, data: any): void {
    const subscribers = this.deploymentSubscribers.get(deploymentId);
    if (subscribers) {
      this.server.to(Array.from(subscribers)).emit('deployment-update', data);
    }
  }

  broadcastBuildLog(deploymentId: string, log: any): void {
    const subscribers = this.deploymentSubscribers.get(deploymentId);
    if (subscribers) {
      this.server.to(Array.from(subscribers)).emit('build-log', log);
    }
  }

  broadcastHealthStatus(deploymentId: string, status: any): void {
    const subscribers = this.deploymentSubscribers.get(deploymentId);
    if (subscribers) {
      this.server.to(Array.from(subscribers)).emit('health-status', status);
    }
  }

  broadcastError(deploymentId: string, error: any): void {
    const subscribers = this.deploymentSubscribers.get(deploymentId);
    if (subscribers) {
      this.server.to(Array.from(subscribers)).emit('deployment-error', error);
    }
  }
}