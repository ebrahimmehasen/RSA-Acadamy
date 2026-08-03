import { createAdminClient } from "@/lib/supabase/admin";
import { uploadTeacherCv, uploadProfilePicture } from "@/lib/googleDrive/upload";
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

/**
 * Deletes an account entirely (auth user + profile + role row + every
 * dependent row) by deleting the Supabase Auth user. Every FK in the
 * chain (profiles → students/teachers/parents → their child tables) is
 * ON DELETE CASCADE, so a single admin.deleteUser call is sufficient —
 * no manual per-table cleanup needed.
 */
export async function deleteAccount(profileId: number): Promise<void> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) throw new Error("الحساب مش موجود");

  const { error } = await supabase.auth.admin.deleteUser(profile.user_id);
  if (error) throw new Error(error.message);
}

/**
 * Admin-side account edit — updates the shared profile fields
 * (full_name, phone) and, if provided, the Supabase Auth email.
 * Role-specific fields (class/branch, specialization, address, ...)
 * are updated separately by each admin actions.ts against its own
 * table, same as the create flows already do.
 */
export async function updateAccountProfile(
  profileId: number,
  updates: { fullName?: string; phone?: string | null; email?: string },
): Promise<void> {
  const supabase = createAdminClient();

  const profileUpdate: Record<string, string | null> = {};
  if (updates.fullName !== undefined) profileUpdate.full_name = updates.fullName;
  if (updates.phone !== undefined) profileUpdate.phone = updates.phone;
  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", profileId);
    if (error) throw new Error(error.message);
  }

  if (updates.email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", profileId)
      .maybeSingle();
    if (!profile) throw new Error("الحساب مش موجود");

    const { error } = await supabase.auth.admin.updateUserById(profile.user_id, {
      email: updates.email,
    });
    if (error) throw new Error(error.message);
  }
}

/** Admin-side forced password reset — returns the new password once. */
export async function resetAccountPassword(profileId: number): Promise<string> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) throw new Error("الحساب مش موجود");

  const password = generatePassword();
  const { error } = await supabase.auth.admin.updateUserById(profile.user_id, {
    password,
  });
  if (error) throw new Error(error.message);

  return password;
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
  dateOfBirth?: string | null;
  classId?: number | null;
  branch?: Branch | null;
  address?: string | null;
  specialization?: string | null;
  qualification?: string | null;
  subjectCodes?: string[];
  cv?: { buffer: Buffer; fileName: string; mimeType: string } | null;
  profilePicture?: { buffer: Buffer; fileName: string; mimeType: string } | null;
}): Promise<{ profileId: number }> {
  const supabase = createAdminClient();
  const { profileId } = await createAuthUserWithProfile(options, options.role);

  if (options.role === "student") {
    const studentCode = await generateStudentCode();
    const { error } = await supabase.from("students").insert({
      user_id: profileId,
      student_code: studentCode,
      class_id: options.classId ?? null,
      branch: options.branch ?? null,
      date_of_birth: options.dateOfBirth ?? null,
      is_active: false,
    });
    if (error) throw new Error(error.message);
  } else if (options.role === "teacher") {
    const { error } = await supabase.from("teachers").insert({
      user_id: profileId,
      specialization: options.specialization ?? null,
      qualification: options.qualification ?? null,
      hiring_date: new Date().toISOString(),
      is_active: false,
    });
    if (error) throw new Error(error.message);

    if (options.cv) {
      const uploaded = await uploadTeacherCv({
        buffer: options.cv.buffer,
        fileName: options.cv.fileName,
        mimeType: options.cv.mimeType,
        uploadedBy: profileId,
        teacherId: profileId,
      });
      await supabase
        .from("teachers")
        .update({ cv_drive_id: uploaded.fileId })
        .eq("user_id", profileId);
    }

    if (options.subjectCodes && options.subjectCodes.length > 0) {
      await supabase.from("teacher_preferences").upsert(
        { teacher_id: profileId, subjects: options.subjectCodes },
        { onConflict: "teacher_id" },
      );
    }
  } else {
    const { error } = await supabase.from("parents").insert({
      user_id: profileId,
      address: options.address ?? null,
      is_active: false,
    });
    if (error) throw new Error(error.message);
  }

  if (options.profilePicture) {
    const uploaded = await uploadProfilePicture({
      buffer: options.profilePicture.buffer,
      fileName: options.profilePicture.fileName,
      mimeType: options.profilePicture.mimeType,
      uploadedBy: profileId,
      profileId,
      userType: options.role,
    });
    await supabase
      .from("profiles")
      .update({
        profile_picture_url: uploaded.fileUrl,
        profile_picture_drive_id: uploaded.fileId,
      })
      .eq("id", profileId);
  }

  return { profileId };
}
