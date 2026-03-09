export default () => ({
  otel: {
    serviceName: process.env.OTEL_SERVICE_NAME,
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: process.env.OTEL_EXPORTER_OTLP_HEADERS,
    logLevel: process.env.OTEL_LOG_LEVEL,
  },
});
