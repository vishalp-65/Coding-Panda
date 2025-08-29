import nodemailer from 'nodemailer';
import { EmailTemplate } from '../types';

export class EmailConfig {
  private static instance: EmailConfig;
  private transporter: nodemailer.Transporter;

  private constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  public static getInstance(): EmailConfig {
    if (!EmailConfig.instance) {
      EmailConfig.instance = new EmailConfig();
    }
    return EmailConfig.instance;
  }

  public getTransporter(): nodemailer.Transporter {
    return this.transporter;
  }

  public async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email server connection verified');
      return true;
    } catch (error) {
      console.error('Email server connection failed:', error);
      return false;
    }
  }
}

export const defaultEmailTemplates: EmailTemplate[] = [
  {
    id: 'contest_start',
    name: 'Contest Start Notification',
    subject: 'Contest "{{contestTitle}}" has started!',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Contest Started! 🚀</h2>
        <p>Hi {{username}},</p>
        <p>The contest <strong>"{{contestTitle}}"</strong> has just started!</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Contest:</strong> {{contestTitle}}</p>
          <p><strong>Duration:</strong> {{duration}}</p>
          <p><strong>Problems:</strong> {{problemCount}}</p>
        </div>
        <a href="{{contestUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Join Contest Now
        </a>
        <p style="margin-top: 20px;">Good luck and happy coding!</p>
        <p>Best regards,<br>The AI Platform Team</p>
      </div>
    `,
    textTemplate: `
      Contest Started!
      
      Hi {{username}},
      
      The contest "{{contestTitle}}" has just started!
      
      Contest: {{contestTitle}}
      Duration: {{duration}}
      Problems: {{problemCount}}
      
      Join the contest: {{contestUrl}}
      
      Good luck and happy coding!
      
      Best regards,
      The AI Platform Team
    `,
    variables: ['username', 'contestTitle', 'duration', 'problemCount', 'contestUrl'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'achievement_unlocked',
    name: 'Achievement Unlocked',
    subject: 'Achievement Unlocked: {{achievementTitle}}',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Achievement Unlocked! 🏆</h2>
        <p>Hi {{username}},</p>
        <p>Congratulations! You've unlocked a new achievement:</p>
        <div style="background-color: #ecfdf5; border: 2px solid #059669; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="color: #059669; margin: 0;">{{achievementTitle}}</h3>
          <p style="margin: 10px 0 0 0;">{{achievementDescription}}</p>
        </div>
        <p>Keep up the great work and continue your coding journey!</p>
        <a href="{{profileUrl}}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Your Profile
        </a>
        <p style="margin-top: 20px;">Best regards,<br>The AI Platform Team</p>
      </div>
    `,
    textTemplate: `
      Achievement Unlocked!
      
      Hi {{username}},
      
      Congratulations! You've unlocked a new achievement:
      
      {{achievementTitle}}
      {{achievementDescription}}
      
      Keep up the great work and continue your coding journey!
      
      View your profile: {{profileUrl}}
      
      Best regards,
      The AI Platform Team
    `,
    variables: ['username', 'achievementTitle', 'achievementDescription', 'profileUrl'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'daily_digest',
    name: 'Daily Activity Digest',
    subject: 'Your Daily Coding Summary - {{date}}',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">Your Daily Coding Summary 📊</h2>
        <p>Hi {{username}},</p>
        <p>Here's what happened in your coding journey today:</p>
        
        {{#if hasActivity}}
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          {{#if problemsSolved}}
          <h3 style="color: #059669; margin-top: 0;">Problems Solved: {{problemsSolved}}</h3>
          {{/if}}
          
          {{#if contestsParticipated}}
          <h3 style="color: #2563eb;">Contests Participated: {{contestsParticipated}}</h3>
          {{/if}}
          
          {{#if achievementsUnlocked}}
          <h3 style="color: #dc2626;">New Achievements: {{achievementsUnlocked}}</h3>
          {{/if}}
          
          {{#if rankingChanges}}
          <h3 style="color: #7c3aed;">Ranking Updates:</h3>
          <ul>
            {{#each rankingChanges}}
            <li>{{contestName}}: Rank #{{newRank}} ({{change}})</li>
            {{/each}}
          </ul>
          {{/if}}
        </div>
        
        {{#if recommendations}}
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #d97706; margin-top: 0;">Recommended for You:</h3>
          <ul>
            {{#each recommendations}}
            <li><a href="{{url}}" style="color: #d97706;">{{title}}</a> - {{description}}</li>
            {{/each}}
          </ul>
        </div>
        {{/if}}
        {{else}}
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>No activity today. Ready to start coding?</p>
          <a href="{{platformUrl}}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Start Coding
          </a>
        </div>
        {{/if}}
        
        <p style="margin-top: 20px;">Keep coding and keep growing!</p>
        <p>Best regards,<br>The AI Platform Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          You're receiving this because you have digest emails enabled. 
          <a href="{{unsubscribeUrl}}" style="color: #6b7280;">Manage preferences</a>
        </p>
      </div>
    `,
    textTemplate: `
      Your Daily Coding Summary
      
      Hi {{username}},
      
      Here's what happened in your coding journey today:
      
      {{#if hasActivity}}
      {{#if problemsSolved}}Problems Solved: {{problemsSolved}}{{/if}}
      {{#if contestsParticipated}}Contests Participated: {{contestsParticipated}}{{/if}}
      {{#if achievementsUnlocked}}New Achievements: {{achievementsUnlocked}}{{/if}}
      
      {{#if rankingChanges}}
      Ranking Updates:
      {{#each rankingChanges}}
      - {{contestName}}: Rank #{{newRank}} ({{change}})
      {{/each}}
      {{/if}}
      
      {{#if recommendations}}
      Recommended for You:
      {{#each recommendations}}
      - {{title}}: {{description}} ({{url}})
      {{/each}}
      {{/if}}
      {{else}}
      No activity today. Ready to start coding?
      Visit: {{platformUrl}}
      {{/if}}
      
      Keep coding and keep growing!
      
      Best regards,
      The AI Platform Team
      
      ---
      Manage preferences: {{unsubscribeUrl}}
    `,
    variables: ['username', 'date', 'hasActivity', 'problemsSolved', 'contestsParticipated', 'achievementsUnlocked', 'rankingChanges', 'recommendations', 'platformUrl', 'unsubscribeUrl'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];