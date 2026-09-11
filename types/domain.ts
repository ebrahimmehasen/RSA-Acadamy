export type Role = "student" | "parent" | "teacher" | "admin";

export interface Profile {
  id: number;
  user_id: string;
  role: Role;
  full_name: string;
  phone: string | null;
  is_super_admin: boolean;
  profile_picture_url: string | null;
  profile_picture_drive_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassRow {
  id: number;
  class_name: string;
  class_short: string;
  class_level: string | null;
  class_type: string | null;
}

// "Private" = a private-lessons student: skips class-wide subject
// auto-enrollment and the shared class schedule — the admin builds
// both individually for them (see docs on class_assignments.student_id).
export type Branch = "Arabic" | "Languages" | "Private";

export interface StudentRow {
  user_id: number;
  student_code: string;
  parent_id: number | null;
  class_id: number | null;
  branch: Branch | null;
  enrollment_date: string;
  is_active: boolean;
}
