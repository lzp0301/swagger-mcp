#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { SwaggerLoader } from './swagger.js';

const SWAGGER_URL = process.env.SWAGGER_URL;

if (!SWAGGER_URL) {
    console.error('Error: SWAGGER_URL environment variable is required');
    process.exit(1);
}

const loader = new SwaggerLoader(SWAGGER_URL);

// Initialize server
const server = new Server(
    {
        name: 'swagger-mcp-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Load Swagger doc on startup
// Note: In a real production server, you might want to handle this more robustly
// or lazily, but for this MCP, pre-loading is fine.
loader.load().catch(err => {
    console.error("Failed to load Swagger doc on startup:", err);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'search_api_with_details',
                description: 'Search for API endpoints using a keyword and get FULL DETAILS (parameters, request body, response schema) for all matching endpoints in ONE call. This is the RECOMMENDED tool for most queries about internal API documentation. Use this instead of search_api + get_api_details to save time.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        keyword: {
                            type: 'string',
                            description: 'The keyword to search for (e.g., "热力图", "getHotDisplayList", "user", "order")',
                        },
                        limit: {
                            type: 'number',
                            description: 'Maximum number of results to return (default: 5)',
                            default: 5,
                        },
                    },
                    required: ['keyword'],
                },
            },
            {
                name: 'search_api',
                description: 'Search for API endpoints using a keyword. Returns ONLY a list of matching paths and methods WITHOUT details. Use search_api_with_details instead if you need full information.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        keyword: {
                            type: 'string',
                            description: 'The keyword to search for (e.g., "user", "order", "getHotDisplayList")',
                        },
                    },
                    required: ['keyword'],
                },
            },
            {
                name: 'get_api_details',
                description: 'Get detailed information about a SPECIFIC API endpoint when you already know the exact path and method. If you are searching by keyword, use search_api_with_details instead.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'The API path (e.g., "/bi/getHotDisplayList")',
                        },
                        method: {
                            type: 'string',
                            description: 'The HTTP method (e.g., "get", "post")',
                        },
                    },
                    required: ['path', 'method'],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        if (request.params.name === 'search_api_with_details') {
            const { keyword, limit } = z.object({
                keyword: z.string(),
                limit: z.number().optional().default(5)
            }).parse(request.params.arguments);

            const results = loader.searchWithDetails(keyword, limit);

            if (results.length === 0) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `No API endpoints found matching keyword: "${keyword}"`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };
        }

        if (request.params.name === 'search_api') {
            const { keyword } = z.object({ keyword: z.string() }).parse(request.params.arguments);
            const results = loader.search(keyword);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };
        }

        if (request.params.name === 'get_api_details') {
            const { path, method } = z.object({ path: z.string(), method: z.string() }).parse(request.params.arguments);
            const details = loader.getFormattedEndpointDetails(path, method);
            if (!details) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Endpoint not found: ${method.toUpperCase()} ${path}`,
                        },
                    ],
                    isError: true,
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(details, null, 2),
                    },
                ],
            };
        }

        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new McpError(ErrorCode.InvalidParams, `Invalid arguments: ${error.message}`);
        }
        throw error;
    }
});

async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Swagger MCP Server running on stdio');
}

run().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
