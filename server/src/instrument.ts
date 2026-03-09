import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export const otelSDK = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME,

  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: {
      Authorization: process.env.OTEL_EXPORTER_OTLP_HEADERS,
    },
  }),

  instrumentations: [getNodeAutoInstrumentations()],
});

otelSDK.start();
