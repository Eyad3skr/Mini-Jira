import { type StandardUnit } from '@aws-sdk/client-cloudwatch';
export declare function putMetric(metricName: string, value: number, dimensions?: Record<string, string>, unit?: StandardUnit): Promise<void>;
/** Hours from task creation until marked done (for average time-to-close dashboard). */
export declare function hoursFromCreatedToDone(createdAt: string, doneAt: string): number;
export declare function recordTimeToClose(teamId: string, createdAt: string, doneAt: string): Promise<void>;
