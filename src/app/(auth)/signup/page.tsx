'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type UserCategory = 'RESIDENTIAL' | 'COMMERCIAL' | 'BUSINESS' | 'DEVELOPER';

const categories: { value: UserCategory; label: string; description: string }[] = [
  { value: 'RESIDENTIAL', label: 'Residential', description: 'Homeowner or tenant' },
  { value: 'COMMERCIAL', label: 'Commercial', description: 'Commercial property owner' },
  { value: 'BUSINESS', label: 'Business', description: 'Business renting space' },
  { value: 'DEVELOPER', label: 'Developer', description: 'Property development' },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'category' | 'details'>('category');
  const [category, setCategory] = useState<UserCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed');

      // Create user profile in database
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authData.user.id,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || null,
          category,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create profile');
      }

      // Redirect to dashboard (email confirmation optional for MVP)
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'category') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>What best describes you?</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setCategory(cat.value);
                setStep('details');
              }}
              className={`p-4 rounded-lg border-2 text-left transition-colors hover:border-blue-500 ${
                category === cat.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="font-medium">{cat.label}</div>
              <div className="text-sm text-gray-500">{cat.description}</div>
            </button>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Signing up as {categories.find((c) => c.value === category)?.label}
          <button onClick={() => setStep('category')} className="text-blue-600 ml-2">
            Change
          </button>
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
