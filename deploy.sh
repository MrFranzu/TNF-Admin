#!/bin/bash

# Install dependencies with legacy peer deps to resolve conflicts
npm install --legacy-peer-deps

# Proceed with the build
npm run build
