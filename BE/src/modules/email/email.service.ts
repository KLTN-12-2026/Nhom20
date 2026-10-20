import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: any = null;

  constructor(private readonly config: ConfigService) {}

  async sendVerificationEmail(input: {
    to: string;
    fullName: string;
    token: string;
  }) {
    const verifyUrl = `${this.config.get('APP_URL', 'http://localhost:5173')}/xac-minh-email?token=${encodeURIComponent(input.token)}`;
    return this.sendTemplate({
      to: input.to,
      subject: 'Xác minh email Smart Clinic',
      template: 'verify-email.hbs',
      data: { fullName: input.fullName, verifyUrl },
    });
  }

  async sendPasswordResetEmail(input: {
    to: string;
    fullName: string;
    token: string;
  }) {
    const resetUrl = `${this.config.get('APP_URL', 'http://localhost:5173')}/dat-lai-mat-khau?token=${encodeURIComponent(input.token)}`;
    return this.sendTemplate({
      to: input.to,
      subject: 'Đặt lại mật khẩu Smart Clinic',
      template: 'reset-password.hbs',
      data: { fullName: input.fullName, resetUrl },
    });
  }

  private async sendTemplate(input: {
    to: string;
    subject: string;
    template: string;
    data: Record<string, string>;
  }) {
    const transporter = this.getTransporter();
    if (!transporter) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình SMTP_EMAIL và SMTP_PASSWORD trong ENV',
      );
    }

    const templatePath = join(__dirname, 'templates', input.template);
    const source = await readFile(templatePath, 'utf8');
    const html = Handlebars.compile(source)(input.data);
    const from = this.config.get(
      'SMTP_FROM',
      this.config.getOrThrow<string>('SMTP_USER'),
    );

    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html,
    });
    this.logger.log(`Đã gửi email ${input.subject} tới ${input.to}`);
    return { sent: true };
  }

  private getTransporter() {
    if (this.transporter) return this.transporter;
    const user = this.config.get<string>('SMTP_USER');
    const password = this.config.get<string>('SMTP_PASSWORD');
    if (!user || !password) return null;

    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'smtp.gmail.com'),
      port: Number(this.config.get('SMTP_PORT', '465')),
      secure: this.config.get('SMTP_SECURE', 'true') === 'true',
      auth: { user, pass: password },
    });
    return this.transporter;
  }
}
