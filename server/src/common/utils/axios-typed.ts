// src/common/utils/axios-typed.ts
import axios from 'axios';

export async function typedAxiosGet<T>(url: string): Promise<T> {
  const response = await axios.get<T>(url);
  return response.data;
}
