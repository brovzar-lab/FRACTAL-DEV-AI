#!/bin/bash
################################################################################
# CLAUDE.md / Config Audit Script (LLM-Agnostic)
# Detects available AI CLIs and uses the best one to audit project config.
# Replaces the old Claude-only audit-claude-md.sh
################################################################################

set -e

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
BACKUP_DIR="$PROJECT_ROOT/.config-audit-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Auditing project config...${NC}"
echo "   Project: $PROJECT_ROOT"
echo ""

# Detect which CLI is available (in preference order)
CLI_NAME=""
CLI_CMD=""

if command -v claude &> /dev/null; then
    CLI_NAME="Claude Code"
    CLI_CMD="claude"
elif command -v gemini &> /dev/null; then
    CLI_NAME="Gemini CLI"
    CLI_CMD="gemini"
elif command -v codex &> /dev/null; then
    CLI_NAME="Codex (OpenAI)"
    CLI_CMD="codex"
elif command -v aider &> /dev/null; then
    CLI_NAME="Aider"
    CLI_CMD="aider"
else
    echo -e "${RED}No AI CLI found.${NC}"
    echo "Install one of: claude, gemini, codex, aider"
    echo ""
    echo "  Claude Code:  npm install -g @anthropic-ai/claude-code"
    echo "  Gemini CLI:   npm install -g @anthropic-ai/gemini-cli"
    echo "  Codex:        npm install -g codex"
    echo "  Aider:        pip install aider-chat"
    exit 1
fi

echo -e "Using: ${BLUE}$CLI_NAME${NC} ($CLI_CMD)"
echo ""

# Detect which config files exist
CONFIG_FILES=""
[ -f "$PROJECT_ROOT/CLAUDE.md" ]       && CONFIG_FILES="$CONFIG_FILES CLAUDE.md"
[ -f "$PROJECT_ROOT/GEMINI.md" ]       && CONFIG_FILES="$CONFIG_FILES GEMINI.md"
[ -f "$PROJECT_ROOT/AGENTS.md" ]       && CONFIG_FILES="$CONFIG_FILES AGENTS.md"
[ -d "$PROJECT_ROOT/.cursor/rules" ]   && CONFIG_FILES="$CONFIG_FILES .cursor/rules/"
[ -f "$PROJECT_ROOT/.windsurfrules" ]  && CONFIG_FILES="$CONFIG_FILES .windsurfrules"
[ -f "$PROJECT_ROOT/.aider/CONVENTIONS.md" ] && CONFIG_FILES="$CONFIG_FILES .aider/CONVENTIONS.md"

if [ -z "$CONFIG_FILES" ]; then
    echo -e "${YELLOW}No AI config files found in this project.${NC}"
    exit 0
fi

echo "Config files found:$CONFIG_FILES"
echo ""

# Backup existing configs
mkdir -p "$BACKUP_DIR"
for f in CLAUDE.md GEMINI.md AGENTS.md .windsurfrules; do
    [ -f "$PROJECT_ROOT/$f" ] && cp "$PROJECT_ROOT/$f" "$BACKUP_DIR/${f}.${TIMESTAMP}.bak"
done

# Build the audit prompt (same logic, works with any LLM)
AUDIT_PROMPT="You are auditing the AI configuration files for this project.

1. Scan the actual codebase: directory structure, package.json/pyproject.toml, source files, imports, data flow.
2. Read the existing config files: $CONFIG_FILES
3. For each config file, check:
   - Does the stack description match the actual dependencies?
   - Are the source map and file references still accurate?
   - Are the commands (dev, build, test, deploy) correct?
   - Are the conventions still reflected in the actual code?
   - Is anything missing that would help an AI work on this codebase?
4. Update each config file in-place with corrections. Keep the same format and style.
5. Print a short summary of what changed.

Do NOT rewrite from scratch. Only fix what's wrong or missing."

# Run the audit
case "$CLI_CMD" in
    claude)
        cd "$PROJECT_ROOT"
        claude -p "$AUDIT_PROMPT" --allowedTools "View,Read,Write,Edit,Bash"
        ;;
    gemini)
        cd "$PROJECT_ROOT"
        gemini -p "$AUDIT_PROMPT"
        ;;
    codex)
        cd "$PROJECT_ROOT"
        codex -p "$AUDIT_PROMPT"
        ;;
    aider)
        cd "$PROJECT_ROOT"
        # Aider works differently - message mode
        aider --message "$AUDIT_PROMPT" $CONFIG_FILES
        ;;
esac

echo ""
echo -e "${GREEN}Audit complete.${NC}"
echo -e "Backups in: ${BLUE}$BACKUP_DIR${NC}"
