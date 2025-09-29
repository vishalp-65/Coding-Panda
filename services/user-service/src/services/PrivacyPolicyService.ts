import { Repository } from 'typeorm';
import { User, PrivacyConsent, ConsentType, ConsentStatus } from '../entities';
import { AuditService } from './AuditService';
import { AppDataSource } from '../config/database';

export interface PrivacyPolicyVersion {
    version: string;
    effectiveDate: Date;
    content: string;
    summary: string;
    changes?: string[];
}

export interface ConsentRequirement {
    type: ConsentType;
    required: boolean;
    description: string;
    legalBasis: string;
}

export class PrivacyPolicyService {
    private userRepository: Repository<User>;
    private privacyConsentRepository: Repository<PrivacyConsent>;
    private auditService: AuditService;

    // Current privacy policy version
    private readonly CURRENT_VERSION = '2.0';
    private readonly EFFECTIVE_DATE = new Date('2024-01-01');

    constructor() {
        this.userRepository = AppDataSource.getRepository(User);
        this.privacyConsentRepository = AppDataSource.getRepository(PrivacyConsent);
        this.auditService = new AuditService();
    }

    getCurrentPrivacyPolicy(): PrivacyPolicyVersion {
        return {
            version: this.CURRENT_VERSION,
            effectiveDate: this.EFFECTIVE_DATE,
            content: this.getPrivacyPolicyContent(),
            summary: this.getPrivacyPolicySummary(),
            changes: this.getRecentChanges(),
        };
    }

    getConsentRequirements(): ConsentRequirement[] {
        return [
            {
                type: ConsentType.DATA_PROCESSING,
                required: true,
                description: 'Processing of personal data for core platform functionality',
                legalBasis: 'Legitimate interest and contract performance (GDPR Art. 6(1)(b)(f))',
            },
            {
                type: ConsentType.ANALYTICS,
                required: false,
                description: 'Collection of usage analytics to improve platform performance',
                legalBasis: 'Consent (GDPR Art. 6(1)(a))',
            },
            {
                type: ConsentType.MARKETING,
                required: false,
                description: 'Sending marketing communications and promotional content',
                legalBasis: 'Consent (GDPR Art. 6(1)(a))',
            },
            {
                type: ConsentType.THIRD_PARTY_SHARING,
                required: false,
                description: 'Sharing anonymized data with research partners',
                legalBasis: 'Consent (GDPR Art. 6(1)(a))',
            },
            {
                type: ConsentType.COOKIES,
                required: false,
                description: 'Use of non-essential cookies for enhanced user experience',
                legalBasis: 'Consent (ePrivacy Directive)',
            },
        ];
    }

