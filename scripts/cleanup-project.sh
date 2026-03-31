#!/bin/bash

################################################################################
# PROJECT CLEANUP & ALIGNMENT SCRIPT v2
# Run inside any project folder to audit its structure against MASTER-LIBRARY,
# remove components that don't belong for its app type, add missing ones,
# and verify the CLAUDE.md cron job is active.
#
# Handles BOTH folder layouts:
#   - Hierarchical (new): skills/category/skill-name/SKILL.md
#   - Flat (legacy):      skills/skill-name/SKILL.md
#
# Usage:  cd ~/CODE/MY-PROJECT && bash ../MASTER-LIBRARY/scripts/cleanup-project.sh
#    or:  bash /path/to/cleanup-project.sh /path/to/project
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# If a project path was passed as argument, use it; otherwise use cwd
if [ -n "$1" ] && [ -d "$1" ]; then
    PROJECT="$(cd "$1" && pwd)"
else
    PROJECT="$(pwd)"
fi

# Try to find MASTER-LIBRARY relative to project
PARENT_DIR="$(dirname "$PROJECT")"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Try multiple paths for MASTER-LIBRARY
if [ -d "$PARENT_DIR/MASTER-LIBRARY" ]; then
    LIBRARY="$PARENT_DIR/MASTER-LIBRARY"
elif [ -d "$(dirname "$SCRIPT_DIR")" ] && [ -d "$(dirname "$SCRIPT_DIR")/agents" ]; then
    LIBRARY="$(dirname "$SCRIPT_DIR")"
else
    LIBRARY=""
fi

################################################################################
# HELPERS
################################################################################

print_header() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  Project Cleanup & Alignment Tool v2${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() { echo -e "  ${GREEN}✓${NC} $1"; }
print_error()   { echo -e "  ${RED}✗${NC} $1"; }
print_info()    { echo -e "  ${BLUE}ℹ${NC} $1"; }
print_warn()    { echo -e "  ${YELLOW}⚠${NC} $1"; }
print_action()  { echo -e "  ${MAGENTA}→${NC} $1"; }
print_dim()     { echo -e "  ${DIM}$1${NC}"; }

section_header() {
    echo ""
    echo -e "${CYAN}── $1 ──${NC}"
}

# Count items in a directory (returns 0 if dir doesn't exist)
count_items() {
    local dir="$1"
    if [ -d "$dir" ]; then
        ls -1 "$dir" 2>/dev/null | grep -v '^\.' | grep -v '.DS_Store' | wc -l | tr -d ' '
    else
        echo "0"
    fi
}

# Check if a directory IS a skill (contains SKILL.md or SKILL_*.md)
is_skill_dir() {
    local dir="$1"
    [ -d "$dir" ] && (ls "$dir"/SKILL*.md 1>/dev/null 2>&1)
}

################################################################################
# BUILD LIBRARY NAME→CATEGORY MAP
# This lets us match skills by NAME regardless of folder structure
################################################################################

# Associative-array-like lookup using a flat string
# Format: " name=category name2=category2 "
LIBRARY_SKILL_MAP=" "

if [ -d "$LIBRARY/skills" ]; then
    for cat_dir in "$LIBRARY"/skills/*/; do
        if [ -d "$cat_dir" ]; then
            cat_name=$(basename "$cat_dir")
            for skill_dir in "$cat_dir"*/; do
                if [ -d "$skill_dir" ] && is_skill_dir "$skill_dir"; then
                    sname=$(basename "$skill_dir")
                    LIBRARY_SKILL_MAP="${LIBRARY_SKILL_MAP}${sname}=${cat_name} "
                fi
            done
        fi
    done
fi

# Lookup: get category for a skill name from library
get_library_category() {
    local name="$1"
    local result=""
    # Extract from the map string
    case "$LIBRARY_SKILL_MAP" in
        *" ${name}="*)
            result=$(echo "$LIBRARY_SKILL_MAP" | grep -o "${name}=[^ ]*" | head -1 | cut -d= -f2)
            ;;
    esac
    echo "$result"
}

################################################################################
# DETECT PROJECT LAYOUT
################################################################################

# A project uses FLAT layout if skills/ contains dirs with SKILL.md directly
# A project uses HIERARCHICAL layout if skills/ contains category dirs
# that in turn contain skill dirs with SKILL.md
LAYOUT="unknown"
SKILLS_DIR="$PROJECT/.agent/skills"

if [ -d "$SKILLS_DIR" ]; then
    # Check: do any immediate children have SKILL.md? → flat layout
    flat_count=0
    hier_count=0
    for item_dir in "$SKILLS_DIR"/*/; do
        if [ -d "$item_dir" ]; then
            if is_skill_dir "$item_dir"; then
                flat_count=$((flat_count + 1))
            else
                # Check if it's a category (has subdirs with SKILL.md)
                for sub_dir in "$item_dir"*/; do
                    if [ -d "$sub_dir" ] && is_skill_dir "$sub_dir"; then
                        hier_count=$((hier_count + 1))
                        break
                    fi
                done
            fi
        fi
    done

    if [ "$flat_count" -gt "$hier_count" ]; then
        LAYOUT="flat"
    elif [ "$hier_count" -gt 0 ]; then
        LAYOUT="hierarchical"
    elif [ "$flat_count" -gt 0 ]; then
        LAYOUT="flat"
    fi
