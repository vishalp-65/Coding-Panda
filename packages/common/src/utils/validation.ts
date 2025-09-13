export class ValidationUtils {
    static isValidObjectId(id: string): boolean {
        return /^[0-9a-fA-F]{24}$/.test(id);
    }

    static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isValidPassword(password: string): boolean {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    }

    static sanitizeString(str: string): string {
        return str.trim().replace(/[<>]/g, '');
    }

    static validatePagination(page?: string, limit?: string): { page: number; limit: number } {
        const parsedPage = parseInt(page || '1');
        const parsedLimit = parseInt(limit || '10');

        if (parsedPage < 1) {
            throw new Error('Page must be greater than 0');
        }

        if (parsedLimit < 1 || parsedLimit > 100) {
            throw new Error('Limit must be between 1 and 100');
        }

        return { page: parsedPage, limit: parsedLimit };
    }

    static validateRequired(value: any, fieldName: string): void {
        if (value === undefined || value === null || value === '') {
            throw new Error(`${fieldName} is required`);
        }
    }
}