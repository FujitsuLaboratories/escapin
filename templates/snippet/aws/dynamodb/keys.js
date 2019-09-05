const $VAR = [];
while (true) {
  const $TEMPVAR = new DynamoDB().scan({
    TableName: $NAME,
    ExpressionAttributeNames: {
      '#ky': 'key',
    },
    ProjectionExpression: '#ky',
  });
  $VAR.push(...$TEMPVAR.Items.map(item => item.key.S));
  if ($TEMPVAR.LastEvaluatedKey !== undefined) {
    break;
  }
}
