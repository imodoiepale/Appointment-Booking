// @ts-nocheck
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function CustomError({ statusCode }: { statusCode: number }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center">
      <div className="space-y-3">
        <h1 className="text-6xl font-bold">{statusCode || 'Error'}</h1>
        <h2 className="text-2xl font-medium">
          {statusCode === 404 ? 'Page Not Found' : 'Something went wrong'}
        </h2>
        <p className="text-muted-foreground">
          {statusCode === 404
            ? "We couldn't find the page you were looking for."
            : "An unexpected error occurred. Please try again."}
        </p>
      </div>
      <Button asChild>
        <Link href="/">
          Go Home
        </Link>
      </Button>
    </div>
  );
}

CustomError.getInitialProps = ({ res, err }: { res: any; err: any }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default CustomError;
