import { removal } from '../animate.ts';
import { query, Component, removeEntity, EntityId } from '../modules/ecs/mod.ts';

export const DeleteQueueManager = Component<{ markedForDeletion: boolean }>();

removal.add(() => {
  for (const { deleteQueueManager, entityId } of query({ deleteQueueManager: DeleteQueueManager, entityId: EntityId})) {
    const { markedForDeletion } = deleteQueueManager();
    if (markedForDeletion) {
      removeEntity(entityId().id);
    }
  }
});
