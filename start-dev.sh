#!/bin/bash

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check for TypeScript errors
echo "Checking TypeScript compilation..."
npx tsc --noEmit --pretty

# If compilation succeeds, start the dev server
if [ $? -eq 0 ]; then
    echo "Starting development server..."
    npx vite --host 0.0.0.0 --port 5173
else
    echo "TypeScript compilation failed. Please fix the errors above."
    exit 1
fi 