export interface CommerceCustomerCandidate {
  id: string;
  name: string;
  email: string;
  kind: string;
  taxCode: string;
  vatNumber: string;
  identityHash: string;
}
export interface CommerceCustomerLinkDetails {
  profile: {
    id: string;
    name: string;
    email: string;
    kind: "individual" | "company";
    identityHash: string;
  };
  link: {
    status: "pending" | "linked" | "review_required" | "blocked";
    revision: number | null;
    evidenceCode: string;
    profileChanged: boolean;
    customerChanged: boolean;
  };
  linkedCustomer: CommerceCustomerCandidate | null;
  previousCandidate: CommerceCustomerCandidate | null;
  candidates: CommerceCustomerCandidate[];
  moreCandidates: boolean;
}
