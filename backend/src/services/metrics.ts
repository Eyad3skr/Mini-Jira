import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { config } from '../config.js';

const cw = new CloudWatchClient({ region: config.awsRegion });

export async function putMetric(
  metricName: string,
  value: number,
  dimensions?: Record<string, string>
) {
  if (config.nodeEnv === 'test') return;

  try {
    await cw.send(
      new PutMetricDataCommand({
        Namespace: config.cloudwatchNamespace,
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: 'Count',
            Timestamp: new Date(),
            Dimensions: dimensions
              ? Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value }))
              : undefined,
          },
        ],
      })
    );
  } catch (err) {
    console.warn('CloudWatch metric failed:', err);
  }
}
