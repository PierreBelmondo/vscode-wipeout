
export type Texture = {
    width: number,
    height: number,
    rgba: number[],
};

export type Textures = Texture[];

/*
export function createImageElement(width: number, height: number, rgba: Uint8ClampedArray): HTMLImageElement {
  // Create temporary canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  // Create 2D context
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.log("Error cannot get canvas 2D context");
    return new Image();
  }

  // Create image data
  const idata = ctx.createImageData(width, height);
  idata.data.set(rgba);
  ctx.putImageData(idata, 0, 0);

  // Create the image
  const image = new Image();
  image.src = canvas.toDataURL();
  return image;
}
*/