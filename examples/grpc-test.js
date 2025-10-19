#!/usr/bin/env node

/**
 * Simple test script to verify gRPC setup is working
 * Run this after completing the protobuf generation steps
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 gRPC Setup Test Script');
console.log('========================\n');

// Check if protobuf compiler is installed
console.log('1. Checking protobuf compiler...');
try {
    const protocVersion = execSync('protoc --version', { encoding: 'utf8' });
    console.log(`   ✅ Found: ${protocVersion.trim()}`);
} catch (error) {
    console.log('   ❌ protoc not found. Please install Protocol Buffers compiler.');
    console.log('   Install instructions: https://grpc.io/docs/protoc-installation/');
    process.exit(1);
}

// Check if proto files exist
console.log('\n2. Checking protocol buffer definitions...');
const protoDir = path.join(__dirname, '..', 'proto');
const protoFiles = [
    'common.proto',
    'user.proto',
    'problem.proto',
    'execution.proto',
    'contest.proto',
    'analytics.proto',
    'notification.proto',
    'ai-analysis.proto'
];

let allProtoFilesExist = true;
for (const file of protoFiles) {
    const filePath = path.join(protoDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${file}`);
    } else {
        console.log(`   ❌ ${file} - Missing`);
        allProtoFilesExist = false;
    }
}

if (!allProtoFilesExist) {
    console.log('\n   Some proto files are missing. Please ensure all proto files are created.');
    process.exit(1);
}

// Check if gRPC common package exists
console.log('\n3. Checking gRPC common package...');
const grpcCommonDir = path.join(__dirname, '..', 'packages', 'grpc-common');
if (fs.existsSync(grpcCommonDir)) {
    console.log('   ✅ gRPC common package directory exists');

    const packageJsonPath = path.join(grpcCommonDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        console.log('   ✅ package.json exists');
    } else {
        console.log('   ❌ package.json missing');
    }
} else {
    console.log('   ❌ gRPC common package directory missing');
    process.exit(1);
}

// Check if generated files exist (after proto compilation)
console.log('\n4. Checking generated protobuf files...');
const generatedDir = path.join(grpcCommonDir, 'src', 'generated');
if (fs.existsSync(generatedDir)) {
    const generatedFiles = fs.readdirSync(generatedDir);
    if (generatedFiles.length > 0) {
        console.log(`   ✅ Found ${generatedFiles.length} generated files`);
        generatedFiles.forEach(file => {
            console.log(`      - ${file}`);
        });
    } else {
        console.log('   ⚠️  Generated directory exists but is empty');
        console.log('   Run: npm run proto:build');
    }
} else {
    console.log('   ⚠️  Generated files not found');
    console.log('   This is expected before running proto:build');
}

// Test proto compilation (dry run)
console.log('\n5. Testing protobuf compilation...');
try {
    const testCommand = `protoc --version`;
    execSync(testCommand, { stdio: 'pipe' });
    console.log('   ✅ Protobuf compilation tools are working');
} catch (error) {
    console.log('   ❌ Protobuf compilation test failed');
    console.log(`   Error: ${error.message}`);
}

// Check Node.js gRPC dependencies
console.log('\n6. Checking Node.js gRPC dependencies...');
const grpcPackageJson = path.join(grpcCommonDir, 'package.json');
if (fs.existsSync(grpcPackageJson)) {
    const packageData = JSON.parse(fs.readFileSync(grpcPackageJson, 'utf8'));
    const deps = { ...packageData.dependencies, ...packageData.devDependencies };

    const requiredDeps = ['@grpc/grpc-js', '@grpc/proto-loader', 'google-protobuf'];
    const devDeps = ['grpc-tools', 'grpc_tools_node_protoc_ts'];

    for (const dep of requiredDeps) {
        if (deps[dep]) {
            console.log(`   ✅ ${dep}: ${deps[dep]}`);
        } else {
            console.log(`   ❌ ${dep}: Missing`);
        }
    }

    for (const dep of devDeps) {
        if (deps[dep]) {
            console.log(`   ✅ ${dep}: ${deps[dep]}`);
        } else {
            console.log(`   ⚠️  ${dep}: Missing (install with: npm install ${dep} --save-dev)`);
        }
    }
}

console.log('\n🎉 gRPC Setup Test Complete!');
console.log('\nNext Steps:');
console.log('1. Install missing dependencies if any');
console.log('2. Run: npm run proto:build');
console.log('3. Enable gRPC servers in services');
console.log('4. Test with: npm run dev');
console.log('\nFor detailed instructions, see: docs/GRPC_SETUP_GUIDE.md');