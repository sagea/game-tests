import { removal } from '../animate.ts';
import { query, Component, removeEntity, createComponent } from '../modules/ecs/index.ts';

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
