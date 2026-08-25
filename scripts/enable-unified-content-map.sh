#!/bin/bash

# Quick Setup: Enable Unified Content Map Optimization
# This script helps you quickly enable and test the optimized book pipeline.

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Nexus Director — Pipeline Optimization Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "⚠️  .env.local not found. Creating from .env.example..."
  cp .env.example .env.local
  echo "✅ Created .env.local"
  echo ""
  echo "⚠️  IMPORTANT: Add your API keys to .env.local before proceeding:"
  echo "   - DEEPSEEK_API_KEY (required for content mapping)"
  echo "   - GOOGLE_GENERATIVE_AI_API_KEY (optional)"
  echo "   - ANTHROPIC_API_KEY (optional)"
  echo "   - DEEPGRAM_API_KEY (if using audio transcription)"
  echo ""
  read -p "Press Enter after adding your API keys..."
fi

# Check if USE_UNIFIED_CONTENT_MAP is already set
if grep -q "^USE_UNIFIED_CONTENT_MAP=" .env.local; then
  echo "✅ USE_UNIFIED_CONTENT_MAP already configured in .env.local"
else
  echo "➕ Adding USE_UNIFIED_CONTENT_MAP to .env.local..."
  echo "" >> .env.local
  echo "# Pipeline Optimization - Phase 1: Unified Content Map" >> .env.local
  echo "USE_UNIFIED_CONTENT_MAP=true" >> .env.local
  echo "✅ Feature flag enabled"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Start the development server:"
echo "   pnpm dev"
echo ""
echo "2. Navigate to the ebook pipeline"
echo ""
echo "3. Upload a test transcript or audio file"
echo ""
echo "4. Watch for this log message in the browser console:"
echo "   [unified-content-map] Extracted X segments, Y stories..."
echo ""
echo "5. Compare token usage in DevTools → Network tab:"
echo "   • Old: 60-100K tokens (4-5 content-map calls)"
echo "   • New: 25-40K tokens (1 unified-content-map call)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Tips:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "• To disable: Set USE_UNIFIED_CONTENT_MAP=false and restart server"
echo "• To rollback: The old pipeline is fully preserved and available"
echo "• Full docs: docs/implementation-summary.md"
echo "• Proposal: docs/book-pipeline-optimization-proposal.md"
echo ""
echo "Expected improvements:"
echo "  ✓ 50-70% fewer tokens in content mapping phase"
echo "  ✓ Better narrative arc detection"
echo "  ✓ Complete story inventory"
echo "  ✓ Faster execution (1 call vs 4-5)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
