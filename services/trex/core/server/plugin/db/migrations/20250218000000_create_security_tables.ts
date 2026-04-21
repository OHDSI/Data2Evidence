import d from "../../../../../../../functions/package.json" with { type: "json" };

const roles = d.trex.functions.roles;
const scopes = d.trex.functions.scopes;

// Helper function to postprocess permission strings
const postprocessPermission = (permission: string): string => {
  return permission
    .replace('^/', '')        // Remove regex start (^)
    .replace('$', '')        // Remove regex end ($)
    .replace('\\?', '')        // Remove regex '\?'
    .replace(/\(\?!schema\)/g, '')
    .replace(/\(\?!fhir\)/g, '')
    .replace(/\|/g, ',')       // Replace '|' with ','
    .replace('/(.*)', ':*') // Replace "(.*)" with '*'
    .replace('(.*)', ':*') // Replace "(.*)" with '*'
    .replace('(.+)', '*') // Replace "(.*)" with '*'
    .replace('[^/]+', '*') // Replace any segment of non-slash characters with '*'
    .replace('[0-9]+', '*') // Replace numbers with '*'
    .replace('[0-9a-fA-F-]+', '*') // Replace hex strings with '*'
    .replace('[0-9a-zA-Z]+', '*') // Replace alphanumeric strings with '*'
    .replace('[a-zA-Z0-9-]+', '*') // Replace alphanumeric strings with dashes with '*'
    .replace('[a-zA-Z0-9_]+', '*') // Replace alphanumeric strings with underscores with '*'
    .replace('[a-zA-Z0-9_]*', '*') // Replace alphanumeric strings with underscores (including empty) with '*'
    .replace('[a-zA-Z]+', '*') // Replace alphabetic strings with '*'
    .replace('[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', '*') // Replace UUIDs with '*'
    .replace(/\//g, ':')       // Replace '/' with ':'
    .replace(/\(/g, '')
    .replace(/\)/g, '');
};

// Extract all unique permissions from scopes array (using path values)
// If httpMethods exists, create separate permission entries for each method
const allPermissions = new Set<string>();
scopes.forEach((scope: any) => {
  if (scope.path) {
    if (scope.httpMethods && Array.isArray(scope.httpMethods)) {
      // Create a permission entry for each HTTP method
      scope.httpMethods.forEach((method: string) => {
        const rawPermission = `${scope.path}/${method}`;
        const processedPermission = postprocessPermission(rawPermission);
        allPermissions.add(processedPermission);
      });
    } else {
      // No httpMethods, just add the path
      const processedPermission = postprocessPermission(scope.path);
      allPermissions.add(processedPermission);
    }
  }
});

// Generate INSERT statements for roles
const roleInserts = Object.keys(roles)
  .map(roleName => `('${roleName}', '${roleName}')`)
  .join(',\n        ');

// Generate INSERT statements for permissions (using scope paths)
const permissionInserts = Array.from(allPermissions)
  .map(permission => `('${permission}', '${permission}')`)
  .join(',\n        ');

// Generate INSERT statements for role-permission mappings
// Map each role to all scope paths that contain any of the role's scopes
// const rolePermissionInserts = Object.entries(roles)
//   .flatMap(([roleName, roleScopes]: [string, any]) => {
//     const matchingPaths: string[] = [];
//     scopes.forEach((scope: any) => {
//       if (scope.path && scope.scopes) {
//         // Check if any of the role's scopes match the scope's scopes
//         const hasMatchingScope = roleScopes.some((roleScope: string) =>
//           scope.scopes.includes(roleScope)
//         );
//         if (hasMatchingScope) {
//           if (scope.httpMethods && Array.isArray(scope.httpMethods)) {
//             // Create a mapping for each HTTP method
//             scope.httpMethods.forEach((method: string) => {
//               const rawPermission = `${scope.path}/${method}`;
//               const processedPermission = postprocessPermission(rawPermission);
//               matchingPaths.push(`('${roleName}', '${processedPermission}')`);
//             });
//           } else {
//             // No httpMethods, just add the path
//             const processedPermission = postprocessPermission(scope.path);
//             matchingPaths.push(`('${roleName}', '${processedPermission}')`);
//           }
//         }
//       }
//     });
//     return matchingPaths;
//   })
//   .join(',\n        ');

export async function up(knex: any): Promise<void> {
  return knex.schema
    .withSchema('trex')
    .raw(`
      -- Create sec_role table
      CREATE TABLE IF NOT EXISTS sec_role (
        name VARCHAR(256) PRIMARY KEY,
        description TEXT
      );

      -- Create sec_permission table
      CREATE TABLE IF NOT EXISTS sec_permission (
        name VARCHAR(256) PRIMARY KEY,
        description TEXT
      );

      -- Create sec_role_permission junction table
      CREATE TABLE IF NOT EXISTS sec_role_permission (
        role_name VARCHAR(256) NOT NULL REFERENCES sec_role(name) ON DELETE CASCADE,
        permission_name VARCHAR(256) NOT NULL REFERENCES sec_permission(name) ON DELETE CASCADE,
        PRIMARY KEY (role_name, permission_name)
      );

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_sec_role_permission_role_name ON sec_role_permission(role_name);
      CREATE INDEX IF NOT EXISTS idx_sec_role_permission_permission_name ON sec_role_permission(permission_name);

      -- Insert roles
      INSERT INTO sec_role (name, description)
      VALUES
        ${roleInserts}
      ON CONFLICT (name) DO NOTHING;

      -- Insert permissions
      INSERT INTO sec_permission (name, description)
      VALUES
        ${permissionInserts}
      ON CONFLICT (name) DO NOTHING;

      -- Insert role-permission mappings
      -- INSERT INTO sec_role_permission (role_name, permission_name)
      --  VALUES
      --  rolePermissionInserts
      -- ON CONFLICT (role_name, permission_name) DO NOTHING;
    `);
}

export async function down(knex: any): Promise<void> {
  return knex.schema
    .withSchema('trex')
    .raw(`
      -- Drop tables in reverse order due to foreign key constraints
      DROP TABLE IF EXISTS sec_role_permission;
      DROP TABLE IF EXISTS sec_permission;
      DROP TABLE IF EXISTS sec_role;
    `);
}
