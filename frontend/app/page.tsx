'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check for stored auth token
    const token = localStorage.getItem('tv_token');
    const user = localStorage.getItem('tv_user');

    if (token && user) {
      const parsed = JSON.parse(user);
      if (parsed.role === 'ADMIN') {
        router.replace('/admin');
      } else {
        router.replace('/employee');
      }
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
          <span className="text-white font-bold text-xl">T</span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
