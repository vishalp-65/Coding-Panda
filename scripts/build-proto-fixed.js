#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROTO_DIR = path.join(__dirname, '..', 'proto');
const GRPC_COMMON_DIR = path.join(__dirname, '..', 'packages', 'grpc-common');
const GENERATED_DIR = path.join(GRPC_COMMON_DIR, 'src', 'generated');

console.log('🔧 Fixed Proto Build Script');
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

// Try with system protoc and just JavaScript generation (no gRPC)
console.log('🧪 Testing with system protoc (JS only)...');
try {
    const commonProtoPath = path.join(PROTO_DIR, 'common.proto');

    // Use proper Windows path quoting
    const args = [
        '--js_out=import_style=commonjs,binary:' + GENERATED_DIR,
        '-I', PROTO_DIR,
        commonProtoPath
    ];

    console.log('Command: protoc', args.join(' '));
    execSync('protoc ' + args.map(arg => `"${arg}"`).join(' '), { stdio: 'inherit' });
    console.log('✅ JavaScript generation successful');

    // Check what was generated
    const generatedFiles = fs.readdirSync(GENERATED_DIR);
    console.log('Generated files:', generatedFiles);

    if (generatedFiles.length > 0) {
        console.log('\n🎉 Success! Proto compilation worked!');

        // Try to compile all proto files now
        console.log('\n📦 Compiling all proto files...');
        const allProtoFiles = fs.readdirSync(PROTO_DIR)
            .filter(file => file.endsWith('.proto') && file !== 'test-simple.proto')
            .map(file => path.join(PROTO_DIR, file));

        const allArgs = [
            '--js_out=import_style=commonjs,binary:' + GENERATED_DIR,
            '-I', PROTO_DIR,
            ...allProtoFiles
        ];

        execSync('protoc ' + allArgs.map(arg => `"${arg}"`).join(' '), { stdio: 'inherit' });

        const finalFiles = fs.readdirSync(GENERATED_DIR);
        console.log(`✅ Generated ${finalFiles.length} files total`);
        finalFiles.forEach(file => console.log(`   - ${file}`));
    }

} catch (error) {
    console.log('❌ Protoc compilation failed:', error.message);

    // Provide helpful error information
    console.log('\n🔍 Troubleshooting:');
    console.log('1. Check if protoc is installed: protoc --version');
    console.log('2. Check proto file syntax');
    console.log('3. Ensure paths don\'t have special characters');
    console.log('4. Try running from a path without spaces');
}

console.log('\n✨ Build script completed!');