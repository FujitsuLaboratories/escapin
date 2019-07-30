export function $VAR(event, context, callback) {
  for (const $ITER of event.Records) {
    const $TEMPVAR = new S3().getObject({
      Bucket: $NAME,
      Key: $ITER.s3.object.key,
    });
    let $VAR = Buffer.from($TEMPVAR.Body).toString('utf8');
    $BODY;
  }
  callback(null, 'Succeeded');
}
