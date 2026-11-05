export interface CommerceAccountRow {
  id: string;
  name: string;
  email: string;
  kind: "individual" | "company";
  verifiedAt: string;
  status: "active" | "suspended" | "closed" | "unavailable";
  accessVersion: number;
  customerLinkStatus?: "pending" | "linked" | "review_required" | "blocked";
}
export interface CommerceAccountList {
  items: CommerceAccountRow[];
  nextCursor: string | null;
}
