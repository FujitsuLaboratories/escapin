const $TEMPVAR = new S3().listObjectsV2({
  Bucket: $NAME,
});
const $VAR = $TEMPVAR.Contents.map(that => that.Key);
