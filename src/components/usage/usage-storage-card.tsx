import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { formatBytes } from "./usage-helpers";

interface StorageCardProps {
  storageUsage: {
    files: { count: number; totalBytes: number };
    attachments: { count: number; totalBytes: number };
    total: number;
  } | null;
  planLimits: { maxStorageBytes: number };
}

export function UsageStorageCard({ storageUsage, planLimits }: StorageCardProps) {
  const { t } = useTranslation();

  const total = storageUsage?.total ?? 0;
  const percent = planLimits.maxStorageBytes > 0
    ? Math.round((total / planLimits.maxStorageBytes) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("labels.storage")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">{formatBytes(total)}</span>
          <span className="text-sm text-muted-foreground">/ {formatBytes(planLimits.maxStorageBytes)}</span>
        </div>

        <Progress value={percent} max={100}>
          <ProgressLabel>{t("labels.storage")}</ProgressLabel>
          <ProgressValue>{percent}%</ProgressValue>
        </Progress>

        {storageUsage && (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("labels.filesStorage")}</span>
              <span className="tabular-nums">
                {storageUsage.files.count} ({formatBytes(storageUsage.files.totalBytes)})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("labels.attachmentsStorage")}</span>
              <span className="tabular-nums">
                {storageUsage.attachments.count} ({formatBytes(storageUsage.attachments.totalBytes)})
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
