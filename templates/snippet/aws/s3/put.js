const $VAR = $VALUE;
const $TEMPVAR = new S3().putObject({
  Bucket: $NAME,
  Key: $KEY,
  Body: typeof $VAR === 'object' || typeof $VAR === 'function' ? JSON.stringify($VAR) : $VAR,
});
