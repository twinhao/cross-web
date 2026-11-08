import type { User } from "../types/auth.ts";

const SYSTEM_ADMIN_ROLES = new Set(["admin", "superadmin"]);
const FACILITY_ROLES = new Set(["facility_admin", "facility_staff", "facility_receptionist"]);

/** 後台角色；櫃檯日常操作與管理設定分開。 */
export const STAFF_ROLE_NAMES = [
  "superadmin",
  "admin",
  "facility_admin",
  "facility_staff",
  "facility_receptionist",
] as const;

const STAFF_ROLE_SET: Set<string> = new Set(STAFF_ROLE_NAMES);
const FACILITY_BOUND_ROLE_SET = new Set(["facility_admin", "facility_staff", "facility_receptionist"]);

/** 是否為後台員工角色（用於過濾後台 user 列表與 role 選項） */
export function isStaffRole(roleName: string): boolean {
  return STAFF_ROLE_SET.has(roleName);
}

/** 該角色是否「必須」綁定一個院所 */
export function requiresFacility(roleName: string): boolean {
  return FACILITY_BOUND_ROLE_SET.has(roleName);
}

export function isSystemAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.roles.some((role) => SYSTEM_ADMIN_ROLES.has(role));
}

export function isFacilityUser(user: User | null): boolean {
  if (!user) return false;
  return (
    user.roles.some((role) => FACILITY_ROLES.has(role)) && !!user.facility_id
  );
}

export function canAccessAdmin(user: User | null): boolean {
  return isSystemAdmin(user) || isFacilityUser(user);
}

/** 與後端院所寫入權限一致；介面判斷不能取代 API 授權。 */
export function canManageFacility(user: User | null, facilityId: string): boolean {
  if (!user) return false;
  return (
    (isSystemAdmin(user) && !user.facility_id) ||
    (user.roles.includes("facility_admin") && user.facility_id === facilityId)
  );
}

/** 櫃檯只處理所屬院所的預約、報到及叫號。 */
export function canOperateFacility(user: User | null, facilityId: string): boolean {
  return canManageFacility(user, facilityId) || !!user &&
    user.roles.includes("facility_receptionist") && user.facility_id === facilityId;
}

export function getAdminHomePath(user: User | null): string {
  // 系統管理員與院所使用者登入後都先進總覽 Dashboard
  if (isSystemAdmin(user)) return "/admin/dashboard";
  if (isFacilityUser(user) && user?.facility_id) {
    return "/admin/dashboard";
  }
  return "/";
}
