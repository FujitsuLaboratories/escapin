export function $VAR(event, context, callback) {
  try {
    for (const record of event.Records) {
      if (record.eventName !== 'INSERT') {
        continue;
      }
      const $VAR =
        record.dynamodb.type.S === 'object' || record.dynamodb.type.S === 'function'
          ? JSON.parse(record.dynamodb.value.S)
          : record.dynamodb.value.S;
      $BODY;
    }
    callback(null, 'Succeeded');
  } catch (err) {
    callback(err);
  }
}
