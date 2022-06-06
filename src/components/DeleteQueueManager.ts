import { removal } from '../animate.ts';
import { query, Component, removeEntity, creator, ComponentNameSymbol } from '../modules/ecs/mod.ts';

type f = ReturnType<typeof DeleteQueueManager>[typeof ComponentNameSymbol];

declare module '../modules/ecs/mod.ts' {
  export interface ComponentList {
    DeleteQueueManager: Component<'DeleteQueueManager', { markedForDeletion: boolean }>;
  }
}

export const DeleteQueueManager = creator('DeleteQueueManager');

removal.add(() => {
  for (let { DeleteQueueManager, EntityId } of query(['DeleteQueueManager', 'EntityId'])) {
    const { markedForDeletion } = DeleteQueueManager();
    if (markedForDeletion) {
      removeEntity(EntityId().id);
    }
  }
});
