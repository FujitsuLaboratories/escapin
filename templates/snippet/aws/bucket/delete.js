const $TEMPVAR = new S3().deleteObject({
  Bucket: $NAME,
  Key: $KEY,
});
