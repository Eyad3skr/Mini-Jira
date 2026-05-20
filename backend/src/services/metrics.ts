import {
  CloudWatchClient,
  PutMetricDataCommand,
  type StandardUnit,
} from '@aws-sdk/client-cloudwatch';
import { config } from '../config.js';

const cw = new CloudWatchClient({ region: config.awsRegion });

export async function putMetric(
  metricName: string,
  value: number,
  dimensions?: Record<string, string>,
  unit: StandardUnit = 'Count'
) {
  if (config.nodeEnv === 'test') return;

  try {
    const datum: {
      MetricName: string;
      Value: number;
      Timestamp: Date;
      Unit?: StandardUnit;
      Dimensions?: { Name: string; Value: string }[];
    } = {
      MetricName: metricName,
      Value: value,
      Timestamp: new Date(),
      Dimensions: dimensions
        ? Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value }))
        : undefined,
    };
    // CloudWatch dashboards graph custom metrics more reliably without Unit "None"
    if (unit !== 'None') datum.Unit = unit;

    await cw.send(
      new PutMetricDataCommand({
        Namespace: config.cloudwatchNamespace,
        MetricData: [datum],
      })
    );
  } catch (err) {
    console.warn('CloudWatch metric failed:', err);
  }
}

/** Hours from task creation until marked done (for average time-to-close dashboard). */
export function hoursFromCreatedToDone(createdAt: string, doneAt: string): number {
  const ms = new Date(doneAt).getTime() - new Date(createdAt).getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}

export async function recordTimeToClose(
  teamId: string,
  createdAt: string,
  doneAt: string
): Promise<void> {
  const hours = hoursFromCreatedToDone(createdAt, doneAt);
  await putMetric('TimeToCloseHours', hours, { TeamId: teamId }, 'None');
}
