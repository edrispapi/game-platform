import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { useEffect } from 'react';
import { ErrorPage } from '@/pages/ErrorPage';

export function RouteErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    // Reporting disabled (endpoint unavailable)
  }, [error]);

  // Render error UI using shared modern ErrorPage component
  if (isRouteErrorResponse(error)) {
    const statusCode = error.status;
    const title = `${error.status} ${error.statusText}`;
    return (
      <ErrorPage
        title={title}
        message="Sorry, an error occurred while loading this page."
        statusCode={statusCode}
      />
    );
  }

  return (
    <ErrorPage
      title="Unexpected Error"
      message="An unexpected error occurred while loading this page."
    />
  );
}