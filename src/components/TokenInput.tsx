'use client';

interface TokenInputProps {
  token: string;
  onTokenChange: (token: string) => void;
  onSave: () => void;
}

export default function TokenInput({
  token,
  onTokenChange,
  onSave,
}: TokenInputProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="token-input"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Moodle Web Service Token
      </label>
      <div className="flex gap-2">
        <input
          id="token-input"
          type="text"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          placeholder="Enter your Moodle wstoken"
          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
        />
        <button
          onClick={onSave}
          disabled={!token.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed transition-colors"
        >
          Save
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Your token is stored locally in your browser
      </p>
    </div>
  );
}
