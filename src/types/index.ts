// ──── Auth ────
export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterRequest {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  password: string;
  role: "shipper" | "carrier";
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface RegisterResponse extends AuthTokens {
  role: string;
}

// ──── User ────
export interface User {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  created_at: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
}

// ──── Permissions ────
export type CompanyPermission =
  | "company.read"
  | "company.update"
  | "company.member.read"
  | "company.member.create.member"
  | "company.member.create.admin"
  | "company.member.update"
  | "company.member.delete.member"
  | "company.member.delete.admin"
  | "company.carrier.read"
  | "company.carrier.create"
  | "company.carrier.update"
  | "company.carrier.delete"
  | "company.load.read"
  | "company.load.create"
  | "company.load.update"
  | "company.load.delete";

// ──── Company ────
export interface Company {
  id: string;
  name: string;
  owner_id: string;
  role: string;
  status: string;
  created_at: string;
  permissions: CompanyPermission[];
}

export interface CreateCompanyRequest {
  name: string;
}

export interface CreateCompanyResponse {
  id: string;
  name: string;
}

export interface UpdateCompanyRequest {
  name: string;
}

// ──── Members ────
export interface Member {
  member_id: string;
  company_id: string;
  alias: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  created_at: string;
}

export interface AddMemberRequest {
  user_id: string;
  alias: string;
  role: "admin" | "member";
}

export interface MemberSearchResult {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

// ──── Carriers ────
export interface Carrier {
  carrier_id: string;
  first_name: string;
  last_name: string;
  alias: string;
  is_free: boolean;
  status: string;
  created_at: string;
}

export interface AddCarrierRequest {
  carrier_id: string;
  alias: string;
}

export interface CarrierSearchResult {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

// ──── By-contact lookup ────
export interface GetCarrierByContactResponse {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  is_free: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetShipperByContactResponse {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ──── Invite ────
export interface InviteRequest {
  contact: string;
  role: string;
}

export interface InviteResponse {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ──── Loads ────
export type LoadStatus =
  | "created"
  | "assigned"
  | "accepted"
  | "picking_up"
  | "picked_up"
  | "in_transit"
  | "dropping_off"
  | "dropped_off"
  | "completed"      // keep for backward compat
  | "confirmed"
  | "cancelled";

export interface Load {
  id: string;
  title: string;
  description: string;
  reference_id: string;
  company_id: string;
  member_id: string;
  carrier_id: string;
  status: LoadStatus;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_at: string;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLoadRequest {
  company_id: string;
  title: string;
  description?: string;
  reference_id?: string;
  pickup_address?: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_at?: string;
  dropoff_address?: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_at?: string;
  carrier_id?: string;
}

export interface CreateLoadResponse {
  id: string;
  status: string;
}

export interface AssignLoadRequest {
  carrier_id: string;
}

// ──── Tracking ────
export interface Position {
  load_id: string;
  carrier_id: string;
  lat: number;
  lng: number;
  speed_mps: number;
  heading_deg: number;
  accuracy_m: number;
  recorded_at: string;
}

export interface TrackPoint {
  lat: number;
  lng: number;
  speed_mps: number;
  heading_deg: number;
  accuracy_m: number;
  recorded_at: string;
}

export interface TrackResponse {
  load_id: string;
  points: TrackPoint[];
  total: number;
}

// ──── Pagination ────
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  result: T[];
  limit: number;
  offset: number;
  count: number;
}

export interface LoadListParams extends PaginationParams {
  status?: LoadStatus[];
}

// ──── Dashboard Stats ────
export interface LoadStats {
  created: number;
  assigned: number;
  accepted: number;
  picking_up: number;
  picked_up: number;
  in_transit: number;
  dropping_off: number;
  dropped_off: number;
  confirmed: number;
  canceled: number;  // API spells it this way
  total: number;
}
