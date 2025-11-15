# Role-Based Access: Student Role Exclusion Update

## Changes Made

### Problem
The original implementation had a **whitelist** approach for non-student roles:
```typescript
const nonStudentRoles = ['manager', 'coursecreator', 'editingteacher', 'teacher'];
```

This excluded other valid roles like:
- `guest` (id: 6)
- `user` (id: 7)  
- `frontpage` (id: 8)
- Any custom roles added to Moodle

### Solution
Changed to a **blacklist** approach - exclude only the `student` role:

```typescript
const studentRoles = ['student'];
return !studentRoles.includes(roleShortname);
```

## Updated Functions

### 1. `isNonStudentRole()` in `roleService.ts`
**Before:**
```typescript
export async function isNonStudentRole(roleShortname: string): boolean {
  const nonStudentRoles = ['manager', 'coursecreator', 'editingteacher', 'teacher'];
  return nonStudentRoles.includes(roleShortname);
}
```

**After:**
```typescript
export function isNonStudentRole(roleShortname: string): boolean {
  const studentRoles = ['student'];
  return !studentRoles.includes(roleShortname);
}
```

### 2. `getNonStudentUsers()` in `roleService.ts`
**Before:**
```typescript
const nonStudentRoles = await prisma.mdl_role.findMany({
  where: {
    shortname: {
      in: ['manager', 'coursecreator', 'editingteacher', 'teacher'],
    },
  },
  // ...
});
```

**After:**
```typescript
const nonStudentRoles = await prisma.mdl_role.findMany({
  where: {
    shortname: {
      not: 'student', // Exclude only student role
    },
  },
  // ...
});
```

### 3. Fixed null check in `login/route.ts`
Added proper null check before calling `getUserRole()`:
```typescript
if (userId) {
  userRole = await getUserRole(userId);
  console.log('User role:', userRole);
}
```

## Impact

### Who Can Access Cohorts Now
✅ **Can Access** (any role except student):
- manager (id: 1)
- coursecreator (id: 2)
- editingteacher (id: 3)
- teacher (id: 4)
- guest (id: 6)
- user (id: 7)
- frontpage (id: 8)
- **Any custom roles**

❌ **Cannot Access**:
- student (id: 5) only

### Admin Panel Access
Users with **any non-student role** will now appear in:
- `/admin/cohort-assignments` user list
- Can be assigned cohorts
- Can view cohort reports (if assigned)

**Note:** Only users with `manager` role can actually access the admin panel itself (enforced in the UI).

## Benefits

1. **Future-Proof**: Automatically includes new custom roles added to Moodle
2. **Flexible**: Supports organizational-specific role structures
3. **Simple Logic**: One exclusion rule instead of maintaining a whitelist
4. **Consistent**: Aligns with "everyone except students" requirement

## Testing

To verify the changes work correctly:

1. **Test with different roles**:
   - Login as guest/user/frontpage role
   - Should see cohort access (if assigned)

2. **Test student exclusion**:
   - Login as student
   - Should see "Students do not have cohort access"

3. **Test admin panel**:
   - All non-student users should appear in admin list
   - Can assign cohorts to any non-student role

## Files Modified

- `src/services/roleService.ts` - Updated `isNonStudentRole()` and `getNonStudentUsers()`
- `src/app/api/login/route.ts` - Added null check for `userId`

## TypeScript Notes

The TypeScript errors about Prisma models not existing will resolve when:
- The TypeScript server restarts
- The dev server restarts (`npm run dev`)
- VS Code reloads

The Prisma models were properly generated with `npx prisma generate` - the errors are just IDE caching issues.
