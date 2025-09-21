import { ContestService } from '../../src/services/contest.service';
import { ContestRepository } from '../../src/repositories/contest.repository';
import { NotificationService } from '../../src/services/notification.service';
import { CodeExecutionService } from '../../src/services/code-execution.service';
import {
  Contest,
  ContestStatus,
  ScoringType,
  CreateContestRequest,
} from '../../src/types/contest.types';

// Mock dependencies
jest.mock('../../src/repositories/contest.repository');
jest.mock('../../src/services/notification.service');
jest.mock('../../src/services/code-execution.service');

describe('ContestService', () => {
  let contestService: ContestService;
  let mockContestRepository: jest.Mocked<ContestRepository>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockCodeExecutionService: jest.Mocked<CodeExecutionService>;

  const mockContest: Contest = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Contest',
    description: 'A test contest',
    startTime: new Date('2024-12-01T10:00:00Z'),
    endTime: new Date('2024-12-01T12:00:00Z'),
    registrationStart: new Date('2024-11-01T00:00:00Z'),
    registrationEnd: new Date('2024-12-01T09:00:00Z'),
    maxParticipants: 100,
    problemIds: ['problem1', 'problem2'],
    rules: {},
    scoringType: ScoringType.STANDARD,
    status: ContestStatus.DRAFT,
    isPublic: true,
    createdBy: 'user123',
    prizePool: 1000,
    createdAt: new Date('2024-11-01T00:00:00Z'),
    updatedAt: new Date('2024-11-01T00:00:00Z'),
  };

  beforeEach(() => {
    mockContestRepository = new ContestRepository(
      {} as any
    ) as jest.Mocked<ContestRepository>;
    mockNotificationService =
      new NotificationService() as jest.Mocked<NotificationService>;
    mockCodeExecutionService =
      new CodeExecutionService() as jest.Mocked<CodeExecutionService>;

    contestService = new ContestService(
      mockContestRepository,
      mockNotificationService,
      mockCodeExecutionService
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createContest', () => {
    const createContestRequest: CreateContestRequest = {
      title: 'Test Contest',
      description: 'A test contest',
      startTime: '2024-12-01T10:00:00Z',
      endTime: '2024-12-01T12:00:00Z',
      registrationEnd: '2024-12-01T09:00:00Z',
      maxParticipants: 100,
      problemIds: ['problem1', 'problem2'],
      rules: {},
      scoringType: ScoringType.STANDARD,
      isPublic: true,
      prizePool: 1000,
    };

    it('should create a contest successfully', async () => {
      // Arrange
      mockContestRepository.createContest.mockResolvedValue(mockContest);

      // Act
      const result = await contestService.createContest(
        createContestRequest,
        'user123'
      );

      // Assert
      expect(mockContestRepository.createContest).toHaveBeenCalledWith(
        createContestRequest,
        'user123'
      );
      expect(result).toEqual(mockContest);
    });

    it('should throw error if problem validation fails', async () => {
      // Arrange
      const invalidRequest = { ...createContestRequest, problemIds: [] };

      // Act & Assert
      await expect(
        contestService.createContest(invalidRequest, 'user123')
      ).rejects.toThrow();
    });
  });

  describe('getContest', () => {
    it('should return contest if found', async () => {
      // Arrange
      mockContestRepository.getContestById.mockResolvedValue(mockContest);

      // Act
      const result = await contestService.getContest(
        '123e4567-e89b-12d3-a456-426614174000'
      );

      // Assert
      expect(mockContestRepository.getContestById).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000'
      );
      expect(result).toEqual(mockContest);
    });

    it('should return null if contest not found', async () => {
      // Arrange
      mockContestRepository.getContestById.mockResolvedValue(null);

      // Act
      const result = await contestService.getContest('nonexistent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('registerForContest', () => {
    const mockParticipant = {
      id: 'participant123',
      contestId: '123e4567-e89b-12d3-a456-426614174000',
      userId: 'user123',
      username: 'testuser',
      registeredAt: new Date(),
      status: 'registered' as const,
      teamName: undefined,
    };

    it('should register user for contest successfully', async () => {
      // Arrange
      mockContestRepository.getContestById.mockResolvedValue(mockContest);
      mockContestRepository.getParticipant.mockResolvedValue(null);
      mockContestRepository.getContestParticipants.mockResolvedValue([]);
      mockContestRepository.registerParticipant.mockResolvedValue(
        mockParticipant
      );
      mockNotificationService.sendContestRegistrationConfirmation.mockResolvedValue();

      // Act
      const result = await contestService.registerForContest(
        '123e4567-e89b-12d3-a456-426614174000',
        'user123',
        'testuser',
        {}
      );

      // Assert
      expect(mockContestRepository.registerParticipant).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        'user123',
        'testuser',
        undefined
      );
      expect(
        mockNotificationService.sendContestRegistrationConfirmation
      ).toHaveBeenCalledWith('user123', mockContest);
      expect(result).toEqual(mockParticipant);
    });

    it('should throw error if contest not found', async () => {
      // Arrange
      mockContestRepository.getContestById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        contestService.registerForContest(
          'nonexistent-id',
          'user123',
          'testuser',
          {}
        )
      ).rejects.toThrow('Contest not found');
    });

    it('should throw error if user already registered', async () => {
      // Arrange
      mockContestRepository.getContestById.mockResolvedValue(mockContest);
      mockContestRepository.getParticipant.mockResolvedValue(mockParticipant);

      // Act & Assert
      await expect(
        contestService.registerForContest(
          '123e4567-e89b-12d3-a456-426614174000',
          'user123',
          'testuser',
          {}
        )
      ).rejects.toThrow('Already registered for this contest');
    });

    it('should throw error if contest is full', async () => {
      // Arrange
      const fullContest = { ...mockContest, maxParticipants: 1 };
      const existingParticipants = [mockParticipant];

      mockContestRepository.getContestById.mockResolvedValue(fullContest);
      mockContestRepository.getParticipant.mockResolvedValue(null);
      mockContestRepository.getContestParticipants.mockResolvedValue(
        existingParticipants
      );

      // Act & Assert
      await expect(
        contestService.registerForContest(
          '123e4567-e89b-12d3-a456-426614174000',
          'user456',
          'testuser2',
          {}
        )
      ).rejects.toThrow('Contest is full');
    });
  });

  describe('updateContest', () => {
    it('should update contest successfully', async () => {
      // Arrange
      const updates = { title: 'Updated Contest Title' };
      const updatedContest = { ...mockContest, title: 'Updated Contest Title' };

      mockContestRepository.getContestById.mockResolvedValue(mockContest);
      mockContestRepository.updateContest.mockResolvedValue(updatedContest);

      // Act
      const result = await contestService.updateContest(
        '123e4567-e89b-12d3-a456-426614174000',
        updates,
        'user123'
      );

      // Assert
      expect(mockContestRepository.updateContest).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        updates
      );
      expect(result).toEqual(updatedContest);
    });

    it('should throw error if user is not the creator', async () => {
      // Arrange
      mockContestRepository.getContestById.mockResolvedValue(mockContest);

      // Act & Assert
      await expect(
        contestService.updateContest(
          '123e4567-e89b-12d3-a456-426614174000',
          { title: 'New Title' },
          'different-user'
        )
      ).rejects.toThrow('Unauthorized to update this contest');
    });

    it('should throw error if contest is active', async () => {
      // Arrange
      const activeContest = { ...mockContest, status: ContestStatus.ACTIVE };
      mockContestRepository.getContestById.mockResolvedValue(activeContest);

      // Act & Assert
      await expect(
        contestService.updateContest(
          '123e4567-e89b-12d3-a456-426614174000',
          { title: 'New Title' },
          'user123'
        )
      ).rejects.toThrow('Cannot update active or ended contest');
    });
  });

  describe('searchContests', () => {
    it('should return search results', async () => {
      // Arrange
      const searchQuery = {
        status: ContestStatus.UPCOMING,
        page: 1,
        limit: 10,
      };
      const searchResult = { contests: [mockContest], total: 1 };

      mockContestRepository.searchContests.mockResolvedValue(searchResult);

      // Act
      const result = await contestService.searchContests(searchQuery);

      // Assert
      expect(mockContestRepository.searchContests).toHaveBeenCalledWith(
        searchQuery
      );
      expect(result).toEqual({
        contests: [mockContest],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });
});
