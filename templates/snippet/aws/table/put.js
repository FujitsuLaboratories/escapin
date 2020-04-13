const $VAR = $VALUE;
const $TEMPVAR = new DynamoDB().putItem({
  TableName: $NAME,
  Item: {
    key: {
      S: $KEY,
    },
    type: {
      S: typeof $VAR,
    },
    value: {
      S:
        typeof $VAR === 'object' || typeof $VAR === 'function'
          ? JSON.stringify($VAR)
          : $VAR,
    },
  },
});
