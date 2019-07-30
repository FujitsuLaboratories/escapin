export function $VAR(event, context, callback) {
  try {
    const $VAR = new S3().getObject({
      Bucket: $NAME,
      Key: event.Records[0].s3.object.key,
    }).Body;
    $BODY;
    callback(null, 'Succeeded');
  } catch (err) {
    callback(err);
  }
}
