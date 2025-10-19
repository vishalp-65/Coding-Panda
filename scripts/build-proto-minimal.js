#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROTO_DIR = path.join(__dirname, '..', 'proto');
const GRPC_COMMON_DIR = path.join(__dirname, '..', 'packages', 'grpc-common');
const GENERATED_DIR = path.join(GRPC_COMMON_DIR, 'src', 'generated');

console.log('🔧 Minimal Proto Build Script');
console.log('==============================\n');

// Ensure directories exist
if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

// Clean existing generated files
console.log('🧹 Cleaning existing generated files...');
if (fs.existsSync(GENERATED_DIR)) {
    const files = fs.readdirSync(GENERATED_DIR);
    for (const file of files) {
        fs.unlinkSync(path.join(GENERATED_DIR, file));
    }
}

// Try with system protoc and just JavaScript generation (no gRPC)
console.log('🧪 Testing with system protoc (JS only)...');
try {
    const commonProtoPath = path.join(PROTO_DIR, 'common.proto');

    // Simple JS generation without gRPC (with proper Windows path quoting)
    const command = `protoc ` +
        `--js_out=import_style=commonjs,binary:"${GENERATED_DIR}" ` +
        `-I "${PROTO_DIR}" ` +
        `"${commonProtoPath}"`;

    console.log('Command:', command);
    execSync(command, { stdio: 'inherit' });
    console.log('✅ JavaScript generation successful');

    // Check what was generated
    const generatedFiles = fs.readdirSync(GENERATED_DIR);
    console.log('Generated files:', generatedFiles);

} catch (error) {
    console.log('❌ System protoc failed:', error.message);

    // Try with npm protoc
    console.log('\n🔄 Trying with npx protoc...');
    try {
        execSync('npm install -g protoc', { stdio: 'inherit' });
        const command = `npx protoc ` +
            `--js_out=import_style=commonjs,binary:${GENERATED_DIR} ` +
            `-I ${PROTO_DIR} ` +
            `${path.join(PROTO_DIR, 'common.proto')}`;

        execSync(command, { stdio: 'inherit' });
        console.log('✅ npx protoc successful');
    } catch (npxError) {
        console.log('❌ npx protoc also failed:', npxError.message);
    }
}

console.log('\n✨ Minimal build completed!');