fi

################################################################################
# SCAN CURRENT SKILLS (layout-aware)
################################################################################

# Build list of skill NAMES present in the project (just names, no categories)
CURRENT_SKILL_NAMES=""

scan_project_skills() {
    if [ "$LAYOUT" = "flat" ]; then
        # Flat: skills/skill-name/SKILL.md
        for item_dir in "$SKILLS_DIR"/*/; do
            if [ -d "$item_dir" ] && is_skill_dir "$item_dir"; then
                sname=$(basename "$item_dir")
                CURRENT_SKILL_NAMES="$CURRENT_SKILL_NAMES $sname"
            fi
        done
    elif [ "$LAYOUT" = "hierarchical" ]; then
        # Hierarchical: skills/category/skill-name/SKILL.md
        for cat_dir in "$SKILLS_DIR"/*/; do
            if [ -d "$cat_dir" ]; then
                for skill_dir in "$cat_dir"*/; do
                    if [ -d "$skill_dir" ] && is_skill_dir "$skill_dir"; then
                        sname=$(basename "$skill_dir")
                        CURRENT_SKILL_NAMES="$CURRENT_SKILL_NAMES $sname"
                    fi
                done
            fi
        done
    fi
    CURRENT_SKILL_NAMES=$(echo "$CURRENT_SKILL_NAMES" | tr ' ' '\n' | sort -u | tr '\n' ' ')
}

################################################################################
# VALIDATE PROJECT
################################################################################

print_header

echo -e "  Project:  ${GREEN}$(basename "$PROJECT")${NC}"
echo -e "  Path:     ${DIM}$PROJECT${NC}"

# Check this looks like a project
if [ ! -d "$PROJECT/.agent" ] && [ ! -f "$PROJECT/CLAUDE.md" ]; then
    echo ""
    print_error "This doesn't look like a project folder (no .agent/ or CLAUDE.md found)."
    print_info "Run this script from inside a project directory, or pass the path as argument."
    exit 1
fi

# Find MASTER-LIBRARY
if [ -z "$LIBRARY" ] || [ ! -d "$LIBRARY/agents" ]; then
    echo ""
    printf "  MASTER-LIBRARY path: "
    read -r LIBRARY
    LIBRARY="$(cd "$LIBRARY" 2>/dev/null && pwd)" || {
        print_error "Cannot find MASTER-LIBRARY at: $LIBRARY"
        exit 1
    }
fi

if [ ! -d "$LIBRARY/agents" ] || [ ! -d "$LIBRARY/skills" ]; then
    print_error "MASTER-LIBRARY doesn't look right (missing agents/ or skills/)."
    exit 1
fi
echo -e "  Library:  ${DIM}$LIBRARY${NC}"
echo -e "  Layout:   ${BLUE}$LAYOUT${NC}"

################################################################################
# PHASE 1: SCAN CURRENT STATE
################################################################################

section_header "Phase 1: Current State Scan"

echo ""
echo -e "  ${BOLD}Agents:${NC}"

CURRENT_CORE_COUNT=$(count_items "$PROJECT/.agent/agents/core")
print_info "Core agents: $CURRENT_CORE_COUNT"

CURRENT_DOMAINS=""
if [ -d "$PROJECT/.agent/agents/domain" ]; then
    for domain_dir in "$PROJECT/.agent/agents/domain"/*/; do
        if [ -d "$domain_dir" ]; then
            dname=$(basename "$domain_dir")
            CURRENT_DOMAINS="$CURRENT_DOMAINS $dname"
            dcount=$(count_items "$domain_dir")
            print_dim "  domain/$dname → $dcount agents"
        fi
    done
fi

echo ""
echo -e "  ${BOLD}Skills (${LAYOUT} layout):${NC}"

scan_project_skills

for sname in $CURRENT_SKILL_NAMES; do
    lib_cat=$(get_library_category "$sname")
    if [ -n "$lib_cat" ]; then
        print_dim "  $sname (library: $lib_cat)"
    else
        print_dim "  $sname ${YELLOW}(not in library)${NC}"
    fi
done

SKILL_COUNT=$(echo "$CURRENT_SKILL_NAMES" | wc -w | tr -d ' ')
print_info "Total skills found: $SKILL_COUNT"

echo ""
echo -e "  ${BOLD}Workflows:${NC}"
CURRENT_WF_COUNT=0
if [ -d "$PROJECT/.agent/workflows" ]; then
    CURRENT_WF_COUNT=$(find "$PROJECT/.agent/workflows" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
    for wfdir in "$PROJECT/.agent/workflows"/*/; do
        if [ -d "$wfdir" ]; then
            wfname=$(basename "$wfdir")
            wfcount=$(count_items "$wfdir")
            print_dim "  $wfname/ → $wfcount files"
        fi
    done
fi
print_info "Total workflow files: $CURRENT_WF_COUNT"

