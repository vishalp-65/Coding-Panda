import { CodeTemplate, ProgrammingLanguage } from '@ai-platform/types';
import { logger } from '@ai-platform/common';

export interface FunctionDefinition {
    name: string;
    returnType: string;
    parameters: Array<{
        name: string;
        type: string;
    }>;
}

export interface ProblemCodeSpec {
    functionDefinition: FunctionDefinition;
    inputFormat: string;
    outputFormat: string;
    helperClasses?: Record<string, string>; // className -> classDefinition
    imports?: Record<string, string[]>; // language -> imports
}

export class CodeTemplateService {
    /**
     * Generate complete code templates for all supported languages
     */
    generateTemplates(spec: ProblemCodeSpec): Record<string, CodeTemplate> {
        const templates: Record<string, CodeTemplate> = {};

        // Generate templates for each supported language
        templates.python = this.generatePythonTemplate(spec);
        templates.javascript = this.generateJavaScriptTemplate(spec);
        templates.java = this.generateJavaTemplate(spec);
        templates.cpp = this.generateCppTemplate(spec);
        templates.go = this.generateGoTemplate(spec);
        templates.rust = this.generateRustTemplate(spec);

        logger.info(`Generated code templates for problem with function: ${spec.functionDefinition.name}`);
        return templates;
    }

    private generatePythonTemplate(spec: ProblemCodeSpec): CodeTemplate {
        const { functionDefinition, inputFormat, outputFormat, helperClasses, imports } = spec;

        // User editable region - only the function signature and body
        const userEditableRegion = this.generatePythonFunction(functionDefinition);

        // Hidden code - input parsing, function call, output handling
        const hiddenCode = this.generatePythonHiddenCode(
            functionDefinition,
            inputFormat,
            outputFormat,
            helperClasses?.python,
            imports?.python
        );

        return {
            userEditableRegion,
            hiddenCode,
            functionSignature: this.generatePythonFunctionSignature(functionDefinition),
            imports: imports?.python?.join('\n') || '',
            helperClasses: helperClasses?.python || ''
        };
    }

    private generateJavaScriptTemplate(spec: ProblemCodeSpec): CodeTemplate {
        const { functionDefinition, inputFormat, outputFormat, helperClasses, imports } = spec;

        const userEditableRegion = this.generateJavaScriptFunction(functionDefinition);
        const hiddenCode = this.generateJavaScriptHiddenCode(
            functionDefinition,
            inputFormat,
            outputFormat,
            helperClasses?.javascript,
            imports?.javascript
        );

        return {
            userEditableRegion,
            hiddenCode,
            functionSignature: this.generateJavaScriptFunctionSignature(functionDefinition),
            imports: imports?.javascript?.join('\n') || '',
            helperClasses: helperClasses?.javascript || ''
        };
    }

    private generateJavaTemplate(spec: ProblemCodeSpec): CodeTemplate {
        const { functionDefinition, inputFormat, outputFormat, helperClasses, imports } = spec;

        const userEditableRegion = this.generateJavaFunction(functionDefinition);
        const hiddenCode = this.generateJavaHiddenCode(
            functionDefinition,
            inputFormat,
            outputFormat,
            helperClasses?.java,
            imports?.java
        );

        return {
            userEditableRegion,
            hiddenCode,
            functionSignature: this.generateJavaFunctionSignature(functionDefinition),
            imports: imports?.java?.join('\n') || '',
            helperClasses: helperClasses?.java || ''
        };
    }

    private generateCppTemplate(spec: ProblemCodeSpec): CodeTemplate {
        const { functionDefinition, inputFormat, outputFormat, helperClasses, imports } = spec;

        const userEditableRegion = this.generateCppFunction(functionDefinition);
        const hiddenCode = this.generateCppHiddenCode(
            functionDefinition,
            inputFormat,
            outputFormat,
            helperClasses?.cpp,
            imports?.cpp
        );

        return {
            userEditableRegion,
            hiddenCode,
            functionSignature: this.generateCppFunctionSignature(functionDefinition),
            imports: imports?.cpp?.join('\n') || '',
            helperClasses: helperClasses?.cpp || ''
        };
    }

    private generateGoTemplate(spec: ProblemCodeSpec): CodeTemplate {
        const { functionDefinition, inputFormat, outputFormat, helperClasses, imports } = spec;

        const userEditableRegion = this.generateGoFunction(functionDefinition);
        const hiddenCode = this.generateGoHiddenCode(
            functionDefinition,
            inputFormat,
            outputFormat,
            helperClasses?.go,
            imports?.go
        );

        return {
            userEditableRegion,
            hiddenCode,
            functionSignature: this.generateGoFunctionSignature(functionDefinition),
            imports: imports?.go?.join('\n') || '',
            helperClasses: helperClasses?.go || ''
        };
    }

