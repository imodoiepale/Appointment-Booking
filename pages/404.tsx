import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Custom404() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center">
      <div className="space-y-3">
        <h1 className="text-6xl font-bold">404</h1>
        <h2 className="text-2xl font-medium">Page Not Found</h2>
        <p className="text-muted-foreground">
          We couldn't find the page you were looking for.
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
