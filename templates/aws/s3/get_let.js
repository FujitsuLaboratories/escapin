const $TEMPVAR = new S3().getObject({
  Bucket: $NAME,
  Key: $KEY,
});
let $VAR = Buffer.from($TEMPVAR.Body).toString('utf8');
