# Arsenal — Installed Tools & Capabilities

## MCP Servers (Active in Claude Code)

| Server | Status | Purpose |
|--------|--------|---------|
| **Context7** | Connected | Up-to-date library/framework documentation in AI context |
| **GitHub MCP** | Connected | Direct repo, PR, issue access from agents |

## AI Agent Frameworks

| Tool | Location | Stars | Purpose |
|------|----------|-------|---------|
| **DeerFlow 2.0** (ByteDance) | `/home/user/tools/deer-flow` | 30K+ | Autonomous research, sub-agents, sandboxed code execution, persistent memory |
| **Superpowers** (obra) | `/home/user/tools/superpowers` | 81K+ | Structured dev workflow: brainstorming, TDD, subagent execution, code review |

## AI Development Tools

| Tool | Command | Version | Purpose |
|------|---------|---------|---------|
| **Aider** | `aider` | 0.86.2 | Git-native AI pair programming with auto-commits |
| **PR-Agent** (Qodo) | `python3 -m pr_agent` | 0.2.4 | AI-powered PR review, descriptions, suggestions |
| **Browser-Use** | `python3 -c "from browser_use import ..."` | 0.12.2 | Turn any LLM into a browser automation agent |

## LLM SDKs

| SDK | Language | Purpose |
|-----|----------|---------|
| **Anthropic SDK** | Python (installed) | Claude API access |
| **OpenAI SDK** | Python (installed) | GPT API access |
| **Google GenAI** | Python (installed) | Gemini API access |

## CLI Power Tools

| Tool | Command | Version | Replaces |
|------|---------|---------|----------|
| **bat** | `bat` | 0.24.0 | cat (syntax highlighting) |
| **fd** | `fdfind` | 9.0.0 | find (fast file finder) |
| **fzf** | `fzf` | 0.44.1 | manual search (fuzzy finder) |
| **ripgrep** | `rg` | (built-in) | grep (fast regex search) |

## Runtimes Available

| Runtime | Version |
|---------|---------|
| Node.js | 22.22.0 |
| npm | 10.9.4 |
| pnpm | installed |
| bun | installed |
| Python | 3.11.14 |
| Go | installed |
| Rust/Cargo | installed |
| Docker | 29.2.1 |
| UV (Python) | installed |

## Quick Reference

```bash
# Start DeerFlow
cd /home/user/tools/deer-flow && make docker-start

# Run Aider on current project
cd /home/user/Munipal- && aider

# AI-powered PR review
pr-agent --pr-url <github-pr-url> review

# Browser automation
python3 -c "from browser_use import Agent; ..."

# Fuzzy find files
fzf

# Search with syntax highlighting
rg "pattern" | bat
```
