import Exa from "exa-js";

let instance: Exa | null = null;

export function getExaClient(): Exa {
  if (!instance) {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) throw new Error("EXA_API_KEY environment variable is not set");
    instance = new Exa(apiKey);
  }
  return instance;
}
