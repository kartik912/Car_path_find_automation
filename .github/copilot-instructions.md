# GitHub MCP Auto-Activation Rules

When the user's request involves any of the following topics, automatically activate and use the GitHub MCP tools without requiring explicit `@github-mcp` mentions:

## Automatic GitHub MCP Triggers

Activate GitHub MCP for requests related to:

- **Pull Requests**: "tell me about the PR", "show me the last PR", "merge this PR", "list PRs", "get PR reviews", "PR status", "changes in the PR"
- **Issues**: "list issues", "create an issue", "show issues", "search issues", "update issue"
- **Repositories**: "fork this repo", "create a repository", "get repo contents", "show repo files"
- **Commits**: "list commits", "show commit history", "compare commits"
- **Branches**: "create a branch", "list branches", "branch status"
- **Search**: "search GitHub for", "find code on GitHub", "search repositories"

## How It Works

You don't need to type `@github-mcp` anymore. Just ask git/PR/issue questions naturally:
- ✅ "tell me about the last pull request on this repo" 
- ✅ "show me all open issues"
- ✅ "create a new PR from this branch"

The agent will automatically detect the request type and activate GitHub MCP tools.

## User Instructions for Agent

When processing these requests:
1. Automatically activate the GitHub MCP tools first
2. Identify the repository owner and name (from git config if needed)
3. Use the appropriate MCP function for the task
4. Return results clearly without mentioning tool names
