module.exports = {
  name: 'sendmail',
  api_spec: 'swagger.yaml',
  credentials: [{ api: 'mailgun API', basicAuth: 'api:<YOUR_API_KEY>' }],
  platform: 'aws',
  output_dir: 'build',
};
