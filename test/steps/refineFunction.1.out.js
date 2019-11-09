export const handle = (req, context, callback) => {
  try {
    callback(null, 'hello');
    return;
  } catch (err) {
    callback(new Error(`[500] ${err.toString()}`));
  }
};
