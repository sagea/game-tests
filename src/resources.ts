export const resources = {
  USER_IMAGE: '/sprites/MainPlayer.png',
} as const;

type ResourceNames = keyof typeof resources;
type ResourceValues = typeof resources[ResourceNames];

type ImageBitmap = { width: number; height: number; close: () => void; }

export const loadedResources = new Map<string, ImageBitmap>();

export const addResource = (url: string, imageBitmap: ImageBitmap) => {
  loadedResources.set(url, imageBitmap);
}

export const removeResource = (url: ResourceValues) => {
  const resource = loadedResources.get(url)
  if (resource) {
    resource.close();
  }
}

export const loadImage = async (url: string): Promise<ImageBitmap> => {
  const pre = await fetch(url);
  const blob = await pre.blob();
  return createImageBitmap(blob)
}
