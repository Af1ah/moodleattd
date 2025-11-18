import { dirname } from "path";
import { fileURLToPath } from "url";

















































































//echo ""echo "   npm run build && npm start"echo "🚀 To test production build:"echo ""echo "   - Production: Automatically removed (except console.error)"echo "   - Development: All logs are visible"echo "💡 Recommendation:"echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"echo ""fi  echo "thanks to the next.config.ts configuration."  echo "Note: These will be automatically removed in production builds"  echo ""  echo "⚠️  Total potential security issues: $SECURITY_ISSUES"else  echo "✅ No obvious security issues found in console statements"if [ $SECURITY_ISSUES -eq 0 ]; thenecho ""fi  SECURITY_ISSUES=$((SECURITY_ISSUES + USERID_LOGS))  echo "⚠️  Found $USERID_LOGS console statements that may expose user IDs"if [ $USERID_LOGS -gt 0 ]; thenUSERID_LOGS=$(grep -r "console\..*(.*user.*[Ii]d" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)# Check for user ID exposurefi  SECURITY_ISSUES=$((SECURITY_ISSUES + EMAIL_LOGS))  echo "⚠️  Found $EMAIL_LOGS console statements that may expose emails"if [ $EMAIL_LOGS -gt 0 ]; thenEMAIL_LOGS=$(grep -r "console\..*(.*email" src/ --include="*.ts" --include="*.tsx" -i 2>/dev/null | wc -l)# Check for email exposurefi  SECURITY_ISSUES=$((SECURITY_ISSUES + PASSWORD_LOGS))  echo "⚠️  Found $PASSWORD_LOGS console statements that may expose passwords"if [ $PASSWORD_LOGS -gt 0 ]; thenPASSWORD_LOGS=$(grep -r "console\..*(.*password" src/ --include="*.ts" --include="*.tsx" -i 2>/dev/null | wc -l)# Check for password exposurefi  SECURITY_ISSUES=$((SECURITY_ISSUES + TOKEN_LOGS))  echo "⚠️  Found $TOKEN_LOGS console statements that may expose tokens"if [ $TOKEN_LOGS -gt 0 ]; thenTOKEN_LOGS=$(grep -r "console\..*(.*token" src/ --include="*.ts" --include="*.tsx" -i 2>/dev/null | wc -l)# Check for token exposureSECURITY_ISSUES=0echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"echo "🔒 Checking for potential security issues..."# Check for potential security issuesecho ""echo "console.debug: $DEBUGS (will be removed in production)"echo "console.info:  $INFOS  (will be removed in production)"echo "console.error: $ERRORS (kept in production)"echo "console.warn:  $WARNS  (will be removed in production)"echo "console.log:   $LOGS   (will be removed in production)"echo "Total:         $TOTAL"echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"echo "📊 Console Statement Summary:"DEBUGS=$(grep -r "console\.debug" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)INFOS=$(grep -r "console\.info" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)ERRORS=$(grep -r "console\.error" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)WARNS=$(grep -r "console\.warn" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)LOGS=$(grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)# Count by typeTOTAL=$(grep -r "console\." src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l)# Count total console statementsecho ""echo "🔍 Scanning for console statements in codebase..."# Usage: ./scripts/audit-console-logs.sh# Console Log Security Audit Scriptimport { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Warn about console statements (will be removed in production anyway)
      "no-console": [
        "warn",
        {
          allow: ["error"] // Allow console.error for critical issues
        }
      ]
    }
  }
];

export default eslintConfig;
