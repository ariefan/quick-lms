#!/bin/bash

# After Work Quality Check Script
# Runs formatting, linting, type checking, and cleans up port 3000

set -e  # Exit on error

echo "🧹 Running post-work quality checks..."
echo ""

# Format code
echo "📝 Formatting code..."
pnpm format
echo "✅ Code formatted"
echo ""

# Fix linting issues
echo "🔍 Fixing lint issues..."
pnpm lint:fix
echo "✅ Lint issues fixed"
echo ""

# Type check
echo "🔎 Type checking..."
pnpm type-check
echo "✅ Type check passed"
echo ""

# Kill port 3000
echo "🔌 Killing port 3000..."
pnpm kill-port
echo "✅ Port 3000 freed"
echo ""

echo "✨ All quality checks passed! Ready to commit."
