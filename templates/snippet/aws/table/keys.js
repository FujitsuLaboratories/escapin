const $VAR = [];
while (true) {
  const params = {
    TableName: $NAME,
    ExpressionAttributeNames: {
      '#ky': 'key',
    },
    ProjectionExpression: '#ky',
  };
  const $TEMPVAR = new DynamoDB().scan(params);
  $VAR.push(...$TEMPVAR.Items.map(item => item.key.S));
  if ($TEMPVAR.LastEvaluatedKey === undefined) {
    break;
  }
  params.ExclusiveStartKey = $TEMPVAR.LastEvaluatedKey;
}
