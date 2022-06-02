import { removal } from '../animate';
import { query, Component, removeEntity, createComponent } from '../modules/ecs';

declare module '../modules/ecs' {
  export interface ComponentList {
    DeleteQueueManager: Component<'DeleteQueueManager', { markedForDeletion: boolean }>;
  }
}

removal.add(() => {
  for (let { DeleteQueueManager, EntityId } of query(['DeleteQueueManager', 'EntityId'])) {
    const { markedForDeletion } = DeleteQueueManager();
    if (markedForDeletion) {
      removeEntity(EntityId().id);
    }
  }
});
