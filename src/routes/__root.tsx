import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

export const Route = createRootRoute({
  component: () => (
    <div className="w-72 font-sans text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2">
        <img src="/logo.png" alt="Transcribe To Vault" className="h-5 w-5" />
        <span className="text-xs font-semibold text-gray-700">
          Transcribe To Vault
        </span>
      </div>

      {/* Nav tabs */}
      <nav className="flex border-b border-gray-200">
        <Link
          to="/"
          className="flex-1 py-2 text-center text-xs font-medium text-gray-500 hover:text-gray-900"
          activeProps={{
            className:
              'flex-1 py-2 text-center text-xs font-medium text-amber-700 border-b-2 border-amber-700',
          }}
          activeOptions={{ exact: true }}
        >
          Notes
        </Link>
        <Link
          to="/settings"
          className="flex-1 py-2 text-center text-xs font-medium text-gray-500 hover:text-gray-900"
          activeProps={{
            className:
              'flex-1 py-2 text-center text-xs font-medium text-amber-700 border-b-2 border-amber-700',
          }}
        >
          Settings
        </Link>
      </nav>

      <Outlet />
      <TanStackRouterDevtools />
    </div>
  ),
});
