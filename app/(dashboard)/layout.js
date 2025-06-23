import { auth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const { userId } = auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
