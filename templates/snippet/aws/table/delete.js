const $TEMPVAR = new DynamoDB().deleteItem({
  TableName: $NAME,
  Key: {
    key: {
      S: $KEY,
    },
  },
});
