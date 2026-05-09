// lib/actions/authActions.js
"use server";

import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function getMyRole() {
  const session = await getSession();
  if (!session) return { success: false, role: null, teamId: null, id: null };

  try {
    const account = await prisma.account.findUnique({ where: { id: session.id }, select: { role: true, teamId: true } });
    return { success: true, role: account?.role || session.role || null, teamId: account?.teamId || null, id: session.id };
  } catch (error) {
    return { success: true, role: session.role || null, teamId: null, id: session.id };
  }
}