echo ""
echo -e "  ${BOLD}Key Files:${NC}"
[ -f "$PROJECT/CLAUDE.md" ]   && print_success "CLAUDE.md exists"   || print_warn "CLAUDE.md MISSING"
[ -f "$PROJECT/AGENTS.md" ]   && print_success "AGENTS.md exists"   || print_warn "AGENTS.md missing"
[ -f "$PROJECT/GEMINI.md" ]   && print_success "GEMINI.md exists"   || print_dim "GEMINI.md not present"
[ -f "$PROJECT/scripts/audit-claude-md.sh" ] && print_success "audit-claude-md.sh present" || print_warn "audit-claude-md.sh MISSING"
[ -d "$PROJECT/.agent/rules" ] && print_success "Rules directory exists" || print_warn "Rules directory missing"

################################################################################
# PHASE 2: ASK APP TYPE
################################################################################

section_header "Phase 2: Domain Specialization"

echo ""
print_info "Every project gets the full build toolkit (dev, design, testing, etc.)."
print_info "What domain specialization(s) does this project have?"
echo ""
echo "  [1] Film & Screenplay"
echo "  [2] Game Development"
echo "  [3] Marketing & Sales"
echo "  [4] Spatial Computing / AR-VR"
echo "  [5] Productivity & Lifestyle"
echo "  [6] Business & Operations"
echo "  [7] Cyber & Recon"
echo "  [8] Everything (all domains)"
echo "  [0] None — just the base toolkit"
echo ""
printf "  Enter selection (comma-separated, e.g., 1,6): "
read -r SELECTION

SELECTED=" "
IFS=',' read -ra CHOICES <<< "$SELECTION"
for choice in "${CHOICES[@]}"; do
    clean=$(echo "$choice" | tr -d ' ')
    SELECTED="${SELECTED}${clean} "
done

has_selection() {
    case "$SELECTED" in
        *" $1 "*) return 0 ;;
        *) return 1 ;;
    esac
}

################################################################################
# PHASE 3: COMPUTE EXPECTED SKILL NAMES
# We work with NAMES only — layout doesn't matter for the diff
################################################################################

section_header "Phase 3: Computing Expected Stack"

# Expected skill NAMES (just the names, no category prefix)
EXPECTED_SKILL_NAMES=""
EXPECTED_DOMAINS=""

# ── ALWAYS EXPECTED (full build toolkit) ──
# Document skills
EXPECTED_SKILL_NAMES="$EXPECTED_SKILL_NAMES docx pdf pptx xlsx"

# All meta skills
if [ -d "$LIBRARY/skills/meta" ]; then
    for skill_dir in "$LIBRARY"/skills/meta/*/; do
        if [ -d "$skill_dir" ] && is_skill_dir "$skill_dir"; then
            sname=$(basename "$skill_dir")
            case "$sname" in *-OLD-BACKUP*|*-old-*) continue ;; esac
            EXPECTED_SKILL_NAMES="$EXPECTED_SKILL_NAMES $sname"
        fi
    done
fi

# All development skills
if [ -d "$LIBRARY/skills/development" ]; then
    for skill_dir in "$LIBRARY"/skills/development/*/; do
        if [ -d "$skill_dir" ] && is_skill_dir "$skill_dir"; then
            EXPECTED_SKILL_NAMES="$EXPECTED_SKILL_NAMES $(basename "$skill_dir")"
        fi
    done
fi

# All design skills
if [ -d "$LIBRARY/skills/design" ]; then
    for skill_dir in "$LIBRARY"/skills/design/*/; do
        if [ -d "$skill_dir" ] && is_skill_dir "$skill_dir"; then
            EXPECTED_SKILL_NAMES="$EXPECTED_SKILL_NAMES $(basename "$skill_dir")"
        fi
    done
fi

# Universal domain agents (always)
EXPECTED_DOMAINS="$EXPECTED_DOMAINS design engineering testing product project-management"

# ── DOMAIN-SPECIFIC (based on selection) ──

# [1] Film & Screenplay
if has_selection 1 || has_selection 8; then
    EXPECTED_DOMAINS="$EXPECTED_DOMAINS film-production"
    if [ -d "$LIBRARY/skills/creative" ]; then
        for skill_dir in "$LIBRARY"/skills/creative/*/; do
            if [ -d "$skill_dir" ] && is_skill_dir "$skill_dir"; then
                EXPECTED_SKILL_NAMES="$EXPECTED_SKILL_NAMES $(basename "$skill_dir")"
            fi
        done
    fi
fi

# [2] Game Development
if has_selection 2 || has_selection 8; then
    EXPECTED_DOMAINS="$EXPECTED_DOMAINS game-development"
fi

# [3] Marketing & Sales
if has_selection 3 || has_selection 8; then
    EXPECTED_DOMAINS="$EXPECTED_DOMAINS marketing sales"
fi

# [4] Spatial Computing / AR-VR
if has_selection 4 || has_selection 8; then
    EXPECTED_DOMAINS="$EXPECTED_DOMAINS spatial-computing"
fi

# [5] Productivity & Lifestyle — no extra agents/skills yet (base covers it)

