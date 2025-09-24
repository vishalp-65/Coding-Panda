import { SubmissionStatus } from '../types/contest.types';
import { logger } from '../utils/logger';

export interface ExecutionRequest {
  code: string;
  language: string;
  problemId: string;
}

export interface ExecutionResult {
  status: SubmissionStatus;
  score: number;
  executionTime?: number;
  memoryUsed?: number;
  testCasesPassed: number;
  totalTestCases: number;
  output?: string;
  error?: string;
}

export class CodeExecutionService {
  private executionServiceUrl: string;

  constructor() {
    this.executionServiceUrl =
      process.env.CODE_EXECUTION_SERVICE_URL || 'http://localhost:3004';
  }

  async executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      logger.info(
        `Executing code for problem ${request.problemId} in ${request.language}`
      );

      // In a real implementation, this would make an HTTP request to the code execution service
      // For now, we'll simulate the execution with mock results
      const mockResult = await this.simulateExecution(request);

      logger.info(`Code execution completed with status: ${mockResult.status}`);
      return mockResult;

      // Real implementation would look like this:
      // const response = await fetch(`${this.executionServiceUrl}/execute`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(request)
      // });

      // if (!response.ok) {
      //   throw new Error(`Code execution service responded with status: ${response.status}`);
      // }

      // const result = await response.json();
      // return this.mapExecutionResult(result);
    } catch (error) {
      logger.error('Error executing code:', error);

      // Return error result
      return {
        status: SubmissionStatus.RUNTIME_ERROR,
        score: 0,
        testCasesPassed: 0,
        totalTestCases: 0,
        error:
          error instanceof Error ? error.message : 'Unknown execution error',
      };
    }
  }

  private async simulateExecution(
    request: ExecutionRequest
  ): Promise<ExecutionResult> {
    // Simulate execution delay
    await new Promise(resolve =>
      setTimeout(resolve, Math.random() * 2000 + 500)
    );

    // Generate mock results based on code characteristics
    const codeLength = request.code.length;
    const hasBasicStructure =
      request.code.includes('function') ||
      request.code.includes('def') ||
      request.code.includes('class');

    // Simulate different outcomes based on code quality
    let status: SubmissionStatus;
    let score: number;
    let testCasesPassed: number;
    const totalTestCases = Math.floor(Math.random() * 10) + 5; // 5-15 test cases

    if (codeLength < 50) {
      // Very short code, likely incomplete
      status = SubmissionStatus.WRONG_ANSWER;
      score = 0;
      testCasesPassed = 0;
    } else if (!hasBasicStructure) {
      // No proper structure
      status = SubmissionStatus.COMPILATION_ERROR;
      score = 0;
      testCasesPassed = 0;
    } else {
      // Simulate various outcomes
      const random = Math.random();
      if (random < 0.6) {
        // 60% chance of acceptance
        status = SubmissionStatus.ACCEPTED;
        score = 100;
        testCasesPassed = totalTestCases;
      } else if (random < 0.8) {
        // 20% chance of partial acceptance
        status = SubmissionStatus.WRONG_ANSWER;
        score = Math.floor(Math.random() * 80) + 20; // 20-100 points
        testCasesPassed = Math.floor(totalTestCases * (score / 100));
      } else if (random < 0.9) {
        // 10% chance of time limit
        status = SubmissionStatus.TIME_LIMIT_EXCEEDED;
        score = Math.floor(Math.random() * 50); // 0-50 points
        testCasesPassed = Math.floor(totalTestCases * 0.3);
      } else {
        // 10% chance of runtime error
        status = SubmissionStatus.RUNTIME_ERROR;
        score = 0;
        testCasesPassed = 0;
      }
    }

    return {
      status,
      score,
      executionTime: Math.floor(Math.random() * 2000) + 100, // 100-2100ms
      memoryUsed: Math.floor(Math.random() * 50000) + 10000, // 10-60MB in KB
      testCasesPassed,
      totalTestCases,
      output:
        status === SubmissionStatus.ACCEPTED
          ? 'All test cases passed!'
          : 'Some test cases failed',
      error:
        status === SubmissionStatus.COMPILATION_ERROR
          ? 'Compilation failed'
          : status === SubmissionStatus.RUNTIME_ERROR
            ? 'Runtime error occurred'
            : undefined,
    };
  }

  private mapExecutionResult(result: any): ExecutionResult {
    return {
      status: result.status,
      score: result.score || 0,
      executionTime: result.executionTime,
      memoryUsed: result.memoryUsed,
      testCasesPassed: result.testCasesPassed || 0,
      totalTestCases: result.totalTestCases || 0,
      output: result.output,
      error: result.error,
    };
  }
}
