export interface SessionUser {
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
export interface OrganizationMembership {
    id: string;
    name: string;
    role: string;
    department?: string;
    departmentName?: string;
    dflt?: boolean;
}
export interface UserRef {
    id: string;
    name: string;
}
