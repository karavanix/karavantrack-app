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

// ──── Telegram OAuth ────
export interface TelegramSignInRequest {
  code: string;
  redirect_uri: string;
  role?: "shipper" | "carrier";
}

export interface TelegramSignInResponse extends AuthTokens {
  role: string;
  is_new_user: boolean;
}

// ──── Email Verification ────
export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface VerifyEmailResponse extends AuthTokens {
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

export interface LoadHistoryAttachment {
  id: number;
  history_id: number;
  attachment_id: string;
  // Best-effort: absent if the server could not resolve a URL for this
  // attachment (deleted from storage, presign failure, etc.).
  url?: string;
  created_at: string;
}

/** Where the driver's phone was at a status change. */
export interface LoadHistoryLocation {
  lat: number;
  lng: number;
  accuracy_m?: number;
  recorded_at: string;
}

export interface LoadHistoryEntry {
  id: number;
  user_id?: string;
  from_status: LoadStatus | "";
  to_status: LoadStatus;
  note?: string;
  created_at: string;
  attachments: LoadHistoryAttachment[];
  /** Absent when the app sent no fix with the step (or an older app). */
  location?: LoadHistoryLocation;
}

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
  // Present on GET /loads/{id} and the driver's active-load endpoint; absent
  // from list responses (LoadResponse without history).
  history?: LoadHistoryEntry[];
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
  note?: string;
  attachment_ids?: string[];
}

// ──── Invite link (shareable, no phone/email required up front) ────
export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

export interface InviteLinkResponse {
  token: string;
  url: string;
  expires_at: string;
}

export interface InviteLoadSummary {
  reference_id: string;
  title: string;
  pickup_address: string;
  pickup_at: string;
  dropoff_address: string;
  dropoff_at: string;
  company_name: string;
}

export interface InvitePublicResponse {
  status: InviteStatus;
  load: InviteLoadSummary;
}

export interface InviteAcceptResponse {
  load_id: string;
}

// ──── Tracking link (public, no-login) ────
export interface TrackingLinkResponse {
  token: string;
  url: string;
}

export interface PublicTrackingPoint {
  address: string;
  lat: number;
  lng: number;
  at: string;
}

export interface PublicTrackingLoad {
  reference_id: string;
  title: string;
  status: LoadStatus;
  pickup: PublicTrackingPoint;
  dropoff: PublicTrackingPoint;
}

export interface PublicTrackingResponse {
  load: PublicTrackingLoad;
  position: Position | null;
  connection?: ConnectionStatus;
}

// ──── Connection status ────
// What the driver's phone is doing on a load, judged by the GPS points it
// sent: moving, standing (the phone sends nothing while standing), silent
// while it should be moving, or with GPS off. not_started = not tracked.
export type ConnectionState = "not_started" | "moving" | "stopped" | "no_data" | "gps_disabled";

export interface ConnectionStatus {
  state: ConnectionState;
  /** gps_disabled only: location services off, or the permission gone. */
  reason?: "location_off" | "permission_denied";
  /** When the truck stopped (stopped) or GPS went off (gps_disabled). */
  since?: string;
  last_point_at?: string;
  /** The phone's battery, 0..1, as of the latest point that reported it. */
  battery_level?: number;
  is_charging?: boolean;
}

// ──── Tracking ────
export interface TrackPoint {
  lat: number;
  lng: number;
  /** null when the phone didn't report it. */
  speed_mps: number | null;
  heading_deg: number | null;
  accuracy_m: number | null;
  recorded_at: string;
}

export interface Position extends TrackPoint {
  load_id: string;
  carrier_id: string;
}

/** GET /track, oldest first; ?after=<RFC 3339> for only the newer points. */
export interface TrackResponse {
  load_id: string;
  points: TrackPoint[];
}

/**
 * matched — along roads; raw — the matcher couldn't place it, drawn as
 * recorded; gap — no data (straight line); stop — a single point.
 */
export type RouteSegmentKind = "matched" | "raw" | "gap" | "stop";

export interface RouteSegment {
  kind: RouteSegmentKind;
  started_at: string;
  ended_at: string;
  /** polyline6 */
  geometry: string;
  distance_m: number;
}

/** GET /loads/{id}/route — 404 until the first match or when matching is off. */
export interface LoadRoute {
  load_id: string;
  /** Distance driven along roads; gaps aren't counted. */
  distance_m: number;
  /** Points recorded after this aren't in the route yet (the live tail). */
  matched_until?: string;
  updated_at: string;
  segments: RouteSegment[];
}

/** GET /routes/preview */
export interface RoutePreview {
  /** polyline6 */
  geometry: string;
  distance_m: number;
  duration_s: number;
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
