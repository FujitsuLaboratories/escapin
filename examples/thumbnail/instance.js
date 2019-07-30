import { resize } from 'imagemagick';

export const images: s3 = {};
export const thumbnails: s3 = {};

export const imagesGET = _ => {
  return Object.keys(images);
};

export const imagesPOST = req => {
  const id = req.formData.name;
  images[id] = req.formData.image;
  resize(
    {
      srcData: new Buffer(images[id], 'binary'),
      format: 'jpeg',
      width: 100,
    },
    (err, stdout, stderr) => {
      if (err) {
        throw new Error(`500: ${err}`);
      }
      thumbnails[id] = new Buffer(stdout, 'binary');
      return { id };
    },
  );
};

export const imagesIdDELETE = req => {
  const id = req.path.id;
  if (images[id] === undefined) {
    return new Error(`404: ${id} not found.`);
  }
  delete images[id];
  return `${id} deleted`;
};

export const imagesIdGET = req => {
  const id = req.path.id;
  if (images[id] === undefined) {
    return new Error(`404: ${id} not found.`);
  }
  return images[id];
};

export const imagesIdThumbnailGET = req => {
  return thumbnails[req.path.id];
};
