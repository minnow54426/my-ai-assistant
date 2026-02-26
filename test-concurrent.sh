#!/bin/bash

# Test concurrent API calls with file locking
# This script simulates multiple sessions making API calls simultaneously

echo "=== Testing Concurrent API Calls ==="
echo ""
echo "This will test if file locking prevents concurrent API calls"
echo ""

# Clean up any existing lock file
rm -f data/api.lock

# Function to run a test "chat session"
run_session() {
    local session_num=$1
    local message=$2

    echo "Session $session_num: Sending '$message' at $(date '+%H:%M:%S.%N')"

    # Use node to call the agent directly (simulates chat interaction)
    node -e "
        const { GLMClient } = require('./src/llm/glm');
        const { ToolRegistry } = require('./src/agent/tools');
        const { echoTool, getTimeTool, fileListTool } = require('./src/agent/built-in-tools');
        const { AgentExecutor } = require('./src/agent/executor');
        const { MemoryManager } = require('./src/memory/memory-manager');
        const path = require('path');

        const glmClient = new GLMClient({
            apiKey: process.env.GLM_API_KEY,
            baseURL: process.env.GLM_URL,
            model: 'glm-4-flash'
        });

        const tools = new ToolRegistry();
        tools.register(echoTool);
        tools.register(getTimeTool);
        tools.register(fileListTool);

        const memoryManager = new MemoryManager({
            storagePath: path.join(process.cwd(), 'data', 'test-concurrent.json'),
            maxRecentMessages: 15,
            summarizeAfter: 20,
            maxSummaries: 50
        }, glmClient);

        const agent = new AgentExecutor({
            llmClient: glmClient,
            tools: tools,
            memoryManager
        });

        agent.processMessage('$message')
            .then(response => console.log('Session $session_num: Response received at ' + new Date().toISOString()))
            .catch(error => console.error('Session $session_num: Error -', error.message));
    " &

    # Record the process ID
    echo "Session $session_num: Started (PID: $!)"
}

echo "Starting 3 concurrent sessions..."
echo ""

# Start 3 sessions concurrently
run_session 1 "Hello from session 1"
sleep 0.1  # Small delay to ensure they start at slightly different times
run_session 2 "Hello from session 2"
sleep 0.1
run_session 3 "Hello from session 3"

echo ""
echo "All sessions started. Waiting for completion..."
echo ""

# Wait for all background processes
wait

echo ""
echo "=== Test Complete ==="
echo ""
echo "Check the results above:"
echo "- If file locking works, sessions should complete sequentially (one after another)"
echo "- Each session should show a timestamp showing when it received its response"
echo "- Total time should be ~15-20 seconds (3 sessions × ~5 seconds each)"
echo ""
echo "Lock file location: data/api.lock"
echo "Test memory file: data/test-concurrent.json"
