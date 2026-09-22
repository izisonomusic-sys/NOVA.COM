import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { PrismaService } from '../prisma.service';
import { PlatformEventName, PlatformEventPayload } from './platform-events';

@Injectable()
export class PlatformEventsService {
  private readonly emitter = new EventEmitter();
  private readonly logger = new Logger(PlatformEventsService.name);
  constructor(private readonly prisma: PrismaService) {}

  emit(event: PlatformEventName, payload: Omit<PlatformEventPayload, 'event'> = {}) {
    const message: PlatformEventPayload = { event, ...payload, occurredAt: payload.occurredAt || new Date().toISOString() };
    this.emitter.emit(event, message);
    this.emitter.emit('*', message);
    // Persist events in the existing audit_logs table so admins can inspect activity in Supabase.
    void this.prisma.auditLog.create({
      data: {
        actorId: message.userId || null,
        action: event,
        entityType: message.entityId ? 'EVENT_ENTITY' : 'EVENT',
        entityId: message.entityId || null,
        metadata: { ...(message.metadata || {}), occurredAt: message.occurredAt },
      },
    }).catch((error) => this.logger.error(`Unable to persist event ${event}: ${error?.message || error}`));
    return message;
  }

  on(event: PlatformEventName | '*', listener: (payload: PlatformEventPayload) => void) {
    this.emitter.on(event, listener);
  }
}
