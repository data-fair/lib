export interface SessionState {
  user?: User;
  organization?: OrganizationMembership;
  account?: Account;
  accountRole?: string;
  lang?: string;
  dark?: boolean;
  [k: string]: unknown;
}
/**
 * This interface was referenced by `SessionState`'s JSON-Schema
 * via the `definition` "user".
 */
export interface User {
  email: string;
  id: string;
  name: string;
  organizations: OrganizationMembership[];
  isAdmin?: 0 | 1;
  adminMode?: 0 | 1;
  asAdmin?: UserRef;
  pd?: string;
  ipa?: 0 | 1;
}
/**
 * This interface was referenced by `SessionState`'s JSON-Schema
 * via the `definition` "organizationMembership".
 */
export interface OrganizationMembership {
  id: string;
  name: string;
  role: string;
  department?: string;
  departmentName?: string;
  dflt?: boolean;
}
/**
 * This interface was referenced by `SessionState`'s JSON-Schema
 * via the `definition` "userRef".
 */
export interface UserRef {
  id: string;
  name: string;
}
/**
 * This interface was referenced by `SessionState`'s JSON-Schema
 * via the `definition` "account".
 */
export interface Account {
  type: "user" | "organization";
  id: string;
  name: string;
  department?: string;
  departmentName?: string;
}
