export abstract class MailProvider {
  abstract send(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void>;
  abstract ping(): Promise<void>;
}
