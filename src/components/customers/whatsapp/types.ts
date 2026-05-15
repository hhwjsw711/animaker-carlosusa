export interface WhatsAppMessage {
  _id: string;
  direction: "outbound" | "inbound";
  body: string;
  status: "queued" | "sent" | "delivered" | "failed" | "undelivered" | "received";
  createdAt: number;
  mediaUrl?: string;
  mediaType?: string;
  quotedMessageId?: string;
  externalId?: string;
}
