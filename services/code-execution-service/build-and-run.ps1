#!/usr/bin/env pwsh
# ============================================
# Code Execution Service - Build & Run Script
# ============================================
# This script builds all Docker images and starts the service
# Optimized for size and execution time

param(
    [switch]$Build = $false,
    [switch]$Run = $false,
    [switch]$All = $false,
    [switch]$Clean = $false,
    [switch]$Logs = $false,
    [string]$Language = "",
    [switch]$Help = $false
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Magenta = "`e[35m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = $Reset)
    Write-Host "$Color$Message$Reset"
}

function Show-Help {
    Write-ColorOutput "Code Execution Service - Build & Run Script" $Cyan
    Write-ColorOutput "============================================" $Cyan
    Write-Host ""
    Write-ColorOutput "Usage:" $Yellow
    Write-Host "  .\build-and-run.ps1 [OPTIONS]"
    Write-Host ""
    Write-ColorOutput "Options:" $Yellow
    Write-Host "  -Build              Build all Docker images"
    Write-Host "  -Run                Start the service"
    Write-Host "  -All                Build images and start service"
    Write-Host "  -Clean              Clean up containers and images"
    Write-Host "  -Logs               Show service logs"
    Write-Host "  -Language <lang>    Build specific language image (python, node, java, cpp, go, rust)"
    Write-Host "  -Help               Show this help message"
    Write-Host ""
    Write-ColorOutput "Examples:" $Yellow
    Write-Host "  .\build-and-run.ps1 -All                    # Build everything and start"
    Write-Host "  .\build-and-run.ps1 -Build                  # Build all images"
    Write-Host "  .\build-and-run.ps1 -Language python        # Build only Python images"
    Write-Host "  .\build-and-run.ps1 -Run                    # Start service"
    Write-Host "  .\build-and-run.ps1 -Clean                  # Clean up"
    Write-Host ""
}

function Test-DockerRunning {
    try {
        $null = docker version 2>$null
        return $true
    }
    catch {
        Write-ColorOutput "ERROR: Docker is not running or not installed!" $Red
        Write-ColorOutput "Please start Docker Desktop and try again." $Yellow
        return $false
    }
}

function Build-LanguageImages {
    param([string]$Lang = "")
    
    Write-ColorOutput "Building optimized Docker images..." $Blue
    
    # Define image configurations with size optimizations
    $images = @{
        "python" = @{
            "dockerfile" = "dockerfiles/Dockerfile.python"
            "tag" = "code-exec/python:optimized"
            "fallback_dockerfile" = "dockerfiles/Dockerfile.python.fallback"
            "fallback_tag" = "code-exec/python:fallback"
        }
        "node" = @{
            "dockerfile" = "dockerfiles/Dockerfile.node"
            "tag" = "code-exec/node:optimized"
            "fallback_dockerfile" = "dockerfiles/Dockerfile.node.fallback"
            "fallback_tag" = "code-exec/node:fallback"
        }
        "java" = @{
            "dockerfile" = "dockerfiles/Dockerfile.java"
            "tag" = "code-exec/java:optimized"
            "builder_dockerfile" = "dockerfiles/Dockerfile.java-builder"
            "builder_tag" = "code-exec/java-builder:optimized"
        }
        "cpp" = @{
            "dockerfile" = "dockerfiles/Dockerfile.cpp"
            "tag" = "code-exec/cpp:optimized"
            "builder_dockerfile" = "dockerfiles/Dockerfile.cpp-builder"
            "builder_tag" = "code-exec/cpp-builder:optimized"
        }
        "go" = @{
            "dockerfile" = "dockerfiles/Dockerfile.go"
            "tag" = "code-exec/go:optimized"
            "builder_dockerfile" = "dockerfiles/Dockerfile.go-builder"
            "builder_tag" = "code-exec/go-builder:optimized"
        }
        "rust" = @{
            "dockerfile" = "dockerfiles/Dockerfile.rust"
            "tag" = "code-exec/rust:optimized"
            "builder_dockerfile" = "dockerfiles/Dockerfile.rust-builder"
            "builder_tag" = "code-exec/rust-builder:optimized"
        }
    }
    
    $buildTargets = if ($Lang) { @($Lang) } else { $images.Keys }
    
    foreach ($language in $buildTargets) {
        if (-not $images.ContainsKey($language)) {
            Write-ColorOutput "ERROR: Unknown language: $language" $Red
            continue
        }
        
        $config = $images[$language]
        Write-ColorOutput "Building $language images..." $Magenta
        
        try {
            # Build builder image first (for compiled languages)
            if ($config.ContainsKey("builder_dockerfile")) {
                Write-ColorOutput "  Building builder image: $($config.builder_tag)" $Cyan
                $builderResult = docker build -f $config.builder_dockerfile -t $config.builder_tag . --target $language-builder 2>&1
                if ($LASTEXITCODE -ne 0) {
                    Write-ColorOutput "ERROR: Failed to build builder image for $language" $Red
                    Write-ColorOutput $builderResult $Red
                    continue
                }
                Write-ColorOutput "  SUCCESS: Builder image built successfully" $Green
            }
            
            # Build main executor image
            Write-ColorOutput "  Building executor image: $($config.tag)" $Cyan
            $mainResult = docker build -f $config.dockerfile -t $config.tag . --target $language-executor 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-ColorOutput "ERROR: Failed to build executor image for $language" $Red
                Write-ColorOutput "Build output:" $Yellow
                Write-ColorOutput $mainResult $Red
                
                # Try fallback image if available
                if ($config.ContainsKey("fallback_dockerfile")) {
                    Write-ColorOutput "  Trying fallback image..." $Yellow
                    $fallbackResult = docker build -f $config.fallback_dockerfile -t $config.fallback_tag . 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        Write-ColorOutput "  SUCCESS: Fallback image built successfully" $Green
                        # Update the tag to use fallback
                        $config.tag = $config.fallback_tag
                    } else {
                        Write-ColorOutput "ERROR: Fallback image also failed" $Red
                        Write-ColorOutput $fallbackResult $Red
                    }
                }
                continue
            }
            
            Write-ColorOutput "  SUCCESS: $language images built successfully" $Green
            
            # Show image size
            $imageInfo = docker images $config.tag --format "table {{.Size}}" | Select-Object -Skip 1
            Write-ColorOutput "  Image size: $imageInfo" $Cyan
            
        }
        catch {
            Write-ColorOutput "ERROR: Error building $language images: $_" $Red
        }
    }
    
    Write-ColorOutput "Image building completed!" $Green
}

