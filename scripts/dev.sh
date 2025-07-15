#!/bin/bash

# Development helper scripts for TypeScript GraphQL API

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Setup development environment
setup_dev() {
    print_status "Setting up TypeScript development environment..."
    
    # Check Node.js version
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_status "Node.js version: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js v16 or higher."
        exit 1
    fi
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    
    # Create necessary directories
    print_status "Creating project directories..."
    mkdir -p src/types src/schema src/resolvers src/utils src/data
    mkdir -p tests/unit tests/integration tests/fixtures
    mkdir -p logs dist
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        print_status "Creating .env file..."
        cat > .env << EOF
NODE_ENV=development
PORT=4000
DATA_FILE_PATH=./src/data/data.json
LOG_LEVEL=debug
EOF
    fi
    
    print_status "Development environment setup complete!"
}

# Run type checking
type_check() {
    print_status "Running TypeScript type check..."
    npm run type-check
    
    if [ $? -eq 0 ]; then
        print_status "Type checking passed!"
    else
        print_error "Type checking failed!"
        exit 1
    fi
}

# Build the project
build_project() {
    print_status "Building TypeScript project..."
    npm run build
    
    if [ $? -eq 0 ]; then
        print_status "Build successful!"
    else
        print_error "Build failed!"
        exit 1
    fi
}

# Run tests
run_tests() {
    print_status "Running tests..."
    npm test
    
    if [ $? -eq 0 ]; then
        print_status "All tests passed!"
    else
        print_error "Some tests failed!"
        exit 1
    fi
}

# Run with coverage
run_coverage() {
    print_status "Running tests with coverage..."
    npm run test:coverage
}

# Lint the code
lint_code() {
    print_status "Running ESLint..."
    npm run lint
    
    if [ $? -eq 0 ]; then
        print_status "Linting passed!"
    else
        print_warning "Linting issues found. Run 'npm run lint:fix' to fix automatically."
    fi
}

# Start development server
start_dev() {
    print_status "Starting development server..."
    npm run dev
}

# Full development workflow
dev_workflow() {
    print_status "Running full development workflow..."
    
    type_check
    lint_code
    run_tests
    build_project
    
    print_status "Development workflow completed successfully!"
}

# Clean build artifacts
clean() {
    print_status "Cleaning build artifacts..."
    rm -rf dist coverage logs/*.log
    print_status "Clean completed!"
}

# Show help
show_help() {
    echo "Development Scripts for TypeScript GraphQL API"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup       Setup development environment"
    echo "  typecheck   Run TypeScript type checking"
    echo "  build       Build the project"
    echo "  test        Run tests"
    echo "  coverage    Run tests with coverage"
    echo "  lint        Run ESLint"
    echo "  dev         Start development server"
    echo "  workflow    Run full development workflow"
    echo "  clean       Clean build artifacts"
    echo "  help        Show this help message"
    echo ""
}

# Main script logic
case "$1" in
    setup)
        setup_dev
        ;;
    typecheck)
        type_check
        ;;
    build)
        build_project
        ;;
    test)
        run_tests
        ;;
    coverage)
        run_coverage
        ;;
    lint)
        lint_code
        ;;
    dev)
        start_dev
        ;;
    workflow)
        dev_workflow
        ;;
    clean)
        clean
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac