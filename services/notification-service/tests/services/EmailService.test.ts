import { EmailService } from '../../src/services/EmailService';

describe('EmailService', () => {
    let emailService: EmailService;

    beforeEach(() => {
        emailService = EmailService.getInstance();
    });

    describe('sendEmail', () => {
        it('should send a basic email', async () => {
            const emailData = {
                to: 'test@example.com',
                subject: 'Test Email',
                html: '<h1>Test Email</h1><p>This is a test email.</p>',
                text: 'Test Email\n\nThis is a test email.'
            };

            await expect(emailService.sendEmail(emailData)).resolves.not.toThrow();
        });

        it('should send email with custom from address', async () => {
            const emailData = {
                to: 'test@example.com',
                subject: 'Test Email',
                html: '<h1>Test Email</h1>',
                text: 'Test Email',
                from: 'custom@example.com'
            };

            await expect(emailService.sendEmail(emailData)).resolves.not.toThrow();
        });
    });

    describe('renderTemplate', () => {
        it('should render a template with data', async () => {
            const templateId = 'contest_start';
            const data = {
                username: 'testuser',
                contestTitle: 'Test Contest',
                duration: '2 hours',
                problemCount: '5',
                contestUrl: 'https://example.com/contest/123'
            };

            const rendered = await emailService.renderTemplate(templateId, data);

            expect(rendered).toHaveProperty('html');
            expect(rendered).toHaveProperty('text');
            expect(rendered).toHaveProperty('subject');
            expect(rendered.html).toContain('testuser');
            expect(rendered.html).toContain('Test Contest');
            expect(rendered.subject).toContain('Test Contest');
        });

        it('should throw error for non-existent template', async () => {
            const templateId = 'non-existent-template';
            const data = {};

            await expect(emailService.renderTemplate(templateId, data)).rejects.toThrow(
                'Template non-existent-template not found'
            );
        });
    });

    describe('sendTemplatedEmail', () => {
        it('should send email using template', async () => {
            const to = 'test@example.com';
            const templateId = 'achievement_unlocked';
            const data = {
                username: 'testuser',
                achievementTitle: 'First Problem Solved',
                achievementDescription: 'Solved your first coding problem',
                profileUrl: 'https://example.com/profile/testuser'
            };

            await expect(emailService.sendTemplatedEmail(to, templateId, data)).resolves.not.toThrow();
        });
    });

    describe('template management', () => {
        it('should get all templates', () => {
            const templates = emailService.getAllTemplates();

            expect(Array.isArray(templates)).toBe(true);
            expect(templates.length).toBeGreaterThan(0);
        });

        it('should get specific template', () => {
            const templateId = 'contest_start';
            const template = emailService.getTemplate(templateId);

            expect(template).toBeDefined();
            expect(template?.id).toBe(templateId);
            expect(template?.name).toBeDefined();
            expect(template?.subject).toBeDefined();
            expect(template?.htmlTemplate).toBeDefined();
            expect(template?.textTemplate).toBeDefined();
        });

        it('should return undefined for non-existent template', () => {
            const template = emailService.getTemplate('non-existent');

            expect(template).toBeUndefined();
        });

        it('should add new template', () => {
            const newTemplate = {
                id: 'test-template',
                name: 'Test Template',
                subject: 'Test Subject',
                htmlTemplate: '<h1>{{title}}</h1><p>{{message}}</p>',
                textTemplate: '{{title}}\n\n{{message}}',
                variables: ['title', 'message'],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            emailService.addTemplate(newTemplate);

            const retrieved = emailService.getTemplate('test-template');
            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe('Test Template');
        });

        it('should update existing template', () => {
            const templateId = 'contest_start';
            const updates = {
                name: 'Updated Contest Start Template'
            };

            emailService.updateTemplate(templateId, updates);

            const updated = emailService.getTemplate(templateId);
            expect(updated?.name).toBe('Updated Contest Start Template');
        });

        it('should delete template', () => {
            const templateId = 'test-template';

            // First add a template
            const newTemplate = {
                id: templateId,
                name: 'Template to Delete',
                subject: 'Subject',
                htmlTemplate: '<p>HTML</p>',
                textTemplate: 'Text',
                variables: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            emailService.addTemplate(newTemplate);

            // Verify it exists
            expect(emailService.getTemplate(templateId)).toBeDefined();

            // Delete it
            emailService.deleteTemplate(templateId);

            // Verify it's gone
            expect(emailService.getTemplate(templateId)).toBeUndefined();
        });
    });

    describe('template validation', () => {
        it('should validate valid template', () => {
            const template = {
                name: 'Valid Template',
                subject: 'Valid Subject',
                htmlTemplate: '<h1>{{title}}</h1>',
                textTemplate: '{{title}}'
            };

            const result = emailService.validateTemplate(template);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should detect missing required fields', () => {
            const template = {
                name: 'Incomplete Template'
                // Missing subject, htmlTemplate, textTemplate
            };

            const result = emailService.validateTemplate(template);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors).toContain('Template subject is required');
            expect(result.errors).toContain('HTML template is required');
            expect(result.errors).toContain('Text template is required');
        });

        it('should detect template compilation errors', () => {
            const template = {
                name: 'Invalid Template',
                subject: 'Subject',
                htmlTemplate: '<h1>{{#invalid}}</h1>', // Invalid Handlebars syntax
                textTemplate: 'Valid text'
            };

            const result = emailService.validateTemplate(template);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('bulk operations', () => {
        it('should send bulk emails', async () => {
            const emails = [
                {
                    to: 'user1@example.com',
                    subject: 'Test 1',
                    html: '<p>Test 1</p>',
                    text: 'Test 1'
                },
                {
                    to: 'user2@example.com',
                    subject: 'Test 2',
                    html: '<p>Test 2</p>',
                    text: 'Test 2'
                }
            ];

            await expect(emailService.sendBulkEmails(emails)).resolves.not.toThrow();
        });

        it('should send bulk templated emails', async () => {
            const recipients = ['user1@example.com', 'user2@example.com'];
            const templateId = 'contest_start';
            const data = {
                username: 'testuser',
                contestTitle: 'Bulk Test Contest',
                duration: '1 hour',
                problemCount: '3',
                contestUrl: 'https://example.com/contest/bulk'
            };

            await expect(
                emailService.sendBulkTemplatedEmails(recipients, templateId, data)
            ).resolves.not.toThrow();
        });
    });

    describe('utility methods', () => {
        it('should verify email configuration', async () => {
            const isVerified = await emailService.verifyEmailConfiguration();

            expect(typeof isVerified).toBe('boolean');
        });

        it('should send test email', async () => {
            const to = 'test@example.com';

            await expect(emailService.sendTestEmail(to)).resolves.not.toThrow();
        });
    });
});