function Start-Service {
    Write-ColorOutput "Starting Code Execution Service..." $Blue
    
    # Check if service is already running
    $running = docker-compose ps -q code-execution-service 2>$null
    if ($running) {
        Write-ColorOutput "WARNING: Service is already running. Stopping first..." $Yellow
        docker-compose down
    }
    
    # Start services
    Write-ColorOutput "Starting services with docker-compose..." $Cyan
    docker-compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "SUCCESS: Service started successfully!" $Green
        Write-ColorOutput "Service available at: http://localhost:3004" $Cyan
        Write-ColorOutput "API Documentation: http://localhost:3004/docs" $Cyan
        Write-ColorOutput "Health Check: http://localhost:3004/api/v1/health" $Cyan
        
        # Wait a moment and check health
        Write-ColorOutput "Checking service health..." $Yellow
        Start-Sleep -Seconds 5
        
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:3004/api/v1/health" -TimeoutSec 10
            Write-ColorOutput "SUCCESS: Service is healthy!" $Green
        }
        catch {
            Write-ColorOutput "WARNING: Service may still be starting up. Check logs with -Logs" $Yellow
        }
    }
    else {
        Write-ColorOutput "ERROR: Failed to start service" $Red
    }
}

function Show-Logs {
    Write-ColorOutput "Showing service logs..." $Blue
    docker-compose logs -f --tail=50 code-execution-service
}

function Clean-Up {
    Write-ColorOutput "Cleaning up Docker resources..." $Blue
    
    # Stop services
    Write-ColorOutput "Stopping services..." $Cyan
    docker-compose down -v
    
    # Remove code execution images
    Write-ColorOutput "Removing code execution images..." $Cyan
    $images = @(
        "code-exec/python:optimized",
        "code-exec/python:fallback",
        "code-exec/node:optimized", 
        "code-exec/node:fallback",
        "code-exec/java:optimized",
        "code-exec/java-builder:optimized",
        "code-exec/cpp:optimized",
        "code-exec/cpp-builder:optimized",
        "code-exec/go:optimized",
        "code-exec/go-builder:optimized",
        "code-exec/rust:optimized",
        "code-exec/rust-builder:optimized"
    )
    
    foreach ($image in $images) {
        try {
            docker rmi $image 2>$null
            Write-ColorOutput "  SUCCESS: Removed: $image" $Green
        }
        catch {
            # Image might not exist, ignore
        }
    }
    
    # Clean up dangling images and containers
    Write-ColorOutput "Cleaning up dangling resources..." $Cyan
    docker system prune -f
    
    Write-ColorOutput "SUCCESS: Cleanup completed!" $Green
}

function Show-Status {
    Write-ColorOutput "Code Execution Service Status" $Cyan
    Write-ColorOutput "================================" $Cyan
    
    # Check Docker
    if (Test-DockerRunning) {
        Write-ColorOutput "SUCCESS: Docker: Running" $Green
    } else {
        Write-ColorOutput "ERROR: Docker: Not running" $Red
        return
    }
    
    # Check service
    $running = docker-compose ps -q code-execution-service 2>$null
    if ($running) {
        Write-ColorOutput "SUCCESS: Service: Running" $Green
        
        # Check images
        Write-ColorOutput "`nAvailable Images:" $Yellow
        $images = @(
            "code-exec/python:optimized",
            "code-exec/node:optimized",
            "code-exec/java:optimized",
            "code-exec/cpp:optimized",
            "code-exec/go:optimized",
            "code-exec/rust:optimized"
        )
        
        foreach ($image in $images) {
            $exists = docker images -q $image 2>$null
            if ($exists) {
                $size = docker images $image --format "{{.Size}}" 2>$null
                Write-ColorOutput "  SUCCESS: $image ($size)" $Green
            } else {
                Write-ColorOutput "  ERROR: $image (not built)" $Red
            }
        }
    } else {
        Write-ColorOutput "ERROR: Service: Not running" $Red
    }
}

# Main execution
if ($Help) {
    Show-Help
    exit 0
}

if (-not (Test-DockerRunning)) {
    exit 1
}

# Execute based on parameters
if ($All) {
    Build-LanguageImages
    Start-Service
}
elseif ($Build) {
    Build-LanguageImages -Lang $Language
}
elseif ($Run) {
    Start-Service
}
elseif ($Clean) {
    Clean-Up
}
elseif ($Logs) {
    Show-Logs
}
else {
    Show-Status
    Write-Host ""
    Write-ColorOutput "Use -Help for usage information" $Yellow
}