    private generateRustTemplate(spec: ProblemCodeSpec): CodeTemplate {
        const { functionDefinition, inputFormat, outputFormat, helperClasses, imports } = spec;

        const userEditableRegion = this.generateRustFunction(functionDefinition);
        const hiddenCode = this.generateRustHiddenCode(
            functionDefinition,
            inputFormat,
            outputFormat,
            helperClasses?.rust,
            imports?.rust
        );

        return {
            userEditableRegion,
            hiddenCode,
            functionSignature: this.generateRustFunctionSignature(functionDefinition),
            imports: imports?.rust?.join('\n') || '',
            helperClasses: helperClasses?.rust || ''
        };
    }

    // Python generators
    private generatePythonFunction(func: FunctionDefinition): string {
        const params = func.parameters.map(p => p.name).join(', ');
        return `def ${func.name}(${params}):\n    # Write your solution here\n    pass`;
    }

    private generatePythonFunctionSignature(func: FunctionDefinition): string {
        const params = func.parameters.map(p => `${p.name}: ${this.mapTypeToPython(p.type)}`).join(', ');
        return `def ${func.name}(${params}) -> ${this.mapTypeToPython(func.returnType)}:`;
    }

    private generatePythonHiddenCode(
        func: FunctionDefinition,
        inputFormat: string,
        outputFormat: string,
        helperClasses?: string,
        imports?: string[]
    ): string {
        return `#!/usr/bin/env python3
import sys
import json
from typing import *
${imports ? imports.join('\n') : ''}

${helperClasses || ''}

# USER_CODE_PLACEHOLDER

def main():
    try:
        # Read input from stdin
        input_data = sys.stdin.read().strip()
        if not input_data:
            return
        
        # Parse input based on format: ${inputFormat}
        lines = input_data.strip().split('\\n')
        ${this.generatePythonInputParsing(func, inputFormat)}
        
        # Create solution instance and call user function
        solution = Solution()
        result = solution.${func.name}(${func.parameters.map(p => p.name).join(', ')})
        
        # Format output based on format: ${outputFormat}
        ${this.generatePythonOutputFormatting(func.returnType, outputFormat)}
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()`;
    }

    // JavaScript generators
    private generateJavaScriptFunction(func: FunctionDefinition): string {
        const params = func.parameters.map(p => p.name).join(', ');
        return `function ${func.name}(${params}) {\n    // Write your solution here\n    \n}`;
    }

    private generateJavaScriptFunctionSignature(func: FunctionDefinition): string {
        const params = func.parameters.map(p => p.name).join(', ');
        return `function ${func.name}(${params})`;
    }

    private generateJavaScriptHiddenCode(
        func: FunctionDefinition,
        inputFormat: string,
        outputFormat: string,
        helperClasses?: string,
        imports?: string[]
    ): string {
        return `const fs = require('fs');
${imports ? imports.join('\n') : ''}

${helperClasses || ''}

// USER_CODE_PLACEHOLDER

function main() {
    try {
        // Read input from stdin
        const input = fs.readFileSync(0, 'utf8').trim();
        if (!input) return;
        
        // Parse input based on format: ${inputFormat}
        const lines = input.split('\\n');
        ${this.generateJavaScriptInputParsing(func, inputFormat)}
        
        // Call user function
        const result = ${func.name}(${func.parameters.map(p => p.name).join(', ')});
        
        // Format output based on format: ${outputFormat}
        ${this.generateJavaScriptOutputFormatting(func.returnType, outputFormat)}
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();`;
    }

    // Java generators
    private generateJavaFunction(func: FunctionDefinition): string {
        const params = func.parameters.map(p => `${this.mapTypeToJava(p.type)} ${p.name}`).join(', ');
        return `public ${this.mapTypeToJava(func.returnType)} ${func.name}(${params}) {\n        // Write your solution here\n        \n    }`;
    }

    private generateJavaFunctionSignature(func: FunctionDefinition): string {
        const params = func.parameters.map(p => `${this.mapTypeToJava(p.type)} ${p.name}`).join(', ');
        return `public ${this.mapTypeToJava(func.returnType)} ${func.name}(${params})`;
    }

