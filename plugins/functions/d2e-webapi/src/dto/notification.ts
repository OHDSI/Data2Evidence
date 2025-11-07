import { z } from "zod";

export const NotificationJobInstance = z.object({
  instanceId: z.number(),
  name: z.string(),
});

export const NotificationJobParameters = z.object({
  jobName: z.string(),
  jobAuthor: z.string(),
  source_id: z.string().optional(),
  analysis_id: z.string().optional(),
  cohortDefinitionIds: z.string().optional(),
  cohort_definition_id: z.string().optional(),
});

export const NotificationResponseDto = z.array(
  z.object({
    status: z.string(),
    startDate: z.number(),
    endDate: z.number(),
    exitStatus: z.string(),
    executionId: z.number(),
    jobInstance: NotificationJobInstance,
    jobParameters: NotificationJobParameters,
    ownerType: z.string(),
  })
);
export type INotificationResponseDto = z.infer<typeof NotificationResponseDto>;
