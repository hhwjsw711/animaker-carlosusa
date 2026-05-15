/* eslint-disable @typescript-eslint/no-explicit-any */

/** A single content part within an agent message (text, image, file, tool-call, tool-result). */
export interface ContentPart {
  type: string;
  text?: string;
  image?: string | URL | ArrayBuffer;
  data?: string;
  mediaType?: string;
  toolCallId?: string;
  toolName?: string;
  input?: any;
  args?: any;
  output?: any;
  [key: string]: any;
}

/** A message returned by the Convex Agent SDK after merging. */
export interface AgentMessage {
  key: string;
  streaming: boolean;
  status: string;
  order: number;
  stepOrder: number;
  message?: {
    role: string;
    content: string | Array<any>;
  };
  reasoning?: string;
}
