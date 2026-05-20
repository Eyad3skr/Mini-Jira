import { CloudWatchClient, PutMetricDataCommand, } from '@aws-sdk/client-cloudwatch';
import { config } from '../config.js';
const cw = new CloudWatchClient({ region: config.awsRegion });
export async function putMetric(metricName, value, dimensions, unit = 'Count') {
    if (config.nodeEnv === 'test')
        return;
    try {
        await cw.send(new PutMetricDataCommand({
            Namespace: config.cloudwatchNamespace,
            MetricData: [
                {
                    MetricName: metricName,
                    Value: value,
                    Unit: unit,
                    Timestamp: new Date(),
                    Dimensions: dimensions
                        ? Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value }))
                        : undefined,
                },
            ],
        }));
    }
    catch (err) {
        console.warn('CloudWatch metric failed:', err);
    }
}
/** Hours from task creation until marked done (for average time-to-close dashboard). */
export function hoursFromCreatedToDone(createdAt, doneAt) {
    const ms = new Date(doneAt).getTime() - new Date(createdAt).getTime();
    return Math.max(0, ms / (1000 * 60 * 60));
}
export async function recordTimeToClose(teamId, createdAt, doneAt) {
    const hours = hoursFromCreatedToDone(createdAt, doneAt);
    await putMetric('TimeToCloseHours', hours, { TeamId: teamId }, 'None');
}
