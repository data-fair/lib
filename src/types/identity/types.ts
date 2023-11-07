export interface Identity {
  type: "user" | "organization";
  id: string;
  name?: string;
  [k: string]: unknown;
}
