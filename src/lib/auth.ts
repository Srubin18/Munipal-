import { createClient } from './supabase/server';
import { prisma } from './db';

/**
 * Get current authenticated user from Supabase Auth + Prisma profile
 */
export async function getCurrentUser() {
  const supabase = createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) return null;

  // Get full user profile from Prisma
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      category: true,
    },
  });

  return user;
}

/**
 * Get current auth session (for client-side)
 */
export async function getSession() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
