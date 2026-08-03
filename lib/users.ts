import { createAdminClient } from "@/lib/supabase/admin";
import type { Branch, Role } from "@/types/domain";

/** Resolves a profile's auth email (used for outbound notification emails). */
export async function getAuthEmail(profileId: number): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return null;

  const { data } = await supabase.auth.admin.getUserById(profile.user_id);
  return data.user?.email ?? null;
}

/**
 * Auto-derived student email (decision #3): firstname.lastname@school.edu.
 * full_name here is Arabic-only (no separate English name field exists),
 * so an ASCII slug of it is usually empty — falls back to the unique
 * student code instead, which still satisfies "system-generated, no
 * admin/student typing required" without inventing a transliteration
 * scheme. On a same-slug collision, falls back to the code-based form
 * too (studentCode is already guaranteed globally unique).
 */
export async function generateStudentEmail(
  fullName: string,
  studentCode: string,
): Promise<string> {
  const supabase = createAdminClient();
  const slug = fullName
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .join(".");
  // studentCode is already globally unique (generateStudentCode), so the
  // no-slug fallback never collides. Only same-ASCII-name collisions are
  // possible — resolved by falling back to the same code-based scheme.
  if (!slug) return `student${studentCode}@school.edu`;

  const { data } = await supabase.auth.admin.listUsers();
  const candidateEmail = `${slug}@school.edu`;
  const taken = data.users.some(
    (u) => u.email?.toLowerCase() === candidateEmail.toLowerCase(),
  );
  return taken ? `student${studentCode}@school.edu` : candidateEmail;
}

/** Random 6-digit student code, unique in students (decision #1). */
export async function generateStudentCode(): Promise<string> {
  const supabase = createAdminClient();
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { data } = await supabase
      .from("students")
      .select("user_id")
      .eq("student_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("failed to generate a unique student code");
}

/** Random readable password like "A7k9LmP2" (decision #2). */
export function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(
    { length: 10 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

interface CreateUserBase {
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
}

async function createAuthUserWithProfile(
  base: CreateUserBase,
  role: Role,
): Promise<{ userId: string; profileId: number }> {
  const supabase = createAdminClient();

  const { data: created, error: authError } =
    await supabase.auth.admin.createUser({
      email: base.email,
      password: base.password,
      email_confirm: true,
    });
  if (authError) throw new Error(authError.message);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      user_id: created.user.id,
      role,
      full_name: base.fullName,
      phone: base.phone ?? null,
    })
    .select("id")
    .single();
  if (profileError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    throw new Error(profileError.message);
  }

  return { userId: created.user.id, profileId: profile.id };
}

export async function createStudent(options: {
  fullName: string;
  phone?: string | null;
  classId: number;
  branch: Branch;
  parentId?: number | null;
}): Promise<{
  profileId: number;
  studentCode: string;
  email: string;
  password: string;
  enrolled: number;
}> {
  const supabase = createAdminClient();
  const studentCode = await generateStudentCode();
  const email = await generateStudentEmail(options.fullName, studentCode);
  const password = generatePassword();
  const { profileId } = await createAuthUserWithProfile(
    { email, password, fullName: options.fullName, phone: options.phone },
    "student",
  );

  const { error } = await supabase.from("students").insert({
    user_id: profileId,
    student_code: studentCode,
    class_id: options.classId,
    branch: options.branch,
    parent_id: options.parentId ?? null,
  });
  if (error) throw new Error(error.message);

  // auto-enroll in all active subjects of class+branch
  const { data: enrolled, error: enrollError } = await supabase.rpc(
    "enroll_student_in_class_subjects",
    { p_student_id: profileId },
  );
  if (enrollError) throw new Error(enrollError.message);

  return { profileId, studentCode, email, password, enrolled: enrolled ?? 0 };
}

export async function createTeacher(options: CreateUserBase & {
  specialization?: string | null;
  qualification?: string | null;
}): Promise<{ profileId: number }> {
  const supabase = createAdminClient();
  const { profileId } = await createAuthUserWithProfile(options, "teacher");

  const { error } = await supabase.from("teachers").insert({
    user_id: profileId,
    specialization: options.specialization ?? null,
    qualification: options.qualification ?? null,
    hiring_date: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  return { profileId };
}

export async function createParent(
  options: CreateUserBase,
): Promise<{ profileId: number }> {
  const supabase = createAdminClient();
  const { profileId } = await createAuthUserWithProfile(options, "parent");

  const { error } = await supabase.from("parents").insert({
    user_id: profileId,
  });
  if (error) throw new Error(error.message);

  return { profileId };
}

/**
 * Public self-signup — unlike createStudent/createTeacher/createParent
 * (admin-only, generates credentials), this takes the email/password the
 * person chose themselves and always creates the role row with
 * is_active: false. The account can log in immediately but every
 * protected layout blocks on session.isActive until an admin flips it
 * (see components/shared/PendingActivation.tsx).
 */
export async function selfSignUp(options: CreateUserBase & {
  role: "student" | "teacher" | "parent";
}): Promise<{ profileId: number }> {
  const supabase = createAdminClient();
  const { profileId } = await createAuthUserWithProfile(options, options.role);

  if (options.role === "student") {
    const studentCode = await generateStudentCode();
    const { error } = await supabase.from("students").insert({
      user_id: profileId,
      student_code: studentCode,
      is_active: false,
    });
    if (error) throw new Error(error.message);
  } else if (options.role === "teacher") {
    const { error } = await supabase.from("teachers").insert({
      user_id: profileId,
      hiring_date: new Date().toISOString(),
      is_active: false,
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("parents").insert({
      user_id: profileId,
      is_active: false,
    });
    if (error) throw new Error(error.message);
  }

  return { profileId };
}
