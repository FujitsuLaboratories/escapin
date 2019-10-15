const $TEMPVAR = new DynamoDB().getItem({
  TableName: $NAME,
  Key: {
    key: {
      S: $KEY,
    },
  },
});
if ($TEMPVAR === null || $TEMPVAR.Item === undefined) {
  $VAR = undefined;
} else {
  $VAR =
    $TEMPVAR.Item.type.S === 'object' || $TEMPVAR.Item.type.S === 'function'
      ? JSON.parse($TEMPVAR.Item.value.S)
      : $TEMPVAR.Item.value.S;
}
