import { oigLog } from '@/core/logger';

interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

type EntityCallback = (entity: HassEntity | null) => void;

export class EntityStore {
  private hass: any;
  private subscriptions = new Map<string, Set<EntityCallback>>();
  private cache = new Map<string, HassEntity>();

  constructor(hass: any) {
    this.hass = hass;
    this.init();
  }

  private init(): void {
    if (this.hass?.states) {
      Object.entries(this.hass.states).forEach(([id, entity]) => {
        this.cache.set(id, entity as HassEntity);
      });
    }
    oigLog.debug('EntityStore initialized', { 
      entities: this.cache.size 
    });
  }

  subscribe(entityId: string, callback: EntityCallback): () => void {
    if (!this.subscriptions.has(entityId)) {
      this.subscriptions.set(entityId, new Set());
    }
    
    this.subscriptions.get(entityId)!.add(callback);
    
    const entity = this.cache.get(entityId) || null;
    callback(entity);
    
    oigLog.debug('Entity subscribed', { entityId });
    
    return () => {
      this.subscriptions.get(entityId)?.delete(callback);
      if (this.subscriptions.get(entityId)?.size === 0) {
        this.subscriptions.delete(entityId);
      }
      oigLog.debug('Entity unsubscribed', { entityId });
    };
  }

  get(entityId: string): HassEntity | null {
    return this.cache.get(entityId) || null;
  }

  getAll(): Record<string, HassEntity> {
    return Object.fromEntries(this.cache);
  }

  update(entityId: string, state: string, attributes?: Record<string, any>): void {
    const existing = this.cache.get(entityId);
    const entity: HassEntity = {
      entity_id: entityId,
      state,
      attributes: attributes || existing?.attributes || {},
      last_changed: existing?.last_changed || new Date().toISOString(),
      last_updated: new Date().toISOString(),
    };
    
    this.cache.set(entityId, entity);
    this.notifySubscribers(entityId, entity);
  }

  remove(entityId: string): void {
    this.cache.delete(entityId);
    this.notifySubscribers(entityId, null);
  }

  private notifySubscribers(entityId: string, entity: HassEntity | null): void {
    const callbacks = this.subscriptions.get(entityId);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(entity);
        } catch (e) {
          oigLog.error('Entity callback error', e as Error, { entityId });
        }
      });
    }
  }

  destroy(): void {
    this.subscriptions.clear();
    this.cache.clear();
    oigLog.debug('EntityStore destroyed');
  }
}

export function createEntityStore(hass: any): EntityStore {
  return new EntityStore(hass);
}
