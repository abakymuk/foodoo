"use server";

import { createClient } from "@/lib/auth/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    avatar: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email || 'user'}`,
  };
}
