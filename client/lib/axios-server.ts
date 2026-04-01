"use server";

import axios from "axios";
import { cookies } from "next/headers";

export async function createServerApi() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  return axios.create({
    baseURL: process.env.API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}
