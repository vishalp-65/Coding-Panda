#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROTO_DIR = path.join(__dirname, '..', 'proto');
const GRPC_COMMON_DIR = path.join(__dirname, '..', 'packages', 'grpc-common');
const GENERATED_DIR = path.join(GRPC_COMMON_DIR, 'src', 'generated');

console.log('🔧 Simple Proto Build Script');
console.log('============================\n');

// Ensure directories exist
if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
    console.log('✅ Created generated directory');
}

// Clean existing generated files
console.log('🧹 Cleaning existing generated files...');
if (fs.existsSync(GENERATED_DIR)) {
    const files = fs.readdirSync(GENERATED_DIR);
    for (const file of files) {
        fs.unlinkSync(path.join(GENERATED_DIR, file));
    }
    console.log(`   Removed ${files.length} files`);
}

// Get all proto files
const protoFiles = fs.readdirSync(PROTO_DIR)
    .filter(file => file.endsWith('.proto'))
    .sort(); // Sort to ensure common.proto is processed first

console.log('📁 Found proto files:', protoFiles);

// Try to compile each proto file individually to identify issues
console.log('\n🔍 Testing individual proto files...');
for (const protoFile of protoFiles) {
    try {
        const filePath = path.join(PROTO_DIR, protoFile);
        const content = fs.readFileSync(filePath, 'utf8');

        // Basic syntax check
        if (!content.includes('syntax = "proto3"')) {
            console.log(`   ❌ ${protoFile}: Missing proto3 syntax declaration`);
            continue;
        }

        if (!content.trim().endsWith('}') && !content.trim().endsWith(';')) {
            console.log(`   ⚠️  ${protoFile}: File might be truncated`);
        }

        console.log(`   ✅ ${protoFile}: Basic syntax OK`);
    } catch (error) {
        console.log(`   ❌ ${protoFile}: Error reading file - ${error.message}`);
    }
}

// Try a simple compilation test with just common.proto
console.log('\n🧪 Testing protoc with common.proto only...');
try {
    const commonProtoPath = path.join(PROTO_DIR, 'common.proto');

    if (fs.existsSync(commonProtoPath)) {
        // Use the grpc-tools protoc directly
        const protocPath = path.join(__dirname, '..', 'node_modules', 'grpc-tools', 'bin', 'protoc.exe');
        const pluginPath = path.join(__dirname, '..', 'node_modules', 'grpc-tools', 'bin', 'grpc_node_plugin.exe');

        if (fs.existsSync(protocPath)) {
            console.log('   Using grpc-tools protoc...');

            const command = `"${protocPath}" ` +
                `--plugin=protoc-gen-grpc="${pluginPath}" ` +
                `--js_out=import_style=commonjs,binary:"${GENERATED_DIR}" ` +
                `--grpc_out=grpc_js:"${GENERATED_DIR}" ` +
                `-I "${PROTO_DIR}" ` +
                `"${commonProtoPath}"`;

            console.log('   Command:', command);
            execSync(command, { stdio: 'inherit' });
            console.log('   ✅ common.proto compiled successfully');
        } else {
            console.log('   ❌ grpc-tools protoc not found');
            console.log('   Install with: npm install grpc-tools --save-dev');
        }
    }
} catch (error) {
    console.log('   ❌ Compilation failed:', error.message);

    // Try alternative approach with system protoc
    console.log('\n🔄 Trying with system protoc...');
    try {
        execSync('protoc --version', { stdio: 'pipe' });
        console.log('   System protoc found, trying simple compilation...');

        const command = `protoc ` +
            `--js_out=import_style=commonjs,binary:"${GENERATED_DIR}" ` +
            `-I "${PROTO_DIR}" ` +
            `"${path.join(PROTO_DIR, 'common.proto')}"`;

        execSync(command, { stdio: 'inherit' });
        console.log('   ✅ System protoc compilation successful');
    } catch (systemError) {
        console.log('   ❌ System protoc also failed:', systemError.message);
    }
}

// Check what was generated
console.log('\n📋 Checking generated files...');
if (fs.existsSync(GENERATED_DIR)) {
    const generatedFiles = fs.readdirSync(GENERATED_DIR);
    if (generatedFiles.length > 0) {
        console.log('   Generated files:');
        generatedFiles.forEach(file => {
            const filePath = path.join(GENERATED_DIR, file);
            const stats = fs.statSync(filePath);
            console.log(`   - ${file} (${stats.size} bytes)`);
        });
    } else {
        console.log('   No files generated');
    }
} else {
    console.log('   Generated directory not found');
}

console.log('\n🎯 Next Steps:');
console.log('1. If no files were generated, check proto file syntax');
console.log('2. Install protoc system-wide if grpc-tools failed');
console.log('3. Try: npm install grpc-tools grpc_tools_node_protoc_ts --save-dev');
console.log('4. For Windows: choco install protoc');
console.log('5. Check individual proto files for syntax errors');

console.log('\n✨ Build script completed!');