# [6] Business & Operations
if has_selection 6 || has_selection 8; then
    EXPECTED_DOMAINS="$EXPECTED_DOMAINS specialized support"
fi

# [7] Cyber & Recon — no extra agents/skills yet (base covers security)

# [8] Everything — add all domains
if has_selection 8; then
    if [ -d "$LIBRARY/agents/domain" ]; then
        for domain_dir in "$LIBRARY"/agents/domain/*/; do
            if [ -d "$domain_dir" ]; then
                EXPECTED_DOMAINS="$EXPECTED_DOMAINS $(basename "$domain_dir")"
            fi
        done
    fi
fi

# Deduplicate
EXPECTED_DOMAINS=$(echo "$EXPECTED_DOMAINS" | tr ' ' '\n' | sort -u | grep -v '^$' | tr '\n' ' ')
EXPECTED_SKILL_NAMES=$(echo "$EXPECTED_SKILL_NAMES" | tr ' ' '\n' | sort -u | grep -v '^$' | tr '\n' ' ')

echo ""
print_info "Expected domains: $(echo $EXPECTED_DOMAINS | tr ' ' ', ')"
print_info "Expected skills: $(echo $EXPECTED_SKILL_NAMES | wc -w | tr -d ' ') total"

################################################################################
# PHASE 4: DIFF — What's Extra vs What's Missing
################################################################################

section_header "Phase 4: Differences Found"

EXTRA_SKILLS=()
MISSING_SKILLS=()
LOCAL_SKILLS=()
EXTRA_DOMAINS=()
MISSING_DOMAINS=()
OTHER_MISSING=()

# --- Check Domain Agents ---
echo ""
echo -e "  ${BOLD}Agent Domains:${NC}"

# Find extras
if [ -d "$PROJECT/.agent/agents/domain" ]; then
    for domain_dir in "$PROJECT/.agent/agents/domain"/*/; do
        if [ -d "$domain_dir" ]; then
            dname=$(basename "$domain_dir")
            is_expected=false
            for exp in $EXPECTED_DOMAINS; do
                if [ "$exp" = "$dname" ]; then
                    is_expected=true
                    break
                fi
            done
            if ! $is_expected; then
                print_warn "EXTRA: domain/$dname (not needed for this app type)"
                EXTRA_DOMAINS+=("$dname")
            else
                print_success "OK: domain/$dname"
            fi
        fi
    done
fi

# Find missing
for exp in $EXPECTED_DOMAINS; do
    if [ ! -d "$PROJECT/.agent/agents/domain/$exp" ]; then
        print_error "MISSING: domain/$exp"
        MISSING_DOMAINS+=("$exp")
    fi
done

# --- Check Skills (by NAME, layout-aware) ---
echo ""
echo -e "  ${BOLD}Skills:${NC}"

EXPECTED_LOOKUP=" $EXPECTED_SKILL_NAMES "

# Find extras vs local: skills present in project but NOT in expected list
for sname in $CURRENT_SKILL_NAMES; do
    case "$EXPECTED_LOOKUP" in
        *" $sname "*)
            lib_cat=$(get_library_category "$sname")
            print_success "OK: $sname (${lib_cat:-local})"
            ;;
        *)
            lib_cat=$(get_library_category "$sname")
            if [ -n "$lib_cat" ]; then
                # Skill IS in library but not expected for this app type → removable
                print_warn "EXTRA: $sname ($lib_cat — not needed for this app type)"
                EXTRA_SKILLS+=("$sname")
            else
                # Skill NOT in library at all → local/custom, keep it
                print_info "LOCAL: $sname (custom skill, not in library — keeping)"
                LOCAL_SKILLS+=("$sname")
            fi
            ;;
    esac
done

# Find missing: expected skills not present in project
CURRENT_LOOKUP=" $CURRENT_SKILL_NAMES "
for expected_name in $EXPECTED_SKILL_NAMES; do
    case "$CURRENT_LOOKUP" in
        *" $expected_name "*)
            # Already present, skip
            ;;
        *)
            lib_cat=$(get_library_category "$expected_name")
            print_error "MISSING: $expected_name (library: ${lib_cat:-unknown})"
            MISSING_SKILLS+=("$expected_name")
            ;;
    esac
done

# --- Check Core Components ---
echo ""
echo -e "  ${BOLD}Core Components:${NC}"

LIBRARY_CORE_COUNT=$(count_items "$LIBRARY/agents/core")
if [ "$CURRENT_CORE_COUNT" -lt "$LIBRARY_CORE_COUNT" ]; then
    print_warn "Core agents: $CURRENT_CORE_COUNT (library has $LIBRARY_CORE_COUNT)"
    OTHER_MISSING+=("agents/core")
else
    print_success "Core agents: $CURRENT_CORE_COUNT (matches library)"
fi

