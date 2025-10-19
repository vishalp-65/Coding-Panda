#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROTO_DIR = path.join(__dirname, '..', 'proto');
const GRPC_COMMON_DIR = path.join(__dirname, '..', 'packages', 'grpc-common');
const GENERATED_DIR = path.join(GRPC_COMMON_DIR, 'src', 'generated');

// Ensure directories exist
if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

// Clean existing generated files
console.log('Cleaning existing generated files...');
if (fs.existsSync(GENERATED_DIR)) {
    fs.rmSync(GENERATED_DIR, { recursive: true, force: true });
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

// Get all proto files
const protoFiles = fs.readdirSync(PROTO_DIR)
    .filter(file => file.endsWith('.proto'))
    .map(file => path.join(PROTO_DIR, file));

console.log('Found proto files:', protoFiles.map(f => path.basename(f)));

// Generate JavaScript files
console.log('Generating JavaScript files...');
const jsCommand = [
    'grpc_tools_node_protoc',
    `--js_out=import_style=commonjs,binary:${GENERATED_DIR}`,
    `--grpc_out=grpc_js:${GENERATED_DIR}`,
    `-I ${PROTO_DIR}`,
    ...protoFiles
].join(' ');

try {
    execSync(jsCommand, { stdio: 'inherit' });
    console.log('JavaScript files generated successfully');
} catch (error) {
    console.error('Error generating JavaScript files:', error.message);
    process.exit(1);
}

// Generate TypeScript definitions
console.log('Generating TypeScript definitions...');
const tsCommand = [
    'grpc_tools_node_protoc',
    `--plugin=protoc-gen-ts=${path.join(__dirname, '..', 'node_modules', '.bin', 'protoc-gen-ts')}`,
    `--ts_out=grpc_js:${GENERATED_DIR}`,
    `-I ${PROTO_DIR}`,
    ...protoFiles
].join(' ');

try {
    execSync(tsCommand, { stdio: 'inherit' });
    console.log('TypeScript definitions generated successfully');
} catch (error) {
    console.error('Error generating TypeScript definitions:', error.message);
    process.exit(1);
}

console.log('Proto compilation completed successfully!');
console.log(`Generated files are in: ${GENERATED_DIR}`);