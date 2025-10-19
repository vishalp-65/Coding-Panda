import { ValidationResult, ValidationError } from '../types/common';

/**
 * Validate required fields in an object
 */
export function validateRequiredFields(
    obj: any,
    requiredFields: string[]
): ValidationResult {
    const errors: ValidationError[] = [];

    for (const field of requiredFields) {
        const value = getNestedValue(obj, field);

        if (value === undefined || value === null || value === '') {
            errors.push({
                field,
                message: `${field} is required`,
                code: 'REQUIRED_FIELD_MISSING'
            });
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationError | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        return {
            field: 'email',
            message: 'Invalid email format',
            code: 'INVALID_EMAIL_FORMAT'
        };
    }

    return null;
}

/**
 * Validate string length
 */
export function validateStringLength(
    value: string,
    field: string,
    minLength?: number,
    maxLength?: number
): ValidationError | null {
    if (minLength !== undefined && value.length < minLength) {
        return {
            field,
            message: `${field} must be at least ${minLength} characters long`,
            code: 'MIN_LENGTH_VIOLATION'
        };
    }

    if (maxLength !== undefined && value.length > maxLength) {
        return {
            field,
            message: `${field} must be at most ${maxLength} characters long`,
            code: 'MAX_LENGTH_VIOLATION'
        };
    }

    return null;
}

/**
 * Validate numeric range
 */
export function validateNumericRange(
    value: number,
    field: string,
    min?: number,
    max?: number
): ValidationError | null {
    if (min !== undefined && value < min) {
        return {
            field,
            message: `${field} must be at least ${min}`,
            code: 'MIN_VALUE_VIOLATION'
        };
    }

    if (max !== undefined && value > max) {
        return {
            field,
            message: `${field} must be at most ${max}`,
            code: 'MAX_VALUE_VIOLATION'
        };
    }

    return null;
}

/**
 * Validate array length
 */
export function validateArrayLength(
    array: any[],
    field: string,
    minLength?: number,
    maxLength?: number
): ValidationError | null {
    if (minLength !== undefined && array.length < minLength) {
        return {
            field,
            message: `${field} must contain at least ${minLength} items`,
            code: 'MIN_ARRAY_LENGTH_VIOLATION'
        };
    }

    if (maxLength !== undefined && array.length > maxLength) {
        return {
            field,
            message: `${field} must contain at most ${maxLength} items`,
            code: 'MAX_ARRAY_LENGTH_VIOLATION'
        };
    }

    return null;
}

/**
 * Validate enum values
 */
export function validateEnum(
    value: string,
    field: string,
    allowedValues: string[]
): ValidationError | null {
    if (!allowedValues.includes(value)) {
        return {
            field,
            message: `${field} must be one of: ${allowedValues.join(', ')}`,
            code: 'INVALID_ENUM_VALUE'
        };
    }

    return null;
}

/**
 * Validate UUID format
 */
export function validateUUID(value: string, field: string): ValidationError | null {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(value)) {
        return {
            field,
            message: `${field} must be a valid UUID`,
            code: 'INVALID_UUID_FORMAT'
        };
    }

    return null;
}

/**
 * Validate date format (ISO 8601)
 */
export function validateDate(value: string, field: string): ValidationError | null {
    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return {
            field,
            message: `${field} must be a valid ISO 8601 date`,
            code: 'INVALID_DATE_FORMAT'
        };
    }

    return null;
}

/**
 * Validate URL format
 */
export function validateURL(value: string, field: string): ValidationError | null {
    try {
        new URL(value);
        return null;
    } catch {
        return {
            field,
            message: `${field} must be a valid URL`,
            code: 'INVALID_URL_FORMAT'
        };
    }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
    limit?: number,
    offset?: number
): ValidationResult {
    const errors: ValidationError[] = [];

    if (limit !== undefined) {
        const limitError = validateNumericRange(limit, 'limit', 1, 100);
        if (limitError) errors.push(limitError);
    }

    if (offset !== undefined) {
        const offsetError = validateNumericRange(offset, 'offset', 0);
        if (offsetError) errors.push(offsetError);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate user roles
 */
export function validateUserRoles(roles: string[]): ValidationResult {
    const validRoles = ['user', 'admin', 'moderator', 'contest_creator'];
    const errors: ValidationError[] = [];

    for (const role of roles) {
        if (!validRoles.includes(role)) {
            errors.push({
                field: 'roles',
                message: `Invalid role: ${role}. Valid roles are: ${validRoles.join(', ')}`,
                code: 'INVALID_USER_ROLE'
            });
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate programming language
 */
export function validateProgrammingLanguage(language: string): ValidationError | null {
    const supportedLanguages = ['python', 'javascript', 'java', 'cpp', 'go', 'rust', 'typescript', 'c', 'csharp'];

    if (!supportedLanguages.includes(language.toLowerCase())) {
        return {
            field: 'language',
            message: `Unsupported language: ${language}. Supported languages are: ${supportedLanguages.join(', ')}`,
            code: 'UNSUPPORTED_LANGUAGE'
        };
    }

    return null;
}

/**
 * Validate difficulty level
 */
export function validateDifficulty(difficulty: string): ValidationError | null {
    const validDifficulties = ['easy', 'medium', 'hard'];

    if (!validDifficulties.includes(difficulty.toLowerCase())) {
        return {
            field: 'difficulty',
            message: `Invalid difficulty: ${difficulty}. Valid difficulties are: ${validDifficulties.join(', ')}`,
            code: 'INVALID_DIFFICULTY'
        };
    }

    return null;
}

/**
 * Validate priority level
 */
export function validatePriority(priority: string): ValidationError | null {
    const validPriorities = ['low', 'normal', 'high', 'urgent'];

    if (!validPriorities.includes(priority.toLowerCase())) {
        return {
            field: 'priority',
            message: `Invalid priority: ${priority}. Valid priorities are: ${validPriorities.join(', ')}`,
            code: 'INVALID_PRIORITY'
        };
    }

    return null;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
}

/**
 * Combine multiple validation results
 */
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
    const allErrors: ValidationError[] = [];

    for (const result of results) {
        allErrors.push(...result.errors);
    }

    return {
        isValid: allErrors.length === 0,
        errors: allErrors
    };
}

/**
 * Create custom validation function
 */
export function createValidator<T>(
    validationFn: (value: T) => ValidationError | null
) {
    return validationFn;
}

/**
 * Validate object against schema
 */
export function validateSchema<T>(
    obj: T,
    schema: Record<string, (value: any) => ValidationError | null>
): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, validator] of Object.entries(schema)) {
        const value = getNestedValue(obj, field);
        const error = validator(value);

        if (error) {
            errors.push(error);
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}