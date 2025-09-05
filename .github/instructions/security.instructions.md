---
applyTo: "**/*.{ts,js,py}"
---

# D2E Security Guidelines

This document outlines security best practices and requirements for the Data2Evidence (D2E) healthcare platform.

## Authentication & Authorization

### JWT Token Management

```typescript
// ✅ Good: Proper JWT handling
import { verifyToken } from '@/utils/auth';

export async function authenticateRequest(req: Request): Promise<User> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw new UnauthorizedError('No token provided');
  }
  
  try {
    const payload = await verifyToken(token);
    return await getUserById(payload.sub);
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
}

// ❌ Bad: No token validation
export async function authenticateRequest(req: Request): Promise<User> {
  const token = req.headers.get('Authorization');
  return JSON.parse(atob(token.split('.')[1])); // Never do this!
}
```

### Role-Based Access Control (RBAC)

```typescript
// ✅ Good: Proper RBAC implementation
export function hasPermission(user: User, resource: string, action: string): boolean {
  const userRoles = user.roles || [];
  
  return userRoles.some(role => {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.some(permission => 
      permission.resource === resource && 
      permission.actions.includes(action)
    );
  });
}

// Usage in API endpoints
export async function getPatientData(req: Request): Promise<Response> {
  const user = await authenticateRequest(req);
  
  if (!hasPermission(user, 'patients', 'read')) {
    throw new ForbiddenError('Insufficient permissions');
  }
  
  // Proceed with data access
}

// ❌ Bad: No permission checking
export async function getPatientData(req: Request): Promise<Response> {
  // Direct data access without permission check
  return await db.query('SELECT * FROM patients');
}
```

### Session Management

- **Secure Cookies**: Use httpOnly, secure, sameSite attributes
- **Session Timeout**: Implement automatic session expiration
- **Token Rotation**: Rotate refresh tokens regularly
- **Logout Handling**: Properly invalidate sessions on logout

```typescript
// ✅ Good: Secure session configuration
const sessionConfig = {
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 60 * 1000 // 30 minutes
  },
  rolling: true, // Reset expiry on activity
  resave: false,
  saveUninitialized: false
};
```

## Data Security

### Database Security

#### SQL Injection Prevention

```typescript
// ✅ Good: Parameterized queries
export async function getPatientById(id: string): Promise<Patient> {
  const query = 'SELECT * FROM patients WHERE id = $1';
  const result = await db.query(query, [id]);
  return result.rows[0];
}

// ✅ Good: ORM usage
export async function getPatientById(id: string): Promise<Patient> {
  return await Patient.findById(id); // ORM handles parameterization
}

// ❌ Bad: String concatenation (SQL injection risk)
export async function getPatientById(id: string): Promise<Patient> {
  const query = `SELECT * FROM patients WHERE id = '${id}'`; // NEVER!
  const result = await db.query(query);
  return result.rows[0];
}
```

#### Connection Security

```typescript
// ✅ Good: Secure database connection
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    require: true,
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-cert.pem').toString()
  },
  max: 10, // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
};
```

### Input Validation & Sanitization

```typescript
// ✅ Good: Comprehensive input validation
import { z } from 'zod';
import DOMPurify from 'dompurify';

const PatientSchema = z.object({
  firstName: z.string().min(1).max(50).regex(/^[a-zA-Z\s-']+$/),
  lastName: z.string().min(1).max(50).regex(/^[a-zA-Z\s-']+$/),
  dateOfBirth: z.string().datetime(),
  email: z.string().email().optional(),
  phoneNumber: z.string().regex(/^\+?[\d\s\-\(\)]+$/).optional()
});

export async function createPatient(req: Request): Promise<Response> {
  try {
    // Validate input structure
    const validatedData = PatientSchema.parse(req.body);
    
    // Sanitize text inputs
    const sanitizedData = {
      ...validatedData,
      firstName: DOMPurify.sanitize(validatedData.firstName),
      lastName: DOMPurify.sanitize(validatedData.lastName)
    };
    
    // Additional business validation
    if (await patientExists(sanitizedData.email)) {
      throw new ConflictError('Patient already exists');
    }
    
    return await createPatientRecord(sanitizedData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError('Invalid input data');
    }
    throw error;
  }
}

// ❌ Bad: No validation or sanitization
export async function createPatient(req: Request): Promise<Response> {
  return await createPatientRecord(req.body); 
}
```