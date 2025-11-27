export interface SwaggerDoc {
    swagger?: string;
    openapi?: string;
    info: {
        title: string;
        version: string;
        description?: string;
    };
    paths: Record<string, PathItem>;
    components?: {
        schemas?: Record<string, any>;
    };
    definitions?: Record<string, any>;
}

export interface PathItem {
    [method: string]: Operation | any;
}

export interface Operation {
    summary?: string;
    description?: string;
    operationId?: string;
    parameters?: Parameter[];
    requestBody?: RequestBody;
    responses: Record<string, Response>;
    tags?: string[];
}

export interface Parameter {
    name: string;
    in: 'query' | 'header' | 'path' | 'cookie';
    description?: string;
    required?: boolean;
    schema?: any;
    type?: string; // Swagger 2.0
}

export interface RequestBody {
    description?: string;
    content: Record<string, MediaType>;
    required?: boolean;
}

export interface MediaType {
    schema: any;
}

export interface Response {
    description: string;
    content?: Record<string, MediaType>;
    schema?: any; // Swagger 2.0
}

export interface ApiSearchResult {
    path: string;
    method: string;
    summary: string;
    description: string;
}

