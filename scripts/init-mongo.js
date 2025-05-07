// Initialize MongoDB for AI Platform
db = db.getSiblingDB('ai_platform');

// Create collections
db.createCollection('problems');
db.createCollection('discussions');
db.createCollection('editorials');

// Create indexes for problems collection
db.problems.createIndex({ "slug": 1 }, { unique: true });
db.problems.createIndex({ "difficulty": 1 });
db.problems.createIndex({ "tags": 1 });
db.problems.createIndex({ "title": "text", "description": "text" });

// Create indexes for discussions collection
db.discussions.createIndex({ "problemId": 1 });
db.discussions.createIndex({ "userId": 1 });
db.discussions.createIndex({ "createdAt": -1 });

// Create sample data
db.problems.insertOne({
  title: "Two Sum",
  slug: "two-sum",
  description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
  difficulty: "easy",
  tags: ["array", "hash-table"],
  constraints: {
    timeLimit: 1000,
    memoryLimit: 256,
    inputFormat: "Array of integers and target integer",
    outputFormat: "Array of two indices"
  },
  testCases: [
    {
      input: "[2,7,11,15]\n9",
      expectedOutput: "[0,1]",
      isHidden: false
    }
  ],
  statistics: {
    totalSubmissions: 0,
    acceptedSubmissions: 0,
    acceptanceRate: 0
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

print("MongoDB initialization completed successfully");