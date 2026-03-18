import { AxiosError } from "axios";

interface ServerError {
  message: string;
}

type TranslationFunction = (key: string) => string;

export const handleAuthError = (err: AxiosError<ServerError>, t: TranslationFunction): string => {
  const status = err.response?.status;

  switch (status) {
    case 401:
      return t("unauthorized");
    case 403:
      return t("forbidden");
    case 429:
      return t("too_many_requests");
    case 422:
      // Sử dụng nullish coalescing (??) để an toàn
      return err.response?.data?.message ?? t("validation_error");
    default:
      return err.response?.data?.message ?? t("default_error");
  }
};
