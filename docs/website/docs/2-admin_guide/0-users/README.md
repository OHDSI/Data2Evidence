# User managment

The **User Management Page** provides an interface for administrators to manage user accounts, their roles, and access permissions in the system. It allows for creating, editing, deleting, and reviewing all registered users along with their assigned roles.

---

## Table structure

| Column       | Description                                                    |
|--------------|----------------------------------------------------------------|
| **Username** | Displays the unique identifier for each user.                  |
| **Role**     | Lists all roles assigned to the user, shown as badges.         |
| **Actions**  | Provides controls to **Edit**, **Delete**, or **Manage** the user. |

---

## User actions

Each row has an **Actions** section on the right, with the following buttons:

| Button        | Functionality                                      |
|---------------| ---------------------------------------------------|
| **Edit**      | Modify the user’s role assignments or credentials. |
| **Delete**    | Permanently remove the user from the system.       |
| **More**      | Activate / deactivate a user or change their password. |

### Adding a new user

- Click the **Add user** button at the top-right.
- A form will appear prompting for:
  - Username
  - Initial password

---

## User roles

Each user can have one or multiple roles, displayed as stylized badges. Available roles include:

| Role               | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| **Viewer**         | Can view content but cannot perform any administrative actions.             |
| **Dashboard Viewer** | Can access data quality and -characterization dashboard.                   |
| **Admin**          | Full system-wide administrative privileges.                                 |
| **User Admin**     | Can manage user accounts (create, update, assign roles, delete).            |
| **Job Runner**     | Has permissions to execute background jobs, tasks, or processes.            |
| **Inactive**       | Account is disabled; user cannot log in or perform any operations.          |

### Role management guidelines

- Only users with **Admin** or **User Admin** roles can:
  - Add or remove users
  - Assign roles
  - Change role assignments
- Role combinations determine access levels (e.g., **Admin + Job Runner** for full system control)
- Default role for research users should be **Viewer**.

:::note

- Roles are cumulative; a user with multiple roles inherits all corresponding permissions.
- Inactive users cannot perform any operations or access the system.

:::
---

## Best practices

- Use unique, descriptive usernames.
- Assign **least privilege** roles to prevent accidental misuse.
- Review and clean up inactive or outdated user accounts regularly.
- Log user activities for auditing (if system supports it).