    private generateJavaHiddenCode(
        func: FunctionDefinition,
        inputFormat: string,
        outputFormat: string,
        helperClasses?: string,
        imports?: string[]
    ): string {
        return `import java.util.*;
import java.io.*;
${imports ? imports.join('\n') : ''}

${helperClasses || ''}

public class Solution {
    // USER_CODE_PLACEHOLDER
    
    public static void main(String[] args) {
        try {
            Scanner scanner = new Scanner(System.in);
            
            // Parse input based on format: ${inputFormat}
            ${this.generateJavaInputParsing(func, inputFormat)}
            
            // Create solution instance and call user function
            Solution solution = new Solution();
            ${this.mapTypeToJava(func.returnType)} result = solution.${func.name}(${func.parameters.map(p => p.name).join(', ')});
            
            // Format output based on format: ${outputFormat}
            ${this.generateJavaOutputFormatting(func.returnType, outputFormat)}
            
            scanner.close();
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            System.exit(1);
        }
    }
}`;
    }

    // C++ generators
    private generateCppFunction(func: FunctionDefinition): string {
        const params = func.parameters.map(p => `${this.mapTypeToCpp(p.type)} ${p.name}`).join(', ');
        return `${this.mapTypeToCpp(func.returnType)} ${func.name}(${params}) {\n        // Write your solution here\n        \n    }`;
    }

    private generateCppFunctionSignature(func: FunctionDefinition): string {
        const params = func.parameters.map(p => `${this.mapTypeToCpp(p.type)} ${p.name}`).join(', ');
        return `${this.mapTypeToCpp(func.returnType)} ${func.name}(${params})`;
    }

    private generateCppHiddenCode(
        func: FunctionDefinition,
        inputFormat: string,
        outputFormat: string,
        helperClasses?: string,
        imports?: string[]
    ): string {
        return `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
${imports ? imports.join('\n') : ''}
using namespace std;

${helperClasses || ''}

class Solution {
public:
    // USER_CODE_PLACEHOLDER
};

int main() {
    try {
        // Parse input based on format: ${inputFormat}
        ${this.generateCppInputParsing(func, inputFormat)}
        
        // Create solution instance and call user function
        Solution solution;
        ${this.mapTypeToCpp(func.returnType)} result = solution.${func.name}(${func.parameters.map(p => p.name).join(', ')});
        
        // Format output based on format: ${outputFormat}
        ${this.generateCppOutputFormatting(func.returnType, outputFormat)}
        
    } catch (const exception& e) {
        cerr << "Error: " << e.what() << endl;
        return 1;
    }
    
    return 0;
}`;
    }

    // Go generators
    private generateGoFunction(func: FunctionDefinition): string {
        const params = func.parameters.map(p => `${p.name} ${this.mapTypeToGo(p.type)}`).join(', ');
        return `func ${func.name}(${params}) ${this.mapTypeToGo(func.returnType)} {\n    // Write your solution here\n    \n}`;
    }

    private generateGoFunctionSignature(func: FunctionDefinition): string {
        const params = func.parameters.map(p => `${p.name} ${this.mapTypeToGo(p.type)}`).join(', ');
        return `func ${func.name}(${params}) ${this.mapTypeToGo(func.returnType)}`;
    }

    private generateGoHiddenCode(
        func: FunctionDefinition,
        inputFormat: string,
        outputFormat: string,
        helperClasses?: string,
        imports?: string[]
    ): string {
        return `package main

import (
    "bufio"
    "fmt"
    "os"
    "strconv"
    "strings"
    ${imports ? imports.map(imp => `"${imp}"`).join('\n    ') : ''}
)

${helperClasses || ''}

// USER_CODE_PLACEHOLDER

func main() {
    scanner := bufio.NewScanner(os.Stdin)
    
    // Parse input based on format: ${inputFormat}
    ${this.generateGoInputParsing(func, inputFormat)}
    
    // Call user function
    result := ${func.name}(${func.parameters.map(p => p.name).join(', ')})
    
    // Format output based on format: ${outputFormat}
    ${this.generateGoOutputFormatting(func.returnType, outputFormat)}
}`;
    }

    // Rust generators
    private generateRustFunction(func: FunctionDefinition): string {
        const params = func.parameters.map(p => `${p.name}: ${this.mapTypeToRust(p.type)}`).join(', ');
        return `fn ${func.name}(${params}) -> ${this.mapTypeToRust(func.returnType)} {\n        // Write your solution here\n        \n    }`;
    }

