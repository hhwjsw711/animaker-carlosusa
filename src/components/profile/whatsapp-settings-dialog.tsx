import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Spinner from "@/components/ui/custom/spinner";
import { MessageCircle, Unplug } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

const POLLING_INTERVAL = 3000;
const MAX_ATTEMPTS = 25;

interface WhatsAppSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsAppSettingsDialog({
  open,
  onOpenChange,
}: WhatsAppSettingsDialogProps) {
  const { t } = useTranslation();
  const config = useQuery(api.messagingConfig.queries.getMessagingConfig);
  const connectWhatsApp = useAction(
    api.messagingConfig.actions.connectWhatsApp,
  );
  const disconnectWhatsApp = useAction(
    api.messagingConfig.actions.disconnectWhatsApp,
  );
  const checkStatus = useAction(
    api.messagingConfig.actions.checkWhatsAppStatus,
  );

  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const attemptsRef = useRef(0);

  const isLoading = isConnecting || isDisconnecting;
  const status = config?.evolutionStatus ?? "disconnected";

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQrCodeImage(null);
      attemptsRef.current = 0;
    }
  }, [open]);

  // Poll for connection status while QR is showing
  useEffect(() => {
    if (!open || !qrCodeImage || status === "connected") return;

    const interval = setInterval(async () => {
      attemptsRef.current++;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        clearInterval(interval);
        setQrCodeImage(null);
        toast.error(t("errors.whatsappQrExpired"));
        return;
      }

      try {
        const result = await checkStatus();
        if (result.status === "connected") {
          setQrCodeImage(null);
        }
      } catch {
        // ignore polling errors
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [open, qrCodeImage, status, checkStatus, t]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setQrCodeImage(null);
    attemptsRef.current = 0;

    try {
      const result = await connectWhatsApp();

      if (result.status === "connected") {
        return;
      }

      if (result.qrCode) {
        // Generate QR image from the code string (same as papaias)
        const qrImage = await QRCode.toDataURL(result.qrCode, {
          color: { dark: "#000000", light: "#FFFFFF" },
          width: 512,
          margin: 2,
        });
        setQrCodeImage(qrImage);
      }
    } catch {
      toast.error(t("errors.whatsappConnectionFailed"));
    } finally {
      setIsConnecting(false);
    }
  }, [connectWhatsApp, t]);

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true);
    try {
      await disconnectWhatsApp();
      setQrCodeImage(null);
    } catch {
      toast.error(t("errors.whatsappConnectionFailed"));
    } finally {
      setIsDisconnecting(false);
    }
  }, [disconnectWhatsApp, t]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (isLoading) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("labels.whatsappConnection")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4.5 text-muted-foreground" />
              <span className="text-sm">{t("labels.status")}</span>
            </div>
            <Badge
              variant={status === "connected" ? "default" : "outline"}
              className={
                status === "connected"
                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                  : ""
              }
            >
              {t(`labels.${status}`)}
            </Badge>
          </div>

          {/* Phone number when connected */}
          {status === "connected" && config?.evolutionPhone && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("labels.phone")}
              </span>
              <span className="text-sm font-mono">
                +{config.evolutionPhone}
              </span>
            </div>
          )}

          {/* Warm-up info when connected */}
          {status === "connected" && (
            <div className="flex flex-col gap-2 rounded-lg bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t("labels.warmUpDay")}
                </span>
                <span className="text-xs font-medium">
                  {config?.warmUpDay ?? 0}/7
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t("labels.messagesToday")}
                </span>
                <span className="text-xs font-medium">
                  {config?.messagesToday ?? 0}
                </span>
              </div>
            </div>
          )}

          {/* QR Code */}
          {qrCodeImage && status !== "connected" && (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-lg bg-white p-2">
                <img
                  src={qrCodeImage}
                  alt="WhatsApp QR Code"
                  className="size-56"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {t("labels.scanQrCode")}
              </p>
              <Spinner size={4} />
            </div>
          )}

          {/* Connecting spinner (waiting for QR) */}
          {isConnecting && (
            <div className="flex items-center justify-center py-4">
              <Spinner size={5} />
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          {status === "connected" ? (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {t("actions.close")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isLoading}
              >
                {isDisconnecting ? (
                  <Spinner size={5} />
                ) : (
                  <Unplug className="size-4.5" />
                )}
                {t("actions.disconnect")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {t("actions.close")}
              </Button>
              {!qrCodeImage && (
                <Button onClick={handleConnect} disabled={isLoading}>
                  {isConnecting ? (
                    <Spinner size={5} />
                  ) : (
                    <MessageCircle className="size-4.5" />
                  )}
                  {t("labels.whatsappConnection")}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