LIBRARY_WF_COUNT=$(find "$LIBRARY/workflows/core" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
CURRENT_CORE_WF_COUNT=$(find "$PROJECT/.agent/workflows" -maxdepth 1 -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$CURRENT_CORE_WF_COUNT" -lt "$LIBRARY_WF_COUNT" ]; then
    print_warn "Core workflows: $CURRENT_CORE_WF_COUNT of $LIBRARY_WF_COUNT"
    OTHER_MISSING+=("workflows/core")
else
    print_success "Core workflows: $CURRENT_CORE_WF_COUNT"
fi

if [ -d "$LIBRARY/rules" ] && [ -d "$PROJECT/.agent/rules" ]; then
    lib_rules=$(count_items "$LIBRARY/rules")
    proj_rules=$(count_items "$PROJECT/.agent/rules")
    if [ "$proj_rules" -lt "$lib_rules" ]; then
        print_warn "Rules: $proj_rules of $lib_rules"
        OTHER_MISSING+=("rules")
    else
        print_success "Rules: $proj_rules"
    fi
elif [ -d "$LIBRARY/rules" ] && [ ! -d "$PROJECT/.agent/rules" ]; then
    print_warn "Rules directory missing entirely"
    OTHER_MISSING+=("rules")
fi

# .shared/ui-ux-pro-max is always expected
if [ ! -d "$PROJECT/.shared/ui-ux-pro-max" ]; then
    print_error "MISSING: .shared/ui-ux-pro-max"
    OTHER_MISSING+=(".shared/ui-ux-pro-max")
else
    print_success ".shared/ui-ux-pro-max present"
fi

################################################################################
# PHASE 5: CLAUDE.md CRON VERIFICATION
################################################################################

section_header "Phase 5: CLAUDE.md Auto-Update Verification"

if [ ! -f "$PROJECT/scripts/audit-claude-md.sh" ]; then
    print_error "audit-claude-md.sh NOT found in scripts/"
    OTHER_MISSING+=("scripts/audit-claude-md.sh")
else
    print_success "audit-claude-md.sh exists"
    if [ -f "$LIBRARY/scripts/audit-claude-md.sh" ]; then
        if diff -q "$PROJECT/scripts/audit-claude-md.sh" "$LIBRARY/scripts/audit-claude-md.sh" >/dev/null 2>&1; then
            print_success "audit-claude-md.sh matches library version"
        else
            print_warn "audit-claude-md.sh differs from library version (may need update)"
        fi
    fi
fi

CRON_EXISTS=false
if crontab -l 2>/dev/null | grep -qF "$PROJECT" && crontab -l 2>/dev/null | grep -qF "audit-claude-md.sh"; then
    CRON_EXISTS=true
    print_success "Cron job is active"
    CRON_LINE=$(crontab -l 2>/dev/null | grep -F "audit-claude-md.sh" | grep -F "$PROJECT" | head -1)
    print_dim "  $CRON_LINE"
else
    print_warn "NO cron job found for CLAUDE.md auto-audit"
fi

if [ -f "$PROJECT/CLAUDE.md" ]; then
    if [ "$(uname)" = "Darwin" ]; then
        LAST_MOD=$(stat -f %m "$PROJECT/CLAUDE.md" 2>/dev/null || echo 0)
    else
        LAST_MOD=$(stat -c %Y "$PROJECT/CLAUDE.md" 2>/dev/null || echo 0)
    fi
    NOW=$(date +%s)
    DAYS_OLD=$(( (NOW - LAST_MOD) / 86400 ))
    if [ "$DAYS_OLD" -gt 7 ]; then
        print_warn "CLAUDE.md is $DAYS_OLD days old — consider running audit"
    else
        print_success "CLAUDE.md was updated $DAYS_OLD day(s) ago"
    fi
fi

################################################################################
# PHASE 6: LAYOUT MIGRATION CHECK
################################################################################

section_header "Phase 6: Layout Assessment"

if [ "$LAYOUT" = "flat" ]; then
    print_info "This project uses FLAT skill layout (legacy)."
    print_info "New projects use HIERARCHICAL layout (skills/category/name/)."
    echo ""
    printf "  Migrate to hierarchical layout? [y/N]: "
    read -r DO_MIGRATE
    DO_MIGRATE=$(echo "$DO_MIGRATE" | tr '[:upper:]' '[:lower:]')
else
    DO_MIGRATE="n"
    print_success "Project uses hierarchical layout (current standard)."
fi

################################################################################
# PHASE 7: SUMMARY
################################################################################

section_header "Phase 7: Summary"

echo ""
EXTRA_SKILL_COUNT=${#EXTRA_SKILLS[@]}
MISSING_SKILL_COUNT=${#MISSING_SKILLS[@]}
EXTRA_DOMAIN_COUNT=${#EXTRA_DOMAINS[@]}
MISSING_DOMAIN_COUNT=${#MISSING_DOMAINS[@]}
OTHER_MISSING_COUNT=${#OTHER_MISSING[@]}

LOCAL_SKILL_COUNT=${#LOCAL_SKILLS[@]}
TOTAL_EXTRAS=$((EXTRA_SKILL_COUNT + EXTRA_DOMAIN_COUNT))
TOTAL_MISSING=$((MISSING_SKILL_COUNT + MISSING_DOMAIN_COUNT + OTHER_MISSING_COUNT))

if [ "$TOTAL_EXTRAS" -eq 0 ] && [ "$TOTAL_MISSING" -eq 0 ] && $CRON_EXISTS && [ "$DO_MIGRATE" != "y" ]; then
    echo -e "  ${GREEN}${BOLD}✨ Project is clean and aligned! No changes needed.${NC}"
    if [ "$LOCAL_SKILL_COUNT" -gt 0 ]; then
        echo ""
        echo -e "  ${BLUE}${BOLD}$LOCAL_SKILL_COUNT custom/local skill(s) (not in library — untouched):${NC}"
        for item in "${LOCAL_SKILLS[@]}"; do
            echo -e "    ${BLUE}~${NC} $item"
        done
    fi
    echo ""
    exit 0
fi

if [ "$TOTAL_EXTRAS" -gt 0 ]; then
    echo -e "  ${YELLOW}${BOLD}$TOTAL_EXTRAS component(s) that DON'T belong:${NC}"
    for item in "${EXTRA_DOMAINS[@]}"; do
        echo -e "    ${YELLOW}−${NC} agents/domain/$item"
    done
    for item in "${EXTRA_SKILLS[@]}"; do
        lib_cat=$(get_library_category "$item")
        echo -e "    ${YELLOW}−${NC} skill: $item (${lib_cat:-unknown})"
    done
    echo ""
fi

if [ "$TOTAL_MISSING" -gt 0 ]; then
    echo -e "  ${RED}${BOLD}$TOTAL_MISSING component(s) MISSING:${NC}"
    for item in "${MISSING_DOMAINS[@]}"; do
        echo -e "    ${RED}+${NC} agents/domain/$item"
    done
    for item in "${MISSING_SKILLS[@]}"; do
        lib_cat=$(get_library_category "$item")
        echo -e "    ${RED}+${NC} skill: $item (from library: ${lib_cat:-unknown})"
    done
    for item in "${OTHER_MISSING[@]}"; do
        echo -e "    ${RED}+${NC} $item"
    done
    echo ""
fi

if [ "$LOCAL_SKILL_COUNT" -gt 0 ]; then
    echo -e "  ${BLUE}${BOLD}$LOCAL_SKILL_COUNT custom/local skill(s) (not in library — untouched):${NC}"
    for item in "${LOCAL_SKILLS[@]}"; do
        echo -e "    ${BLUE}~${NC} $item"
    done
    echo ""
fi

if ! $CRON_EXISTS; then
    echo -e "  ${YELLOW}${BOLD}CLAUDE.md cron job not set up${NC}"
    echo ""
fi

if [ "$DO_MIGRATE" = "y" ]; then
    echo -e "  ${BLUE}${BOLD}Layout migration: flat → hierarchical${NC}"
    echo ""
fi

################################################################################
# PHASE 8: APPLY FIXES
################################################################################

section_header "Phase 8: Apply Fixes"

echo ""
echo "  What would you like to do?"
echo ""
echo "  [A] Apply ALL fixes (add missing + remove extras + fix cron + migrate)"
echo "  [M] Add MISSING components only (safe — adds, never deletes)"
echo "  [R] Remove EXTRA components only"
echo "  [C] Fix CLAUDE.md cron job only"
echo "  [D] Dry run — show what would happen, change nothing"
echo "  [Q] Quit — change nothing"
echo ""
printf "  Enter choice: "
read -r FIX_CHOICE
FIX_CHOICE=$(echo "$FIX_CHOICE" | tr '[:lower:]' '[:upper:]')

DRY_RUN=false
DO_ADD=false
DO_REMOVE=false
DO_CRON_FIX=false
DO_LAYOUT_MIGRATE=false

case "$FIX_CHOICE" in
    A) DO_ADD=true; DO_REMOVE=true; DO_CRON_FIX=true; [ "$DO_MIGRATE" = "y" ] && DO_LAYOUT_MIGRATE=true ;;
    M) DO_ADD=true ;;
    R) DO_REMOVE=true ;;
    C) DO_CRON_FIX=true ;;
    D) DRY_RUN=true; DO_ADD=true; DO_REMOVE=true; DO_CRON_FIX=true; [ "$DO_MIGRATE" = "y" ] && DO_LAYOUT_MIGRATE=true ;;
    Q) echo ""; print_info "No changes made."; exit 0 ;;
    *) print_error "Invalid choice."; exit 1 ;;
esac

CHANGES_MADE=0

# Helper: determine where to place a skill in the project
# For hierarchical layout, use category. For flat, put directly in skills/
get_dest_skill_path() {
    local skill_name="$1"
    local lib_cat=$(get_library_category "$skill_name")

    if [ "$LAYOUT" = "hierarchical" ] || $DO_LAYOUT_MIGRATE; then
        if [ -n "$lib_cat" ]; then
            echo "$PROJECT/.agent/skills/$lib_cat/$skill_name"
        else
            echo "$PROJECT/.agent/skills/$skill_name"
        fi
    else
        # Flat: put directly in skills/
        echo "$PROJECT/.agent/skills/$skill_name"
    fi
}

# Helper: find where a skill currently lives in the project
find_skill_in_project() {
    local skill_name="$1"
    # Check flat first
    if [ -d "$SKILLS_DIR/$skill_name" ] && is_skill_dir "$SKILLS_DIR/$skill_name"; then
        echo "$SKILLS_DIR/$skill_name"
        return
    fi
    # Check hierarchical
    for cat_dir in "$SKILLS_DIR"/*/; do
        if [ -d "$cat_dir/$skill_name" ] && is_skill_dir "$cat_dir/$skill_name"; then
            echo "$cat_dir/$skill_name"
            return
        fi
    done
}

# --- LAYOUT MIGRATION ---
if $DO_LAYOUT_MIGRATE; then
    echo ""
    echo -e "  ${CYAN}Migrating to hierarchical layout...${NC}"

    for sname in $CURRENT_SKILL_NAMES; do
        current_path=$(find_skill_in_project "$sname")
        lib_cat=$(get_library_category "$sname")

        if [ -z "$lib_cat" ]; then
            if $DRY_RUN; then
                print_action "[DRY RUN] Would skip $sname (not in library, leaving in place)"
            else
                print_dim "Skipping $sname (not in library catalog)"
            fi
            continue
        fi

        target_dir="$SKILLS_DIR/$lib_cat/$sname"

        # Already in the right place?
        if [ "$current_path" = "$target_dir" ]; then
            continue
        fi

        if $DRY_RUN; then
            print_action "[DRY RUN] Would move $sname → $lib_cat/$sname"
        else
            mkdir -p "$SKILLS_DIR/$lib_cat"
            mv "$current_path" "$target_dir" 2>/dev/null && {
                print_success "Moved $sname → $lib_cat/$sname"
                CHANGES_MADE=$((CHANGES_MADE + 1))
            } || {
                print_warn "Could not move $sname (try manually)"
            }
        fi
    done

    # Update layout for subsequent operations
    LAYOUT="hierarchical"
fi

# --- ADD MISSING SKILLS ---
if $DO_ADD && [ "${#MISSING_SKILLS[@]}" -gt 0 ]; then
    echo ""
    echo -e "  ${CYAN}Adding missing skills...${NC}"

    for skill_name in "${MISSING_SKILLS[@]}"; do
        lib_cat=$(get_library_category "$skill_name")
        src="$LIBRARY/skills/$lib_cat/$skill_name"
        dest=$(get_dest_skill_path "$skill_name")

        if $DRY_RUN; then
            print_action "[DRY RUN] Would copy $skill_name from $lib_cat/"
        else
            if [ -d "$src" ]; then
                mkdir -p "$dest"
                cp -R "$src"/* "$dest"/ 2>/dev/null || cp -r "$src"/* "$dest"/ 2>/dev/null || true
                print_success "Added $skill_name (from $lib_cat)"
                CHANGES_MADE=$((CHANGES_MADE + 1))
            else
                print_warn "Source not found: $src"
            fi
        fi
    done
fi

# --- ADD MISSING DOMAINS ---
if $DO_ADD && [ "${#MISSING_DOMAINS[@]}" -gt 0 ]; then
    echo ""
    echo -e "  ${CYAN}Adding missing agent domains...${NC}"

    for domain in "${MISSING_DOMAINS[@]}"; do
        src="$LIBRARY/agents/domain/$domain"
        dest="$PROJECT/.agent/agents/domain/$domain"
        if $DRY_RUN; then
            print_action "[DRY RUN] Would copy domain/$domain"
        else
            if [ -d "$src" ]; then
                mkdir -p "$dest"
                cp -R "$src"/* "$dest"/ 2>/dev/null || cp -r "$src"/* "$dest"/ 2>/dev/null || true
                print_success "Added domain/$domain"
                CHANGES_MADE=$((CHANGES_MADE + 1))
            fi
        fi
    done
fi

# --- ADD OTHER MISSING (core agents, workflows, rules, audit script) ---
if $DO_ADD && [ "${#OTHER_MISSING[@]}" -gt 0 ]; then
    echo ""
    echo -e "  ${CYAN}Adding other missing components...${NC}"

    for item in "${OTHER_MISSING[@]}"; do
        case "$item" in
            agents/core)
                if $DRY_RUN; then
                    print_action "[DRY RUN] Would sync core agents"
                else
                    mkdir -p "$PROJECT/.agent/agents/core"
                    cp -R "$LIBRARY/agents/core"/* "$PROJECT/.agent/agents/core"/ 2>/dev/null || true
                    print_success "Synced core agents"
                    CHANGES_MADE=$((CHANGES_MADE + 1))
                fi
                ;;
            workflows/core)
                if $DRY_RUN; then
                    print_action "[DRY RUN] Would sync core workflows"
                else
                    mkdir -p "$PROJECT/.agent/workflows"
                    cp -R "$LIBRARY/workflows/core"/* "$PROJECT/.agent/workflows"/ 2>/dev/null || true
                    print_success "Synced core workflows"
                    CHANGES_MADE=$((CHANGES_MADE + 1))
                fi
                ;;
            rules)
                if $DRY_RUN; then
                    print_action "[DRY RUN] Would sync rules"
                else
                    mkdir -p "$PROJECT/.agent/rules"
                    cp -R "$LIBRARY/rules"/* "$PROJECT/.agent/rules"/ 2>/dev/null || true
                    print_success "Synced rules"
                    CHANGES_MADE=$((CHANGES_MADE + 1))
                fi
                ;;
            scripts/audit-claude-md.sh)
                if $DRY_RUN; then
                    print_action "[DRY RUN] Would copy audit script"
                else
                    mkdir -p "$PROJECT/scripts"
                    cp "$LIBRARY/scripts/audit-claude-md.sh" "$PROJECT/scripts/audit-claude-md.sh"
                    chmod +x "$PROJECT/scripts/audit-claude-md.sh"
                    print_success "Added audit-claude-md.sh"
                    CHANGES_MADE=$((CHANGES_MADE + 1))
                fi
                ;;
            .shared/ui-ux-pro-max)
                if $DRY_RUN; then
                    print_action "[DRY RUN] Would copy .shared/ui-ux-pro-max"
                else
                    if [ -d "$LIBRARY/.shared/ui-ux-pro-max" ]; then
                        mkdir -p "$PROJECT/.shared/ui-ux-pro-max"
                        cp -R "$LIBRARY/.shared/ui-ux-pro-max"/* "$PROJECT/.shared/ui-ux-pro-max"/ 2>/dev/null || true
                        print_success "Added .shared/ui-ux-pro-max"
                        CHANGES_MADE=$((CHANGES_MADE + 1))
                    fi
                fi
                ;;
        esac
    done
fi

# --- REMOVE EXTRA SKILLS ---
if $DO_REMOVE && [ "${#EXTRA_SKILLS[@]}" -gt 0 ]; then
    echo ""
    echo -e "  ${CYAN}Removing extra skills...${NC}"

    TRASH="$PROJECT/.cleanup-trash/$(date +%Y%m%d_%H%M%S)"

    for skill_name in "${EXTRA_SKILLS[@]}"; do
        target=$(find_skill_in_project "$skill_name")
        if [ -z "$target" ]; then
            continue
        fi
        if $DRY_RUN; then
            print_action "[DRY RUN] Would remove skill: $skill_name"
        else
            mkdir -p "$TRASH"
            mv "$target" "$TRASH/" 2>/dev/null && {
                print_success "Removed $skill_name → .cleanup-trash/"
                CHANGES_MADE=$((CHANGES_MADE + 1))
            } || {
                print_warn "Could not remove $skill_name (try manually)"
            }
        fi
    done

    if ! $DRY_RUN && [ -d "$TRASH" ]; then
        print_dim ""
        print_dim "Removed skills are in .cleanup-trash/ — delete when you're sure."
    fi
fi

# --- REMOVE EXTRA DOMAINS ---
if $DO_REMOVE && [ "${#EXTRA_DOMAINS[@]}" -gt 0 ]; then
    echo ""
    echo -e "  ${CYAN}Removing extra agent domains...${NC}"

    TRASH="$PROJECT/.cleanup-trash/$(date +%Y%m%d_%H%M%S)"

    for domain in "${EXTRA_DOMAINS[@]}"; do
        target="$PROJECT/.agent/agents/domain/$domain"
        if $DRY_RUN; then
            print_action "[DRY RUN] Would remove domain/$domain"
        else
            mkdir -p "$TRASH"
            mv "$target" "$TRASH/" 2>/dev/null && {
                print_success "Removed domain/$domain → .cleanup-trash/"
                CHANGES_MADE=$((CHANGES_MADE + 1))
            } || {
                print_warn "Could not remove domain/$domain (try manually)"
            }
        fi
    done
fi

# --- FIX CRON ---
if $DO_CRON_FIX && ! $CRON_EXISTS; then
    echo ""
    echo -e "  ${CYAN}Setting up CLAUDE.md cron job...${NC}"

    PROJECT_SLUG=$(basename "$PROJECT" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')
    NEW_CRON_LINE="0 10 * * 1,4 cd $PROJECT && bash scripts/audit-claude-md.sh >> /tmp/claude-audit-${PROJECT_SLUG}.log 2>&1"

    if $DRY_RUN; then
        print_action "[DRY RUN] Would add cron: $NEW_CRON_LINE"
    else
        if [ -f "$PROJECT/scripts/audit-claude-md.sh" ]; then
            (crontab -l 2>/dev/null; echo "$NEW_CRON_LINE") | crontab -
            print_success "Cron job added: Mon & Thu at 10am"
            CHANGES_MADE=$((CHANGES_MADE + 1))
        else
            print_warn "Cannot add cron — audit-claude-md.sh not found. Add missing components first."
        fi
    fi
fi

################################################################################
# FINAL REPORT
################################################################################

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
if $DRY_RUN; then
    echo -e "${YELLOW}  Dry run complete — no changes were made.${NC}"
    echo -e "${YELLOW}  Run again and choose [A] to apply.${NC}"
elif [ "$CHANGES_MADE" -gt 0 ]; then
    echo -e "${GREEN}  Cleanup complete! $CHANGES_MADE change(s) applied.${NC}"
else
    echo -e "${GREEN}  No changes needed.${NC}"
fi
echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
echo ""