    private generateRustFunctionSignature(func: FunctionDefinition): string {
        const params = func.parameters.map(p => `${p.name}: ${this.mapTypeToRust(p.type)}`).join(', ');
        return `fn ${func.name}(${params}) -> ${this.mapTypeToRust(func.returnType)}`;
    }

    private generateRustHiddenCode(
        func: FunctionDefinition,
        inputFormat: string,
        outputFormat: string,
        helperClasses?: string,
        imports?: string[]
    ): string {
        return `use std::io::{self, Read};
${imports ? imports.join('\n') : ''}

${helperClasses || ''}

// USER_CODE_PLACEHOLDER

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input)?;
    
    // Parse input based on format: ${inputFormat}
    ${this.generateRustInputParsing(func, inputFormat)}
    
    // Call user function
    let result = ${func.name}(${func.parameters.map(p => p.name).join(', ')});
    
    // Format output based on format: ${outputFormat}
    ${this.generateRustOutputFormatting(func.returnType, outputFormat)}
    
    Ok(())
}`;
    }

    // Type mapping functions
    private mapTypeToPython(type: string): string {
        const typeMap: Record<string, string> = {
            'int': 'int',
            'string': 'str',
            'boolean': 'bool',
            'int[]': 'List[int]',
            'string[]': 'List[str]',
            'int[][]': 'List[List[int]]',
            'ListNode': 'Optional[ListNode]',
            'TreeNode': 'Optional[TreeNode]'
        };
        return typeMap[type] || type;
    }

    private mapTypeToJava(type: string): string {
        const typeMap: Record<string, string> = {
            'int': 'int',
            'string': 'String',
            'boolean': 'boolean',
            'int[]': 'int[]',
            'string[]': 'String[]',
            'int[][]': 'int[][]',
            'ListNode': 'ListNode',
            'TreeNode': 'TreeNode'
        };
        return typeMap[type] || type;
    }

    private mapTypeToCpp(type: string): string {
        const typeMap: Record<string, string> = {
            'int': 'int',
            'string': 'string',
            'boolean': 'bool',
            'int[]': 'vector<int>',
            'string[]': 'vector<string>',
            'int[][]': 'vector<vector<int>>',
            'ListNode': 'ListNode*',
            'TreeNode': 'TreeNode*'
        };
        return typeMap[type] || type;
    }

    private mapTypeToGo(type: string): string {
        const typeMap: Record<string, string> = {
            'int': 'int',
            'string': 'string',
            'boolean': 'bool',
            'int[]': '[]int',
            'string[]': '[]string',
            'int[][]': '[][]int',
            'ListNode': '*ListNode',
            'TreeNode': '*TreeNode'
        };
        return typeMap[type] || type;
    }

    private mapTypeToRust(type: string): string {
        const typeMap: Record<string, string> = {
            'int': 'i32',
            'string': 'String',
            'boolean': 'bool',
            'int[]': 'Vec<i32>',
            'string[]': 'Vec<String>',
            'int[][]': 'Vec<Vec<i32>>',
            'ListNode': 'Option<Box<ListNode>>',
            'TreeNode': 'Option<Rc<RefCell<TreeNode>>>'
        };
        return typeMap[type] || type;
    }

    // Input parsing generators (simplified - would need more sophisticated parsing for complex types)
    private generatePythonInputParsing(func: FunctionDefinition, inputFormat: string): string {
        // This is a simplified version - real implementation would parse inputFormat
        return func.parameters.map((param, index) => {
            if (param.type === 'int') {
                return `${param.name} = int(lines[${index}])`;
            } else if (param.type === 'string') {
                return `${param.name} = lines[${index}]`;
            } else if (param.type === 'int[]') {
                return `${param.name} = list(map(int, lines[${index}].split()))`;
            }
            return `${param.name} = json.loads(lines[${index}])`;
        }).join('\n        ');
    }

    private generateJavaScriptInputParsing(func: FunctionDefinition, inputFormat: string): string {
        return func.parameters.map((param, index) => {
            if (param.type === 'int') {
                return `const ${param.name} = parseInt(lines[${index}]);`;
            } else if (param.type === 'string') {
                return `const ${param.name} = lines[${index}];`;
            } else if (param.type === 'int[]') {
                return `const ${param.name} = lines[${index}].split(' ').map(Number);`;
            }
            return `const ${param.name} = JSON.parse(lines[${index}]);`;
        }).join('\n        ');
    }

