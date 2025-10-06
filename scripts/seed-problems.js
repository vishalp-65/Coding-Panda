const mongoose = require('mongoose');

// Problem schema (simplified version for seeding)
const ProblemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    tags: [{ type: String }],
    constraints: {
        timeLimit: { type: Number, required: true },
        memoryLimit: { type: Number, required: true },
        inputFormat: { type: String, required: true },
        outputFormat: { type: String, required: true },
        sampleInput: { type: String },
        sampleOutput: { type: String },
    },
    testCases: [{
        id: { type: String, required: true },
        input: { type: String, required: true },
        expectedOutput: { type: String, required: true },
        isHidden: { type: Boolean, default: false },
        explanation: { type: String },
    }],
    statistics: {
        totalSubmissions: { type: Number, default: 0 },
        acceptedSubmissions: { type: Number, default: 0 },
        acceptanceRate: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0 },
        ratingCount: { type: Number, default: 0 },
    },
    initialCode: {
        javascript: { type: String },
        python: { type: String },
        java: { type: String },
        cpp: { type: String },
    }
}, { timestamps: true });

const Problem = mongoose.model('Problem', ProblemSchema);

const sampleProblems = [
    {
        title: 'Two Sum',
        slug: 'two-sum',
        description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to target*.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.

## Example 1:
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

## Example 2:
\`\`\`
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`

## Example 3:
\`\`\`
Input: nums = [3,3], target = 6
Output: [0,1]
\`\`\`

## Constraints:
- \`2 <= nums.length <= 10^4\`
- \`-10^9 <= nums[i] <= 10^9\`
- \`-10^9 <= target <= 10^9\`
- **Only one valid answer exists.**

## Follow-up:
Can you come up with an algorithm that is less than O(n²) time complexity?`,
        difficulty: 'easy',
        tags: ['Array', 'Hash Table'],
        constraints: {
            timeLimit: 1000,
            memoryLimit: 256,
            inputFormat: 'Array of integers nums and integer target',
            outputFormat: 'Array of two indices',
            sampleInput: 'nums = [2,7,11,15], target = 9',
            sampleOutput: '[0,1]'
        },
        testCases: [
            {
                id: '1',
                input: '[2,7,11,15]\n9',
                expectedOutput: '[0,1]',
                isHidden: false,
                explanation: 'nums[0] + nums[1] = 2 + 7 = 9'
            },
            {
                id: '2',
                input: '[3,2,4]\n6',
                expectedOutput: '[1,2]',
                isHidden: false,
                explanation: 'nums[1] + nums[2] = 2 + 4 = 6'
            },
            {
                id: '3',
                input: '[3,3]\n6',
                expectedOutput: '[0,1]',
                isHidden: false,
                explanation: 'nums[0] + nums[1] = 3 + 3 = 6'
            }
        ],
        statistics: {
            totalSubmissions: 1000000,
            acceptedSubmissions: 495000,
            acceptanceRate: 49.5,
            averageRating: 4.2,
            ratingCount: 15000
        },
        initialCode: {
            javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    
};`,
            python: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        `,
            java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        
    }
}`,
            cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        
    }
};`
        }
    },
    {
        title: 'Add Two Numbers',
        slug: 'add-two-numbers',
        description: `You are given two **non-empty** linked lists representing two non-negative integers. The digits are stored in **reverse order**, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.

You may assume the two numbers do not contain any leading zero, except the number 0 itself.

## Example 1:
\`\`\`
Input: l1 = [2,4,3], l2 = [5,6,4]
Output: [7,0,8]
Explanation: 342 + 465 = 807.
\`\`\`

## Example 2:
\`\`\`
Input: l1 = [0], l2 = [0]
Output: [0]
\`\`\`

## Example 3:
\`\`\`
Input: l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]
Output: [8,9,9,9,0,0,0,1]
\`\`\`

## Constraints:
- The number of nodes in each linked list is in the range \`[1, 100]\`.
- \`0 <= Node.val <= 9\`
- It is guaranteed that the list represents a number that does not have leading zeros.`,
        difficulty: 'medium',
        tags: ['Linked List', 'Math', 'Recursion'],
        constraints: {
            timeLimit: 1000,
            memoryLimit: 256,
            inputFormat: 'Two linked lists l1 and l2',
            outputFormat: 'Linked list representing the sum',
            sampleInput: 'l1 = [2,4,3], l2 = [5,6,4]',
            sampleOutput: '[7,0,8]'
        },
        testCases: [
            {
                id: '1',
                input: '[2,4,3]\n[5,6,4]',
                expectedOutput: '[7,0,8]',
                isHidden: false,
                explanation: '342 + 465 = 807'
            },
            {
                id: '2',
                input: '[0]\n[0]',
                expectedOutput: '[0]',
                isHidden: false,
                explanation: '0 + 0 = 0'
            },
            {
                id: '3',
                input: '[9,9,9,9,9,9,9]\n[9,9,9,9]',
                expectedOutput: '[8,9,9,9,0,0,0,1]',
                isHidden: false,
                explanation: '9999999 + 9999 = 10009998'
            }
        ],
        statistics: {
            totalSubmissions: 800000,
            acceptedSubmissions: 304000,
            acceptanceRate: 38.0,
            averageRating: 4.1,
            ratingCount: 12000
        },
        initialCode: {
            javascript: `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} l1
 * @param {ListNode} l2
 * @return {ListNode}
 */
var addTwoNumbers = function(l1, l2) {
    
};`,
            python: `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next
class Solution:
    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
        `,
            java: `/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode() {}
 *     ListNode(int val) { this.val = val; }
 *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
 * }
 */
class Solution {
    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        
    }
}`,
            cpp: `/**
 * Definition for singly-linked list.
 * struct ListNode {
 *     int val;
 *     ListNode *next;
 *     ListNode() : val(0), next(nullptr) {}
 *     ListNode(int x) : val(x), next(nullptr) {}
 *     ListNode(int x, ListNode *next) : val(x), next(next) {}
 * };
 */
class Solution {
public:
    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
        
    }
};`
        }
    },
    {
        title: 'Longest Substring Without Repeating Characters',
        slug: 'longest-substring-without-repeating-characters',
        description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.

## Example 1:
\`\`\`
Input: s = "abcabcbb"
Output: 3
Explanation: The answer is "abc", with the length of 3.
\`\`\`

## Example 2:
\`\`\`
Input: s = "bbbbb"
Output: 1
Explanation: The answer is "b", with the length of 1.
\`\`\`

## Example 3:
\`\`\`
Input: s = "pwwkew"
Output: 3
Explanation: The answer is "wke", with the length of 3.
Notice that the answer must be a substring, "pwke" is a subsequence and not a substring.
\`\`\`

## Constraints:
- \`0 <= s.length <= 5 * 10^4\`
- \`s\` consists of English letters, digits, symbols and spaces.`,
        difficulty: 'medium',
        tags: ['Hash Table', 'String', 'Sliding Window'],
        constraints: {
            timeLimit: 1000,
            memoryLimit: 256,
            inputFormat: 'String s',
            outputFormat: 'Integer representing the length',
            sampleInput: 's = "abcabcbb"',
            sampleOutput: '3'
        },
        testCases: [
            {
                id: '1',
                input: 'abcabcbb',
                expectedOutput: '3',
                isHidden: false,
                explanation: 'The longest substring is "abc" with length 3'
            },
            {
                id: '2',
                input: 'bbbbb',
                expectedOutput: '1',
                isHidden: false,
                explanation: 'The longest substring is "b" with length 1'
            },
            {
                id: '3',
                input: 'pwwkew',
                expectedOutput: '3',
                isHidden: false,
                explanation: 'The longest substring is "wke" with length 3'
            }
        ],
        statistics: {
            totalSubmissions: 750000,
            acceptedSubmissions: 253500,
            acceptanceRate: 33.8,
            averageRating: 4.3,
            ratingCount: 18000
        },
        initialCode: {
            javascript: `/**
 * @param {string} s
 * @return {number}
 */
var lengthOfLongestSubstring = function(s) {
    
};`,
            python: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        `,
            java: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        
    }
}`,
            cpp: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        
    }
};`
        }
    },
    {
        title: 'Median of Two Sorted Arrays',
        slug: 'median-of-two-sorted-arrays',
        description: `Given two sorted arrays \`nums1\` and \`nums2\` of size \`m\` and \`n\` respectively, return **the median** of the two sorted arrays.

The overall run time complexity should be \`O(log (m+n))\`.

## Example 1:
\`\`\`
Input: nums1 = [1,3], nums2 = [2]
Output: 2.00000
Explanation: merged array = [1,2,3] and median is 2.
\`\`\`

## Example 2:
\`\`\`
Input: nums1 = [1,2], nums2 = [3,4]
Output: 2.50000
Explanation: merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.
\`\`\`

## Constraints:
- \`nums1.length == m\`
- \`nums2.length == n\`
- \`0 <= m <= 1000\`
- \`0 <= n <= 1000\`
- \`1 <= m + n <= 2000\`
- \`-10^6 <= nums1[i], nums2[i] <= 10^6\``,
        difficulty: 'hard',
        tags: ['Array', 'Binary Search', 'Divide and Conquer'],
        constraints: {
            timeLimit: 1000,
            memoryLimit: 256,
            inputFormat: 'Two sorted arrays nums1 and nums2',
            outputFormat: 'Double representing the median',
            sampleInput: 'nums1 = [1,3], nums2 = [2]',
            sampleOutput: '2.00000'
        },
        testCases: [
            {
                id: '1',
                input: '[1,3]\n[2]',
                expectedOutput: '2.00000',
                isHidden: false,
                explanation: 'Merged array is [1,2,3], median is 2'
            },
            {
                id: '2',
                input: '[1,2]\n[3,4]',
                expectedOutput: '2.50000',
                isHidden: false,
                explanation: 'Merged array is [1,2,3,4], median is (2+3)/2 = 2.5'
            }
        ],
        statistics: {
            totalSubmissions: 500000,
            acceptedSubmissions: 176000,
            acceptanceRate: 35.2,
            averageRating: 4.5,
            ratingCount: 8000
        },
        initialCode: {
            javascript: `/**
 * @param {number[]} nums1
 * @param {number[]} nums2
 * @return {number}
 */
var findMedianSortedArrays = function(nums1, nums2) {
    
};`,
            python: `class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        `,
            java: `class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        
    }
}`,
            cpp: `class Solution {
public:
    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {
        
    }
};`
        }
    },
    //     {
    //         title: 'Valid Parentheses',
    //         slug: 'valid-parentheses',
    //         description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

    // An input string is valid if:
    // 1. Open brackets must be closed by the same type of brackets.
    // 2. Open brackets must be closed in the correct order.
    // 3. Every close bracket has a corresponding open bracket of the same type.

    // ## Example 1:
    // \`\`\`
    // Input: s = "()"
    // Output: true
    // \`\`\`

    // ## Example 2:
    // \`\`\`
    // Input: s = "()[]{}"
    // Output: true
    // \`\`\`

    // ## Example 3:
    // \`\`\`
    // Input: s = "(]"
    // Output: false
    // \`\`\`

    // ## Constraints:
    // - \`1 <= s.length <= 10^4\`
    // - \`s\` consists of parentheses only \`'()[]{}'``,
    //     difficulty: 'easy',
    //     tags: ['String', 'Stack'],
    //     constraints: {
    //       timeLimit: 1000,
    //       memoryLimit: 256,
    //       inputFormat: 'String s containing parentheses',
    //       outputFormat: 'Boolean indicating if valid',
    //       sampleInput: 's = "()"',
    //       sampleOutput: 'true'
    //     },
    //     testCases: [
    //       {
    //         id: '1',
    //         input: '()',
    //         expectedOutput: 'true',
    //         isHidden: false,
    //         explanation: 'Valid parentheses pair'
    //       },
    //       {
    //         id: '2',
    //         input: '()[]{} ',
    //         expectedOutput: 'true',
    //         isHidden: false,
    //         explanation: 'All brackets are properly matched'
    //       },
    //       {
    //         id: '3',
    //         input: '(]',
    //         expectedOutput: 'false',
    //         isHidden: false,
    //         explanation: 'Mismatched bracket types'
    //       }
    //     ],
    //     statistics: {
    //       totalSubmissions: 900000,
    //       acceptedSubmissions: 405000,
    //       acceptanceRate: 45.0,
    //       averageRating: 4.0,
    //       ratingCount: 20000
    //     },
    //     initialCode: {
    //       javascript: `
    // /**
    //  * @param {string} 
    //  * @return {boolean}
    //  */
    // var isValid = function (s) {

    //         };`,
    //       python: `class Solution:
    //     def isValid(self, s: str) -> bool:
    //     `,
    //       java: `class Solution {
    //         public boolean isValid(String s) {

    //         }
    //     }`,
    //       cpp: `class Solution {
    //         public:
    //             bool isValid(string s) {

    //             }
    //     }; `
    //     }
    //   }
];

async function seedProblems() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-coding-platform';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Clear existing problems
        await Problem.deleteMany({});
        console.log('Cleared existing problems');

        // Insert sample problems
        const insertedProblems = await Problem.insertMany(sampleProblems);
        console.log(`Inserted ${insertedProblems.length} sample problems`);

        // Display inserted problems
        insertedProblems.forEach((problem, index) => {
            console.log(`${index + 1}. ${problem.title} (${problem.difficulty}) - ${problem.tags.join(', ')} `);
        });

        console.log('Database seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the seeding function
if (require.main === module) {
    seedProblems();
}

module.exports = { seedProblems, sampleProblems };