    async checkUserConsents(userId: string): Promise<{
        hasRequiredConsents: boolean;
        missingConsents: ConsentType[];
        outdatedConsents: ConsentType[];
        allConsents: PrivacyConsent[];
    }> {
        const requirements = this.getConsentRequirements();
        const userConsents = await this.privacyConsentRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });

        // Get latest consent for each type
        const latestConsents = new Map<ConsentType, PrivacyConsent>();
        for (const consent of userConsents) {
            if (!latestConsents.has(consent.consentType)) {
                latestConsents.set(consent.consentType, consent);
            }
        }

        const missingConsents: ConsentType[] = [];
        const outdatedConsents: ConsentType[] = [];

        for (const requirement of requirements) {
            const latestConsent = latestConsents.get(requirement.type);

            if (requirement.required) {
                if (!latestConsent || latestConsent.consentStatus !== ConsentStatus.GRANTED) {
                    missingConsents.push(requirement.type);
                } else if (latestConsent.consentVersion !== this.CURRENT_VERSION) {
                    outdatedConsents.push(requirement.type);
                }
            }
        }

        return {
            hasRequiredConsents: missingConsents.length === 0 && outdatedConsents.length === 0,
            missingConsents,
            outdatedConsents,
            allConsents: userConsents,
        };
    }

    async notifyPolicyUpdate(userId: string): Promise<void> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }

        // Log policy update notification
        await this.auditService.log({
            userId,
            action: 'read',
            resourceType: 'privacy_policy_notification',
            metadata: {
                policyVersion: this.CURRENT_VERSION,
                effectiveDate: this.EFFECTIVE_DATE,
                notificationMethod: 'in_app',
            },
        });

        // In a real implementation, this would trigger:
        // 1. In-app notification
        // 2. Email notification (if user consented)
        // 3. Update user's notification preferences
    }

    async recordPolicyAcceptance(
        userId: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<PrivacyConsent[]> {
        const requirements = this.getConsentRequirements();
        const consents: PrivacyConsent[] = [];

        // Record consent for all required types
        for (const requirement of requirements) {
            if (requirement.required) {
                const consent = this.privacyConsentRepository.create({
                    userId,
                    consentType: requirement.type,
                    consentStatus: ConsentStatus.GRANTED,
                    consentVersion: this.CURRENT_VERSION,
                    consentText: requirement.description,
                    ipAddress,
                    userAgent,
                });

                const savedConsent = await this.privacyConsentRepository.save(consent);
                consents.push(savedConsent);

                await this.auditService.log({
                    userId,
                    action: 'consent_granted',
                    resourceType: 'privacy_policy_acceptance',
                    resourceId: savedConsent.id,
                    ipAddress,
                    userAgent,
                    metadata: {
                        consentType: requirement.type,
                        policyVersion: this.CURRENT_VERSION,
                        required: requirement.required,
                    },
                });
            }
        }

        return consents;
    }

    private getPrivacyPolicyContent(): string {
        return `
# Privacy Policy

## 1. Information We Collect

We collect information you provide directly to us, such as when you create an account, submit code solutions, participate in contests, or contact us for support.

### Personal Information:
- Email address and username
- Profile information (name, bio, location, etc.)
- Account preferences and settings

### Usage Information:
- Code submissions and solutions
- Contest participation and performance
- Learning progress and statistics
- Platform usage analytics

## 2. How We Use Your Information

We use the information we collect to:
- Provide and maintain our coding platform services
- Process your code submissions and provide feedback
- Facilitate contests and competitions
- Personalize your learning experience
- Communicate with you about platform updates
- Improve our services through analytics

## 3. Information Sharing

We do not sell, trade, or otherwise transfer your personal information to third parties except:
- With your explicit consent
- To comply with legal obligations
- To protect our rights and safety
- With service providers under strict confidentiality agreements

## 4. Data Security

We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

## 5. Your Rights

Under GDPR and other privacy laws, you have the right to:
- Access your personal data
- Rectify inaccurate data
- Erase your data ("right to be forgotten")
- Restrict processing of your data
- Data portability
- Object to processing
- Withdraw consent at any time

## 6. Data Retention

We retain your personal information for as long as necessary to provide our services and comply with legal obligations. You can request deletion of your account and associated data at any time.

## 7. Cookies and Tracking

We use cookies and similar technologies to enhance your experience, analyze usage patterns, and provide personalized content. You can control cookie preferences in your browser settings.

## 8. International Transfers

Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.

## 9. Children's Privacy

Our platform is not intended for children under 13. We do not knowingly collect personal information from children under 13.

## 10. Changes to This Policy

We may update this privacy policy from time to time. We will notify you of any material changes and obtain your consent where required by law.

## 11. Contact Us

If you have questions about this privacy policy or our data practices, please contact us at privacy@aicodingplatform.com.

Last updated: ${this.EFFECTIVE_DATE.toISOString().split('T')[0]}
Version: ${this.CURRENT_VERSION}
    `.trim();
    }

    private getPrivacyPolicySummary(): string {
        return `
This privacy policy explains how we collect, use, and protect your personal information when you use our AI-powered coding platform. 

Key points:
• We collect information you provide (email, profile) and usage data (code submissions, progress)
• We use this data to provide services, personalize your experience, and improve our platform
• We don't sell your data to third parties
• You have full control over your data with rights to access, modify, or delete it
• We implement strong security measures to protect your information
• You can withdraw consent and delete your account at any time

For detailed information about your privacy rights and our data practices, please read the full policy below.
    `.trim();
    }

    private getRecentChanges(): string[] {
        return [
            'Enhanced data anonymization procedures for research purposes',
            'Improved consent management with granular controls',
            'Added explicit data retention periods',
            'Strengthened security measures for code execution data',
            'Clarified international data transfer safeguards',
        ];
    }

    // Compliance utilities
    async generatePrivacyImpactAssessment(): Promise<{
        dataTypes: string[];
        processingPurposes: string[];
        legalBases: string[];
        risks: string[];
        safeguards: string[];
    }> {
        return {
            dataTypes: [
                'Email addresses and usernames',
                'Profile information (names, bio, location)',
                'Code submissions and solutions',
                'Contest participation data',
                'Learning progress and statistics',
                'Usage analytics and behavior patterns',
                'IP addresses and device information',
            ],
            processingPurposes: [
                'Account management and authentication',
                'Code execution and feedback provision',
                'Contest organization and ranking',
                'Personalized learning recommendations',
                'Platform improvement and analytics',
                'Communication and support',
                'Security and fraud prevention',
            ],
            legalBases: [
                'Contract performance (GDPR Art. 6(1)(b))',
                'Legitimate interests (GDPR Art. 6(1)(f))',
                'Consent (GDPR Art. 6(1)(a))',
                'Legal compliance (GDPR Art. 6(1)(c))',
            ],
            risks: [
                'Unauthorized access to personal data',
                'Data breach during code execution',
                'Profiling and automated decision-making',
                'International data transfers',
                'Third-party service provider risks',
            ],
            safeguards: [
                'End-to-end encryption for sensitive data',
                'Sandboxed code execution environments',
                'Regular security audits and penetration testing',
                'Data minimization and purpose limitation',
                'Comprehensive audit logging',
                'User consent management system',
                'Data anonymization for analytics',
                'Secure backup and recovery procedures',
            ],
        };
    }
}