    private generateJavaInputParsing(func: FunctionDefinition, inputFormat: string): string {
        return func.parameters.map((param, index) => {
            if (param.type === 'int') {
                return `int ${param.name} = scanner.nextInt();`;
            } else if (param.type === 'string') {
                return `String ${param.name} = scanner.nextLine();`;
            } else if (param.type === 'int[]') {
                return `int[] ${param.name} = Arrays.stream(scanner.nextLine().split(" ")).mapToInt(Integer::parseInt).toArray();`;
            }
            return `// Parse ${param.name} of type ${param.type}`;
        }).join('\n            ');
    }

    private generateCppInputParsing(func: FunctionDefinition, inputFormat: string): string {
        return func.parameters.map((param, index) => {
            if (param.type === 'int') {
                return `int ${param.name};\n        cin >> ${param.name};`;
            } else if (param.type === 'string') {
                return `string ${param.name};\n        getline(cin, ${param.name});`;
            } else if (param.type === 'int[]') {
                return `vector<int> ${param.name};\n        string line;\n        getline(cin, line);\n        istringstream iss(line);\n        int num;\n        while (iss >> num) ${param.name}.push_back(num);`;
            }
            return `// Parse ${param.name} of type ${param.type}`;
        }).join('\n        ');
    }

    private generateGoInputParsing(func: FunctionDefinition, inputFormat: string): string {
        return func.parameters.map((param, index) => {
            if (param.type === 'int') {
                return `scanner.Scan()\n    ${param.name}, _ := strconv.Atoi(scanner.Text())`;
            } else if (param.type === 'string') {
                return `scanner.Scan()\n    ${param.name} := scanner.Text()`;
            } else if (param.type === 'int[]') {
                return `scanner.Scan()\n    parts := strings.Fields(scanner.Text())\n    ${param.name} := make([]int, len(parts))\n    for i, part := range parts {\n        ${param.name}[i], _ = strconv.Atoi(part)\n    }`;
            }
            return `// Parse ${param.name} of type ${param.type}`;
        }).join('\n    ');
    }

    private generateRustInputParsing(func: FunctionDefinition, inputFormat: string): string {
        return func.parameters.map((param, index) => {
            if (param.type === 'int') {
                return `let ${param.name}: i32 = input.lines().nth(${index}).unwrap().parse()?;`;
            } else if (param.type === 'string') {
                return `let ${param.name} = input.lines().nth(${index}).unwrap().to_string();`;
            } else if (param.type === 'int[]') {
                return `let ${param.name}: Vec<i32> = input.lines().nth(${index}).unwrap()\n        .split_whitespace()\n        .map(|s| s.parse().unwrap())\n        .collect();`;
            }
            return `// Parse ${param.name} of type ${param.type}`;
        }).join('\n    ');
    }

    // Output formatting generators
    private generatePythonOutputFormatting(returnType: string, outputFormat: string): string {
        if (returnType === 'int' || returnType === 'string' || returnType === 'boolean') {
            return 'print(result)';
        } else if (returnType.includes('[]')) {
            return 'print(json.dumps(result))';
        }
        return 'print(json.dumps(result) if result is not None else "null")';
    }

    private generateJavaScriptOutputFormatting(returnType: string, outputFormat: string): string {
        if (returnType === 'int' || returnType === 'string' || returnType === 'boolean') {
            return 'console.log(result);';
        }
        return 'console.log(JSON.stringify(result));';
    }

    private generateJavaOutputFormatting(returnType: string, outputFormat: string): string {
        if (returnType === 'int' || returnType === 'boolean') {
            return 'System.out.println(result);';
        } else if (returnType === 'String') {
            return 'System.out.println(result);';
        }
        return 'System.out.println(Arrays.toString(result));';
    }

    private generateCppOutputFormatting(returnType: string, outputFormat: string): string {
        if (returnType === 'int' || returnType === 'bool') {
            return 'cout << result << endl;';
        } else if (returnType === 'string') {
            return 'cout << result << endl;';
        }
        return 'cout << result << endl; // Format as needed';
    }

    private generateGoOutputFormatting(returnType: string, outputFormat: string): string {
        if (returnType === 'int' || returnType === 'bool' || returnType === 'string') {
            return 'fmt.Println(result)';
        }
        return 'fmt.Println(result) // Format as needed';
    }

    private generateRustOutputFormatting(returnType: string, outputFormat: string): string {
        if (returnType === 'i32' || returnType === 'bool' || returnType === 'String') {
            return 'println!("{}", result);';
        }
        return 'println!("{:?}", result);';
    }
}