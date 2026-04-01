// src/common/utils/axios-typed.ts
import axios from 'axios';

export async function typedAxiosGet<T>(
  url: string,
  timeoutMs = 5000,
): Promise<T> {
  const response = await axios.get<T>(url, { timeout: timeoutMs });
  return response.data;
}
