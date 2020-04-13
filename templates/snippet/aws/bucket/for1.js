const $TEMPVAR = new S3().putObject({
  Bucket: $NAME,
  Key: $UUID.v4(),
  Body:
    typeof $VAR === 'object' || typeof $VAR === 'function'
      ? JSON.stringify($VAR)
      : $VAR,
});
