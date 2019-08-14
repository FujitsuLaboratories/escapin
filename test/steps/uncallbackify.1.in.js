func(arg, (err, p1, p2) => {
  if (err) {
    handleError(err);
    return;
  }
  doSomething(p1, p2);
});
