export default () => ({
  swagger: {
    enabled: process.env.SWAGGER_ENABLE === 'true',
    path: process.env.SWAGGER_PATH,
    title: process.env.SWAGGER_TITLE,
    description: process.env.SWAGGER_DESCRIPTION,
    version: process.env.SWAGGER_VERSION,
  },
});
