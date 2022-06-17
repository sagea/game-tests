import { query, Component, removeEntity, EntityId, AppPlugin } from '../modules/ecs/mod.ts';

export const DeleteQueueManager = Component<{ markedForDeletion: boolean }>();
export const removeMarkedEntities = () => {
  for (const { deleteQueueManager, entityId } of query({ deleteQueueManager: DeleteQueueManager, entityId: EntityId})) {
    const { markedForDeletion } = deleteQueueManager();
    if (markedForDeletion) {
      removeEntity(entityId().id);
    }
  }
}

export const deleteQueuePlugin: AppPlugin = (app) => {
  app.addSystem(removeMarkedEntities);
}
