export interface SessionState {
    account?: Account;
    accountRole?: string;
    dark?: boolean;
    lang?: string;
    organization?: OrganizationMembership;
    user?: User;
}
export interface Account {
    id: string;
    name: string;
    type: string;
    department?: string;
    departmentName?: string;
}
export interface OrganizationMembership {
    id: string;
    name: string;
    role: string;
    department?: string;
    departmentName?: string;
    dflt?: boolean;
}
export interface User {
    email: string;
    id: string;
    name: string;
    organizations: OrganizationMembership[];
    adminMode?: boolean;
    asAdmin?: UserRef;
    ipa?: string;
    isAdmin?: boolean;
    pd?: string;
}
export interface UserRef {
    id: string;
    name: string;
}
