const $TEMPVAR = new DynamoDB().scan({
  TableName: $NAME,
  ExpressionAttributeNames: {
    '#ky': 'key',
  },
  ProjectionExpression: '#ky',
});
const $VAR = $TEMPVAR.Items.map(item => item.key.S);
