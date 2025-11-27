import axios from 'axios';
import { SwaggerDoc, ApiSearchResult, Operation, Parameter } from './types.js';

export class SwaggerLoader {
    private url: string;
    private doc: SwaggerDoc | null = null;

    constructor(url: string) {
        this.url = url;
    }

    async load(): Promise<void> {
        try {
            const response = await axios.get(this.url);
            if (typeof response.data === 'string') {
                try {
                    this.doc = JSON.parse(response.data);
                } catch (e) {
                    throw new Error('Failed to parse Swagger JSON response');
                }
            } else {
                this.doc = response.data;
            }
        } catch (error) {
            console.error('Error fetching Swagger doc:', error);
            throw new Error(`Failed to fetch Swagger documentation from ${this.url}`);
        }
    }

    search(keyword: string): ApiSearchResult[] {
        if (!this.doc) return [];

        const results: ApiSearchResult[] = [];
        const lowerKeyword = keyword.toLowerCase();

        // Split keyword into tokens for better matching
        const keywordTokens = lowerKeyword.split(/[\s\-_]+/).filter(t => t.length > 0);

        for (const [path, pathItem] of Object.entries(this.doc.paths)) {
            for (const [method, operation] of Object.entries(pathItem)) {
                if (method === 'parameters' || method === 'summary' || method === 'description') continue;

                const op = operation as Operation;
                const summary = op.summary || '';
                const description = op.description || '';
                const operationId = op.operationId || '';
                const tags = (op.tags || []).join(' ');

                // Combine all searchable text
                const searchableText = `${path} ${summary} ${description} ${operationId} ${tags}`.toLowerCase();

                // Check if keyword or any token matches
                const matches = lowerKeyword.includes(' ')
                    ? keywordTokens.every(token => searchableText.includes(token)) // All tokens must match
                    : searchableText.includes(lowerKeyword); // Simple substring match

                if (matches) {
                    results.push({
                        path,
                        method,
                        summary,
                        description,
                    });
                }
            }
        }
        return results;
    }

    private resolveSchema(schema: any, depth: number = 0): any {
        if (!schema || depth > 5) return schema; // Prevent infinite recursion

        // Handle $ref
        if (schema.$ref) {
            const refPath = schema.$ref.replace('#/', '').split('/');
            let resolved: any = this.doc;

            for (const part of refPath) {
                if (resolved && resolved[part]) {
                    resolved = resolved[part];
                } else {
                    // Can't resolve, return original
                    return schema;
                }
            }

            // Recursively resolve the referenced schema
            return this.resolveSchema(resolved, depth + 1);
        }

        // Handle arrays
        if (schema.type === 'array' && schema.items) {
            return {
                ...schema,
                items: this.resolveSchema(schema.items, depth + 1)
            };
        }

        // Handle objects with properties
        if (schema.type === 'object' && schema.properties) {
            const resolvedProperties: any = {};
            for (const [key, value] of Object.entries(schema.properties)) {
                resolvedProperties[key] = this.resolveSchema(value as any, depth + 1);
            }
            return {
                ...schema,
                properties: resolvedProperties
            };
        }

        // Handle allOf, anyOf, oneOf
        if (schema.allOf) {
            return {
                ...schema,
                allOf: schema.allOf.map((s: any) => this.resolveSchema(s, depth + 1))
            };
        }

        return schema;
    }

    getEndpointDetails(path: string, method: string): Operation | null {
        if (!this.doc) return null;

        const pathItem = this.doc.paths[path];
        if (!pathItem) return null;

        const operation = pathItem[method.toLowerCase()];
        if (!operation) return null;

        return operation as Operation;
    }

    getFormattedEndpointDetails(path: string, method: string): any {
        const operation = this.getEndpointDetails(path, method);
        if (!operation) return null;

        // Extract parameters
        const parameters = (operation.parameters || []).map(param => ({
            name: param.name,
            in: param.in,
            required: param.required || false,
            description: param.description || '',
            type: param.type || param.schema?.type || 'unknown',
            schema: param.schema
        }));

        // Extract request body (OpenAPI 3.0)
        let requestBody = null;
        if (operation.requestBody) {
            const content = operation.requestBody.content;
            const firstContentType = Object.keys(content)[0];
            requestBody = {
                required: operation.requestBody.required || false,
                description: operation.requestBody.description || '',
                contentType: firstContentType,
                schema: content[firstContentType]?.schema
            };
        }

        // Extract responses with schemas
        const responses: any = {};
        for (const [statusCode, response] of Object.entries(operation.responses)) {
            const resp = response as any;

            // OpenAPI 3.0 format
            if (resp.content) {
                const contentType = Object.keys(resp.content)[0];
                const originalSchema = resp.content[contentType]?.schema;
                responses[statusCode] = {
                    description: resp.description,
                    contentType: contentType,
                    schema: originalSchema ? this.resolveSchema(originalSchema) : null
                };
            }
            // Swagger 2.0 format
            else if (resp.schema) {
                responses[statusCode] = {
                    description: resp.description,
                    schema: this.resolveSchema(resp.schema)
                };
            } else {
                responses[statusCode] = {
                    description: resp.description
                };
            }
        }

        return {
            path,
            method: method.toUpperCase(),
            summary: operation.summary || '',
            description: operation.description || '',
            operationId: operation.operationId || '',
            tags: operation.tags || [],
            parameters,
            requestBody,
            responses
        };
    }

    searchWithDetails(keyword: string, limit: number = 5): any[] {
        const searchResults = this.search(keyword);
        const limitedResults = searchResults.slice(0, limit);

        return limitedResults.map(result => {
            const details = this.getFormattedEndpointDetails(result.path, result.method);
            return details;
        }).filter(detail => detail !== null);
    }
}

