import { resize } from 'imagemagick';

export const images: bucket = {};
export const thumbnails: bucket = {};

export const imagesGET = _ => {
  return Object.keys(images);
};

export const imagesPOST = req => {
  const id = req.body.name;
  images[id] = req.body.image;
  resize(
    {
      srcData: Buffer.from(images[id], 'binary'),
      format: 'jpeg',
      width: 100,
    },
    (err, stdout, stderr) => {
      if (err) {
        throw err;
      }
      thumbnails[id] = Buffer.from(stdout, 'binary');
      return { id };
    },
  );
};

export const imagesIdDELETE = req => {
  const id = req.path.id;
  if (images[id] === undefined) {
    throw new Error(`[404] ${id} not found.`);
  }
  delete images[id];
  return `${id} deleted`;
};

export const imagesIdGET = req => {
  const id = req.path.id;
  if (images[id] === undefined) {
    throw new Error(`[404] ${id} not found.`);
  }
  return images[id];
};

export const imagesIdThumbnailGET = req => {
  return thumbnails[req.path.id];
};
