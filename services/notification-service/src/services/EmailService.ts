import { EmailConfig, defaultEmailTemplates } from '../config/email';
import { EmailTemplate } from '../types';
import Handlebars from 'handlebars';

export interface EmailData {
    to: string;
    subject: string;
    html: string;
    text: string;
    from?: string;
}

export class EmailService {
    private static instance: EmailService;
    private emailConfig: EmailConfig;
    private templates: Map<string, EmailTemplate>;
    private compiledTemplates: Map<string, { html: HandlebarsTemplateDelegate; text: HandlebarsTemplateDelegate }>;

    private constructor() {
        this.emailConfig = EmailConfig.getInstance();
        this.templates = new Map();
        this.compiledTemplates = new Map();

        // Load default templates
        this.loadDefaultTemplates();

        // Register Handlebars helpers
        this.registerHandlebarsHelpers();
    }

    public static getInstance(): EmailService {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService();
        }
        return EmailService.instance;
    }

    private loadDefaultTemplates(): void {
        for (const template of defaultEmailTemplates) {
            this.templates.set(template.id, template);
            this.compileTemplate(template);
        }
    }

    private registerHandlebarsHelpers(): void {
        // Helper for conditional rendering
        Handlebars.registerHelper('if', function (this: any, conditional: any, options: any) {
            if (conditional) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        // Helper for each loop
        Handlebars.registerHelper('each', function (this: any, context: any, options: any) {
            let ret = '';
            if (context && context.length > 0) {
                for (let i = 0; i < context.length; i++) {
                    ret += options.fn(context[i]);
                }
            }
            return ret;
        });

        // Helper for formatting dates
        Handlebars.registerHelper('formatDate', function (date: any, format: any) {
            if (!date) return '';
            const d = new Date(date);
            if (format === 'short') {
                return d.toLocaleDateString();
            } else if (format === 'long') {
                return d.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
            return d.toISOString();
        });

        // Helper for pluralization
        Handlebars.registerHelper('pluralize', function (count: any, singular: any, plural: any) {
            return count === 1 ? singular : plural;
        });
    }

    private compileTemplate(template: EmailTemplate): void {
        try {
            const htmlTemplate = Handlebars.compile(template.htmlTemplate);
            const textTemplate = Handlebars.compile(template.textTemplate);

            this.compiledTemplates.set(template.id, {
                html: htmlTemplate,
                text: textTemplate
            });
        } catch (error) {
            console.error(`Error compiling template ${template.id}:`, error);
        }
    }

    public async sendEmail(emailData: EmailData): Promise<void> {
        try {
            const transporter = this.emailConfig.getTransporter();

            const mailOptions = {
                from: emailData.from || `${process.env.FROM_NAME || 'AI Platform'} <${process.env.FROM_EMAIL}>`,
                to: emailData.to,
                subject: emailData.subject,
                html: emailData.html,
                text: emailData.text,
            };

            const result = await transporter.sendMail(mailOptions);
            console.log(`Email sent successfully to ${emailData.to}:`, result.messageId);
        } catch (error) {
            console.error(`Error sending email to ${emailData.to}:`, error);
            throw error;
        }
    }

    public async renderTemplate(templateId: string, data: any): Promise<{ html: string; text: string; subject: string }> {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }

        const compiledTemplate = this.compiledTemplates.get(templateId);
        if (!compiledTemplate) {
            throw new Error(`Compiled template ${templateId} not found`);
        }

        try {
            // Render subject
            const subjectTemplate = Handlebars.compile(template.subject);
            const subject = subjectTemplate(data);

            // Render HTML and text
            const html = compiledTemplate.html(data);
            const text = compiledTemplate.text(data);

            return { html, text, subject };
        } catch (error) {
            console.error(`Error rendering template ${templateId}:`, error);
            throw error;
        }
    }

    public async sendTemplatedEmail(to: string, templateId: string, data: any): Promise<void> {
        const rendered = await this.renderTemplate(templateId, data);

        await this.sendEmail({
            to,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text
        });
    }

    public addTemplate(template: EmailTemplate): void {
        this.templates.set(template.id, template);
        this.compileTemplate(template);
    }

    public getTemplate(templateId: string): EmailTemplate | undefined {
        return this.templates.get(templateId);
    }

    public getAllTemplates(): EmailTemplate[] {
        return Array.from(this.templates.values());
    }

    public updateTemplate(templateId: string, updates: Partial<EmailTemplate>): void {
        const existing = this.templates.get(templateId);
        if (!existing) {
            throw new Error(`Template ${templateId} not found`);
        }

        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date()
        };

        this.templates.set(templateId, updated);
        this.compileTemplate(updated);
    }

    public deleteTemplate(templateId: string): void {
        this.templates.delete(templateId);
        this.compiledTemplates.delete(templateId);
    }

    // Bulk email methods
    public async sendBulkEmails(emails: EmailData[]): Promise<void> {
        const promises = emails.map(email => this.sendEmail(email));
        await Promise.all(promises);
    }

    public async sendBulkTemplatedEmails(recipients: string[], templateId: string, data: any): Promise<void> {
        const rendered = await this.renderTemplate(templateId, data);

        const emails = recipients.map(to => ({
            to,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text
        }));

        await this.sendBulkEmails(emails);
    }

    // Template validation
    public validateTemplate(template: Partial<EmailTemplate>): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!template.name) {
            errors.push('Template name is required');
        }

        if (!template.subject) {
            errors.push('Template subject is required');
        }

        if (!template.htmlTemplate) {
            errors.push('HTML template is required');
        }

        if (!template.textTemplate) {
            errors.push('Text template is required');
        }

        // Try to compile templates to check for syntax errors
        if (template.htmlTemplate) {
            try {
                Handlebars.compile(template.htmlTemplate);
            } catch (error: any) {
                errors.push(`HTML template compilation error: ${error.message}`);
            }
        }

        if (template.textTemplate) {
            try {
                Handlebars.compile(template.textTemplate);
            } catch (error: any) {
                errors.push(`Text template compilation error: ${error.message}`);
            }
        }

        if (template.subject) {
            try {
                Handlebars.compile(template.subject);
            } catch (error: any) {
                errors.push(`Subject template compilation error: ${error.message}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Email verification
    public async verifyEmailConfiguration(): Promise<boolean> {
        return await this.emailConfig.verifyConnection();
    }

    // Test email
    public async sendTestEmail(to: string): Promise<void> {
        await this.sendEmail({
            to,
            subject: 'Test Email from AI Platform',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email</h2>
          <p>This is a test email from the AI Platform notification service.</p>
          <p>If you received this email, the email configuration is working correctly.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
            text: `
        Test Email
        
        This is a test email from the AI Platform notification service.
        If you received this email, the email configuration is working correctly.
        
        Sent at: ${new Date().toISOString()}
      `
        });
    }
}